import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-lite.js";

const firebaseConfig={apiKey:"AIzaSyAEKgoKFt5kBOL1GeZdHjwwXb7vnrSXwgY",authDomain:"roya-dashboard-6311c.firebaseapp.com",projectId:"roya-dashboard-6311c",storageBucket:"roya-dashboard-6311c.firebasestorage.app",messagingSenderId:"923403421168",appId:"1:923403421168:web:a7258f56476a646a598935",measurementId:"G-BWWXWQ3J4F"};
const app=initializeApp(firebaseConfig),db=getFirestore(app);
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
window.RoyaFirebase={db,saveState:()=>saveData(true),collectionNames:[...COLLECTIONS],schemaVersion:DATA_VERSION};
(async()=>{try{await loadData();ready=true;document.querySelector('.app-shell')?.classList.add('firebase-ready');setInterval(()=>{if(!window.RoyaApp?.serializeState)return;const sig=fingerprint(window.RoyaApp.serializeState());if(sig!==lastSaved)saveData()},1500);}catch(err){console.error("Roya Firebase initialization failed:",err);}})();
