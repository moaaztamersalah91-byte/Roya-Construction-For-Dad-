import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-lite.js";

const firebaseConfig={apiKey:"AIzaSyAEKgoKFt5kBOL1GeZdHjwwXb7vnrSXwgY",authDomain:"roya-dashboard-6311c.firebaseapp.com",projectId:"roya-dashboard-6311c",storageBucket:"roya-dashboard-6311c.firebasestorage.app",messagingSenderId:"923403421168",appId:"1:923403421168:web:a7258f56476a646a598935",measurementId:"G-BWWXWQ3J4F"};
const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app),googleProvider=new GoogleAuthProvider();
const LEGACY_REF=doc(db,"royaData","main"), DATA_VERSION=6;
const COLLECTIONS=["projects","expenses","materials","workers","payments","ledger","extracts","team","teamArchive","quotes","workItems","suppliers","inventory","dues","deleted","activities","alerts"];
const STATE_KEY={workItems:"workitems"};
const stateKey=name=>STATE_KEY[name]||name;
const collectionKey=key=>Object.entries(STATE_KEY).find(([,v])=>v===key)?.[0]||key;
let ready=false,syncing=false,lastSaved="";
// Cache the document IDs discovered during the last read. Save operations use this cache
// instead of calling getDocs() on every write, which avoids unnecessary Firestore watch
// target churn and the BloomFilterError seen during edits/adds.
const knownDocIds=Object.fromEntries(COLLECTIONS.map(name=>[name,new Set()]));
const fingerprint=v=>JSON.stringify(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const isArrayRow=v=>Array.isArray(v);

// Every Firestore collection now contains ONE DOCUMENT PER ITEM.
// Object records use their existing id when available; array records receive a hidden
// __docId so the UI can keep its existing array shape without changing rendering code.
function safeDocId(value){
  return String(value||'').replace(/\//g,'_').replace(/[\u0000-\u001F]/g,'').trim().slice(0,150);
}
function ensureDocId(item,name,index){
  if(item&&typeof item==='object'){
    if(item.id) return safeDocId(item.id);
    if(item.__docId) return safeDocId(item.__docId);
    const id=`${name}-${Date.now()}-${index}-${Math.random().toString(36).slice(2,8)}`;
    try{Object.defineProperty(item,'__docId',{value:id,writable:true,configurable:true,enumerable:false});}catch(e){item.__docId=id;}
    return id;
  }
  return safeDocId(`${name}-${Date.now()}-${index}-${Math.random().toString(36).slice(2,8)}`);
}
function itemToDoc(item,name,index){
  const id=ensureDocId(item,name,index);
  if(isArrayRow(item)) return {id, value:clone(item), kind:'array', schemaVersion:DATA_VERSION, updatedAt:serverTimestamp()};
  const data=clone(item||{}); delete data.__docId;
  return {...data, id:data.id||id, schemaVersion:DATA_VERSION, updatedAt:serverTimestamp()};
}
function docToItem(snap){
  const data=snap.data()||{};
  if(data.kind==='array' && Array.isArray(data.value)){
    const row=clone(data.value);
    try{Object.defineProperty(row,'__docId',{value:snap.id,writable:true,configurable:true,enumerable:false});}catch(e){row.__docId=snap.id;}
    return row;
  }
  const item={...data};
  delete item.schemaVersion; delete item.updatedAt; delete item.kind;
  if(!item.id) item.id=snap.id;
  try{Object.defineProperty(item,'__docId',{value:snap.id,writable:true,configurable:true,enumerable:false});}catch(e){item.__docId=snap.id;}
  return item;
}
async function readOneCollection(name){
  const ref=collection(db,name);
  const snap=await getDocs(ref);
  const docs=snap.docs.filter(d=>d.id!=="main");
  knownDocIds[name]=new Set(docs.map(d=>d.id));
  if(docs.length) return {items:docs.map(docToItem),hasItems:true,legacy:null};
  const main=snap.docs.find(d=>d.id==="main");
  if(main){
    const raw=main.data()?.itemsJson;
    let legacy=[]; try{const p=typeof raw==='string'?JSON.parse(raw):raw; legacy=Array.isArray(p)?p:[];}catch(e){}
    return {items:legacy,hasItems:false,legacy:main};
  }
  return {items:[],hasItems:false,legacy:null};
}
async function readCollections(){
  const entries=await Promise.all(COLLECTIONS.map(async name=>[name,await readOneCollection(name)]));
  const data=Object.fromEntries(entries.map(([name,r])=>[stateKey(name),r.items]));
  return {data,entries,hasAny:entries.some(([,r])=>r.hasItems||r.legacy)};
}
async function migrateLegacyMain(name,items,mainSnap){
  if(!mainSnap)return;
  await writeOneCollection(name,items);
  await deleteDoc(mainSnap.ref);
}
async function writeOneCollection(name,items){
  const previousIds=knownDocIds[name]||new Set();
  const keep=new Set();
  const list=Array.isArray(items)?items:[];
  for(let i=0;i<list.length;i++){
    const id=ensureDocId(list[i],name,i); keep.add(id);
    await setDoc(doc(db,name,id),itemToDoc(list[i],name,i),{merge:true});
  }
  // Delete only documents we already know about from the last successful read.
  // Do not issue getDocs() during every save.
  await Promise.all([...previousIds].filter(id=>!keep.has(id)&&id!=="main").map(id=>deleteDoc(doc(db,name,id))));
  knownDocIds[name]=keep;
}
async function writeCollections(data){
  await Promise.all(COLLECTIONS.map(name=>writeOneCollection(name,data?.[stateKey(name)])));
}
async function loadData(){
  const current=await readCollections();
  const legacySnap=await getDoc(LEGACY_REF);
  let rootLegacy=null;
  if(legacySnap.exists()){
    const legacyData=legacySnap.data()||{};
    const raw=legacyData.appDataJson;
    try{rootLegacy=typeof raw==='string'?JSON.parse(raw):legacyData.appData;}catch(e){rootLegacy=null;}
    if(!rootLegacy || typeof rootLegacy!=='object') rootLegacy=null;
  }

  if(current.hasAny){
    // Convert old `collection/main` documents first.
    for(const [name,r] of current.entries){
      if(r.legacy) await migrateLegacyMain(name,r.items,r.legacy);
    }

    // If the database was partially migrated, recover missing domains from the old root.
    if(rootLegacy){
      for(const name of COLLECTIONS){
        const key=stateKey(name);
        const existing=current.data[key];
        const legacyItems=rootLegacy[key];
        if((!Array.isArray(existing)||existing.length===0) && Array.isArray(legacyItems) && legacyItems.length){
          current.data[key]=legacyItems;
        }
      }
      await writeCollections(current.data);
      await deleteDoc(LEGACY_REF);
    }

    window.RoyaApp?.restoreState(current.data);
    lastSaved=fingerprint(window.RoyaApp?.serializeState?.()||current.data);
    return;
  }

  if(rootLegacy){
    const data={};
    COLLECTIONS.forEach(name=>{
      const key=stateKey(name);
      data[key]=Array.isArray(rootLegacy[key])?rootLegacy[key]:[];
    });
    await writeCollections(data);
    await deleteDoc(LEGACY_REF);
    window.RoyaApp?.restoreState(data);
    lastSaved=fingerprint(window.RoyaApp?.serializeState?.()||data);
    return;
  }

  const data=window.RoyaApp?.serializeState?.();
  if(!data)throw new Error("RoyaApp is not ready");
  await writeCollections(data);
  lastSaved=fingerprint(data);
}

async function saveData(force=false){
  if(!ready||syncing||!window.RoyaApp?.serializeState)return;
  const data=window.RoyaApp.serializeState(),sig=fingerprint(data); if(!force&&sig===lastSaved)return;
  syncing=true;
  try{await writeCollections(data);lastSaved=sig;}catch(err){console.error("Roya Firebase save failed:",err);window.toast?.("تعذر حفظ البيانات في Firebase");}finally{syncing=false;}
}
window.RoyaFirebase={db,auth,saveState:()=>saveData(true),collectionNames:[...COLLECTIONS],schemaVersion:DATA_VERSION};

// Admin inbox lives inside the existing dashboard page and shares its navigation/layout.
let adminMessagesCache=[], selectedAdminMessage=null;
const msgEsc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function adminMessageDate(value){try{const d=value?.toDate?.();return d?new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(d):'الآن';}catch{return 'الآن';}}
function renderAdminMessages(){
 const box=document.getElementById('adminMessages'); if(!box)return;
 const q=(document.getElementById('adminMessageSearch')?.value||'').trim().toLocaleLowerCase();
 const filter=document.getElementById('adminMessageFilter')?.value||'all';
 const pending=adminMessagesCache.filter(m=>!m.data.adminReply).length;
 document.getElementById('adminMessageTotal').textContent=adminMessagesCache.length;
 document.getElementById('adminMessagePending').textContent=pending;
 document.getElementById('adminMessageAnswered').textContent=adminMessagesCache.length-pending;
 const list=adminMessagesCache.filter(m=>{const d=m.data,hay=[d.name,d.email,d.subject,d.message].join(' ').toLocaleLowerCase();return (!q||hay.includes(q))&&(filter==='all'||(filter==='answered'?!!d.adminReply:!d.adminReply));});
 if(!list.length){box.innerHTML='<div class="empty-state">'+(adminMessagesCache.length?'لا توجد رسائل مطابقة للتصفية.':'لا توجد رسائل مستخدمين حتى الآن.')+'</div>';return;}
 box.innerHTML=list.map(({id,data:d})=>`<button type="button" class="admin-inbox-item ${selectedAdminMessage?.id===id?'selected':''}" data-message-id="${msgEsc(id)}"><div class="admin-inbox-item-top"><span class="message-subject">${msgEsc(d.subject||'رسالة تواصل')}</span><span class="message-state ${d.adminReply?'answered':'pending'}">${d.adminReply?'تم الرد':'بانتظار الرد'}</span></div><strong>${msgEsc(d.name||'مستخدم')}</strong><p>${msgEsc(d.message||'')}</p><div class="admin-inbox-meta"><span>${msgEsc(d.email||'بريد غير متوفر')}</span><time>${msgEsc(adminMessageDate(d.createdAt))}</time></div></button>`).join('');
 box.querySelectorAll('[data-message-id]').forEach(button=>button.addEventListener('click',()=>selectAdminMessage(button.dataset.messageId)));
}
function selectAdminMessage(id){selectedAdminMessage=adminMessagesCache.find(m=>m.id===id)||null;const target=document.getElementById('replyTarget'),preview=document.getElementById('replyMessagePreview'),reply=document.getElementById('adminReply');if(!selectedAdminMessage)return;const d=selectedAdminMessage.data;target.textContent=`${d.name||'مستخدم'} — ${d.email||''} — ${d.subject||'رسالة تواصل'}`;preview.textContent=d.message||'لا يوجد نص للرسالة.';reply.value=d.adminReply||'';document.getElementById('adminReplyFeedback').textContent='';renderAdminMessages();}
async function loadDashboardMessages(){const box=document.getElementById('adminMessages');if(!box)return;const status=document.getElementById('adminInboxStatus');const user=auth.currentUser;if(!user){status.textContent='سجّل الدخول بحساب الأدمن لعرض الرسائل.';box.innerHTML='<div class="empty-state">يلزم تسجيل الدخول كأدمن.</div>';return;}try{const role=await getDoc(doc(db,'admins',user.uid));if(!role.exists()){status.textContent='هذا الحساب ليس أدمن معتمدًا.';box.innerHTML='<div class="empty-state">لا تملك صلاحية الوصول إلى رسائل المستخدمين.</div>';return;}status.textContent=`مسجل الدخول: ${user.email||'الأدمن'}`;const snap=await getDocs(query(collection(db,'contactMessages'),orderBy('createdAt','desc')));adminMessagesCache=snap.docs.map(d=>({id:d.id,data:d.data()}));if(selectedAdminMessage&&!adminMessagesCache.some(m=>m.id===selectedAdminMessage.id))selectedAdminMessage=null;renderAdminMessages();}catch(err){console.error('Could not load dashboard messages',err);status.textContent='تعذر تحميل الرسائل';box.innerHTML=`<div class="empty-state">${msgEsc(err?.message||'حدث خطأ أثناء تحميل الرسائل.')}</div>`;}}
document.getElementById('refreshAdminMessages')?.addEventListener('click',loadDashboardMessages);
document.getElementById('adminMessageSearch')?.addEventListener('input',renderAdminMessages);
document.getElementById('adminMessageFilter')?.addEventListener('change',renderAdminMessages);
document.getElementById('replyForm')?.addEventListener('submit',async event=>{event.preventDefault();const feedback=document.getElementById('adminReplyFeedback');if(!selectedAdminMessage){feedback.textContent='اختر رسالة أولًا من صندوق الرسائل.';return;}const reply=document.getElementById('adminReply').value.trim();if(!reply){feedback.textContent='اكتب الرد قبل الحفظ.';return;}try{const original=selectedAdminMessage;const d=original.data;await addDoc(collection(db,'contactReplies'),{uid:d.uid,email:d.email||'',name:d.name||'',subject:d.subject||'',message:d.message||'',adminReply:reply,createdAt:d.createdAt||serverTimestamp(),repliedAt:serverTimestamp()});await deleteDoc(doc(db,'contactMessages',original.id));selectedAdminMessage=null;document.getElementById('replyTarget').textContent='اختر رسالة من صندوق الوارد.';document.getElementById('adminReply').value='';feedback.textContent='تم حفظ الرد وسيظهر للمستخدم داخل حسابه.';await loadDashboardMessages();}catch(err){feedback.textContent=err?.message||'تعذر حفظ الرد. تحقق من صلاحيات Firestore.';}});

const authScreen=document.getElementById('dashboardAuthScreen'),authMessage=document.getElementById('adminAuthMessage');
const sayAuth=(message,isError=false)=>{if(authMessage){authMessage.textContent=message;authMessage.classList.toggle('error',isError);}};
document.getElementById('adminGoogleLogin')?.addEventListener('click',async()=>{try{await signInWithPopup(auth,googleProvider);}catch(err){sayAuth(authError(err),true);}});
document.getElementById('adminEmailLogin')?.addEventListener('submit',async event=>{event.preventDefault();try{await signInWithEmailAndPassword(auth,document.getElementById('adminEmail').value.trim(),document.getElementById('adminPassword').value);}catch(err){sayAuth(authError(err),true);}});
function authError(err){return ({'auth/invalid-credential':'البريد الإلكتروني أو كلمة المرور غير صحيحة.','auth/popup-closed-by-user':'تم إغلاق نافذة Google قبل اكتمال تسجيل الدخول.','auth/unauthorized-domain':'هذا النطاق غير مضاف إلى Authorized domains في Firebase.','permission-denied':'تعذر التحقق من الصلاحيات في Firestore.'})[err?.code]||err?.message||'تعذر تسجيل الدخول. حاول مرة أخرى.';}
let loading=false;
onAuthStateChanged(auth,async user=>{
  if(!user){ready=false;document.querySelector('.app-shell')?.classList.remove('firebase-ready');authScreen?.classList.add('show');sayAuth('سجّل الدخول بالحساب الذي أُضيف يدويًا إلى مجموعة admins في Firebase.');return;}
  if(loading)return;loading=true;
  try{
    const adminSnap=await getDoc(doc(db,'admins',user.uid));
    if(!adminSnap.exists()){
      ready=false;document.querySelector('.app-shell')?.classList.remove('firebase-ready');authScreen?.classList.add('show');
      sayAuth(`تم تسجيل الدخول كـ ${user.email||'مستخدم'}، لكن الحساب غير معتمد كأدمن بعد. أضف مستند admins/${user.uid} من Firebase Console ثم أعد تحميل الصفحة.`,true);return;
    }
    await loadData();ready=true;authScreen?.classList.remove('show');document.querySelector('.app-shell')?.classList.add('firebase-ready');
    const profile=document.querySelector('.topbar .profile');if(profile){const name=profile.querySelector('strong');const small=profile.querySelector('small');if(name)name.textContent='تامر صلاح';if(small)small.textContent='حساب الإدارة';}
    await loadDashboardMessages();
    setInterval(()=>{if(!window.RoyaApp?.serializeState)return;const sig=fingerprint(window.RoyaApp.serializeState());if(sig!==lastSaved)saveData()},1500);
  }catch(err){console.error('Roya Firebase initialization failed:',err);sayAuth(authError(err),true);}
  finally{loading=false;}
});
