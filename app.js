const state={
 lang:localStorage.getItem('bc-lang')||'ar',dark:localStorage.getItem('bc-theme')==='dark',
 projects:[],
 expenses:[],
 materials:[],
 workers:[],
 payments:[],
 ledger:[],
 extracts:[],
 team:[],teamArchive:[],
 quotes:[],
 workitems:[],
 suppliers:[],
 inventory:[],
 dues:[],
 deleted:[],
 activities:[],
 alerts:[]
};
const money=n=>{const locale=state.lang==='en'?'en-US':'ar-EG'; return new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(Number(n)||0)+(state.lang==='en'?' EGP':' ج.م')};
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const num=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)?n:0};
function sanitizeRichText(html){
  const template=document.createElement('template');
  template.innerHTML=String(html??'');
  const allowed=new Set(['P','BR','DIV','SPAN','H1','H2','H3','H4','STRONG','B','EM','I','U','UL','OL','LI','BLOCKQUOTE','FONT','A']);
  const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_ELEMENT);
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(el=>{
    if(!allowed.has(el.tagName)){el.replaceWith(...Array.from(el.childNodes));return;}
    [...el.attributes].forEach(attr=>{
      const name=attr.name.toLowerCase();
      if(name==='style' || name==='class') { el.removeAttribute(attr.name); return; }
      if(el.tagName==='A' && (name==='href' || name==='target')) return;
      if(el.tagName==='FONT' && name==='color') return;
      el.removeAttribute(attr.name);
    });
    if(el.tagName==='A'){
      const href=el.getAttribute('href')||'';
      if(!/^(https?:|mailto:)/i.test(href)){el.removeAttribute('href');el.removeAttribute('target');}
    }
  });
  return template.innerHTML;
}
function normalizePaymentRow(p){
  if(Array.isArray(p)){
    // V1/V2 stored notes in index 4 and did not persist the reference field.
    const row=[p[0]??'',p[1]??'',num(p[2]),p[3]??'',p.length>5?(p[4]??''):'',p.length>5?(p[5]??''):(p[4]??'')]; if(p.__docId) Object.defineProperty(row,'__docId',{value:p.__docId,writable:true,configurable:true,enumerable:false}); return row;
  }
  if(p && typeof p==='object'){
    return [p.project??'',p.date??'',num(p.amount),p.method??'',p.reference??'',p.notes??''];
  }
  return ['', '', 0, '', '', ''];
}

const toast=(message)=>{const el=document.getElementById('toast');if(!el)return;const text=window.RoyaI18n?.translateString?.(message)||message;el.textContent=text;el.classList.add('show');clearTimeout(window.__royaToastTimer);window.__royaToastTimer=setTimeout(()=>el.classList.remove('show'),2800);};
window.toast=toast;
const norm=s=>String(s??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/ـ/g,'').replace(/[ًٌٍَُِّْ]/g,'').replace(/[أإآ]/g,'ا').trim();
const aliases={شركة:['شركه','company','co','corp','مؤسسة','مؤسسه'],مشروع:['project','شغل','شغلانة','شغلانه','موقع','ورشة','ورشه'],مصروف:['expense','صرف','مصاريف','تكلفة','تكلفه','فلوس'],عامل:['worker','عمال','صنايعي','صنايعية','مقاول'],خامات:['materials','material','مشتريات','توريد','بضاعة','بضاعه'],مدير:['manager','مسؤول','مسئول'],عميل:['client','customer'],مورد:['supplier','vendor'],ربح:['profit','مكسب','كسب'],دفعة:['payment','تحصيل','تحصيلات','فلوس العميل']};
function searchScore(query,text){let q=norm(query),t=norm(text);if(!q)return 0;if(t.includes(q))return 100-Math.min(50,t.indexOf(q));let score=0;for(const [k,arr] of Object.entries(aliases)){if((norm(k)===q||arr.some(x=>norm(x)===q))&&t.includes(norm(k)))score+=80;}let qi=0;for(const ch of q){const ix=t.indexOf(ch,qi);if(ix>=0){score+=3;qi=ix+1}else if(q.length>2)return 0}return score;}
function searchItems(q){if(!q.trim())return [];let items=[];state.projects.forEach(p=>items.push({type:'مشروع',title:p.name,sub:[p.company,p.client,p.manager].filter(Boolean).join(' • '),score:Math.max(searchScore(q,[p.name,p.company,p.client,p.manager,p.address].join(' ')),searchScore(q,'مشروع '+p.name)),action:()=>openProject(p.id)}));state.expenses.forEach(e=>items.push({type:'مصروف',title:e.item,sub:`${e.project} • ${money(e.amount)} • ${e.party}`,score:searchScore(q,[e.item,e.category,e.project,e.party,e.details].join(' ')),action:()=>showDetails(e)}));state.suppliers.forEach(s=>items.push({type:'مورد',title:s.name,sub:`${s.company} • ${s.specialty}`,score:searchScore(q,[s.name,s.company,s.specialty].join(' ')),action:()=>showSupplier(s)}));state.workers.forEach(w=>items.push({type:'عامل',title:w[0],sub:`${w[1]} • ${w[2]}`,score:searchScore(q,w.join(' ')),action:()=>showWorker(w)}));state.materials.forEach(m=>items.push({type:'خامة',title:m[0],sub:`${m[1]} • ${m[2]}`,score:searchScore(q,m.join(' ')),action:()=>showMaterial(m)}));return items.filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,8);}
function applyTheme(){document.body.classList.toggle('dark',state.dark);localStorage.setItem('bc-theme',state.dark?'dark':'light');$('#themeBtn').textContent=state.dark?'☀':'◐'}
function applyLang(){document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==='ar'?'rtl':'ltr';$('#langBtn').textContent=state.lang==='ar'?'EN':'AR';updateTitle()}
const titles={dashboard:['لوحة التحكم','Dashboard'],projects:['المشاريع','Projects'],materials:['الخامات والمشتريات','Materials & Purchases'],workers:['العمالة','Workers'],expenses:['المصروفات','Expenses'],payments:['دفعات العملاء','Client Payments'],extracts:['المستخلصات','Extracts'],reports:['التقارير','Reports'],team:['الفريق والشركاء','Team & Partners'],quotes:['عروض الأسعار والعقود','Quotes & Contracts'],workitems:['بنود الأعمال والكميات','Work Items & Quantities'],suppliers:['الموردون','Suppliers'],inventory:['المخزون','Inventory'],dues:['مستحقات العمال والمقاولين','Labor Payables'],archive:['الأرشيف وسلة المحذوفات','Archive & Trash'],activity:['سجل النشاط والتنبيهات','Activity & Alerts'],settings:['الإعدادات','Settings']};let current='dashboard';
function updateTitle(){const t=titles[current]||titles.dashboard;const el=$('#pageTitle');if(el)el.textContent=state.lang==='ar'?t[0]:t[1]}
function showPage(page){current=titles[page]?page:'dashboard';$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$$('[data-page-view]').forEach(p=>p.classList.toggle('active-page',p.dataset.pageView===page));updateTitle();$('#sidebar').classList.remove('open');$('#overlay').classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});renderAll()}
function statusClass(s){return s==='منتهي'?'done':s==='على وشك البدء'?'start':s==='على وشك الانتهاء'?'ending':'progress'}
function statusText(s){if(state.lang==='ar')return s;return {'قيد التنفيذ':'In progress','منتهي':'Completed','على وشك البدء':'Starting soon','على وشك الانتهاء':'Finishing soon'}[s]||s}
function renderProjects(){let q=$('#projectSearch')?.value||'',filter=$('#statusFilter')?.value||'all',sort=$('#projectSort')?.value||'newest';let list=state.projects.filter(p=>!p.archived&&(filter==='all'||p.status===filter)&&(!q||searchScore(q,[p.name,p.client,p.company,p.manager,p.address].join(' '))>0));if(sort==='value')list.sort((a,b)=>b.value-a.value);else list.sort((a,b)=>b.id.localeCompare(a.id));$('#projectCards').innerHTML=list.map(p=>`<article class="project-card"><div class="project-top"><div class="project-logo">${esc(p.name.charAt(0))}</div><div class="project-main" data-no-translate><h3>${esc(p.name)}</h3><p>${esc(p.company||'بدون شركة')} · ${esc(p.client)}</p></div><b class="badge ${statusClass(p.status)}">${statusText(p.status)}</b></div><div class="company-line"><span>الشركة</span><strong data-no-translate>${esc(p.company||'غير محددة')}</strong><span>مدير الشركة</span><strong data-no-translate>${esc(p.manager||'غير محدد')}</strong></div><div class="project-meta"><div><span>قيمة العقد</span><b data-no-translate>${money(p.value)}</b></div><div><span>مسؤول شراء الخامات</span><b data-no-translate>${esc(p.purchasing)}</b></div></div><div class="progress-row"><span>نسبة الإنجاز</span><b>${p.progress}%</b></div><div class="progress-track"><i style="width:${p.progress}%"></i></div><footer><div class="project-actions"><button class="text-btn" onclick="openProject('${p.id}')">التفاصيل ←</button><button class="edit-btn" onclick="editProject('${p.id}')">تعديل المشروع</button><button class="archive-btn" onclick="archiveProject('${p.id}')">أرشفة</button></div><button class="danger-btn" onclick="deleteProject('${p.id}')">حذف</button></footer></article>`).join('')||`<div class="empty-state">لا توجد مشاريع مطابقة للبحث.</div>`;$('#statProjects').textContent=state.projects.filter(p=>!p.archived&&p.status!=='منتهي').length}
function renderRecent(){let list=state.projects.filter(p=>!p.archived).slice(0,3);$('#recentProjects').innerHTML=list.map(p=>`<div class="mini-project"><div class="project-symbol">${esc(p.name.charAt(0))}</div><div><strong data-no-translate>${esc(p.name)}</strong><small data-no-translate>${esc(p.company||p.client)}</small></div><b class="badge ${statusClass(p.status)}">${statusText(p.status)}</b></div>`).join('')}
function renderMaterials(){
  $('#materialsBody').innerHTML=state.materials.map((m,i)=>`<tr><td>${esc(m[0])}</td><td>${esc(m[1])}</td><td>${esc(m[2])}</td><td>${money(m[3])}</td><td>${money(m[4])}</td><td>${esc(m[5])}</td><td><button class="text-btn" onclick="editModalItem('material',${i})">تعديل</button> <button class="text-btn danger-text" onclick="deleteModalItem('material',${i})">حذف</button></td></tr>`).join('')}
function renderWorkers(){$('#workersGrid').innerHTML=state.workers.map((w,i)=>`<div class="worker-card"><div class="worker-avatar">${esc(w[0].split(' ').map(x=>x[0]).join('').slice(0,2))}</div><div><strong>${esc(w[0])}</strong><span>${esc(w[1])}</span></div><b>${esc(w[2])}</b><small>${esc(w[3])}</small><div class="card-actions"><button class="secondary" onclick="editModalItem('worker',${i})">تعديل</button><button class="danger" onclick="deleteModalItem('worker',${i})">حذف</button></div></div>`).join('')}
function renderExpenses(){let total=state.expenses.reduce((a,e)=>a+e.amount,0),counts={};state.expenses.forEach(e=>counts[e.category]=(counts[e.category]||0)+e.amount);let top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];$('#expenseCount').textContent=state.expenses.length;$('#expenseTotal').textContent=money(total);$('#topExpense').textContent=top?top[0]:'—';$('#expensesBody').innerHTML=state.expenses.map((e,i)=>`<tr><td>${e.date}</td><td><strong>${esc(e.item)}</strong></td><td><span class="tag">${esc(e.category)}</span></td><td>${esc(e.project)}</td><td><strong>${money(e.amount)}</strong></td><td>${esc(e.party)}</td><td>${esc(e.method)}</td><td><button class="text-btn" onclick="editModalItem('expense',${i})">تعديل</button> <button class="text-btn danger-text" onclick="deleteModalItem('expense',${i})">حذف</button> <button class="text-btn" onclick='showDetails(${JSON.stringify(e).replace(/'/g,"&#39;")})'>التفاصيل</button></td></tr>`).join('')}
function renderPayments(){$('#paymentsBody').innerHTML=state.payments.map((p,i)=>`<tr data-no-translate><td>${esc(p[0])}</td><td>${esc(p[1])}</td><td><strong>${money(p[2])}</strong></td><td>${esc(p[3])}</td><td>${esc(p[4]||'—')}</td><td>${esc(p[5]||'—')}</td><td><button class="text-btn" onclick="editModalItem('payment',${i})">تعديل</button> <button class="text-btn danger-text" onclick="deleteModalItem('payment',${i})">حذف</button></td></tr>`).join('')}
function renderTeam(){
  const grid=$('#teamGrid'), archive=$('#teamArchiveList'), count=$('#teamArchiveCount'), activeCount=$('#teamActiveCount');
  if(!grid)return;
  const roleLabel=r=>r==='شريك'?'شريك':'موظف';
  grid.innerHTML=state.team.map((t,i)=>{
    const disabled=Boolean(t[4]);
    const initials=esc(String(t[0]||'?').trim().charAt(0));
    return `<article class="team-card team-member-card ${disabled?'is-disabled':''}" data-no-translate>
      <div class="team-avatar">${initials}</div>
      <div class="team-member-info">
        <strong>${esc(t[0])}</strong>
        <span>${esc(t[1])}</span>
        <small>${esc(t[3]||'')}</small>
      </div>
      <span class="role-badge">${roleLabel(t[1])} · ${disabled?'معطل':'نشط'}</span>
      <div class="team-member-permissions"><b>${esc(t[2]||'')}</b></div>
      <div class="team-member-actions">
        <button class="secondary team-action" type="button" onclick="editTeamMember(${i})">تعديل</button>
        <button class="secondary team-action" type="button" onclick="toggleTeamMember(${i})">${disabled?'تفعيل':'تعطيل'}</button>
        <button class="danger team-action" type="button" onclick="deleteTeamMember(${i})">حذف</button>
      </div>
    </article>`;
  }).join('') || '<div class="empty-state">لا يوجد أعضاء نشطون.</div>';

  if(count)count.textContent=state.teamArchive.length;
  if(activeCount)activeCount.textContent=state.team.length;
  if(archive)archive.innerHTML=state.teamArchive.map((t,i)=>`
    <div class="activity-row archive-person-row" data-no-translate>
      <div><strong>${esc(t[0])}</strong><span>${esc(t[1])} • ${esc(t[3]||'')}</span></div>
      <small>محذوف من الفريق</small>
      <button class="text-btn" type="button" onclick="restoreTeamMember(${i})">استعادة</button>
    </div>
  `).join('') || '<div class="empty-state">الأرشيف فارغ.</div>';
}
function renderFinancial(){let contracts=state.ledger.reduce((a,x)=>a+x.value,0),cost=state.ledger.reduce((a,x)=>a+x.cost,0),received=state.payments.reduce((a,x)=>a+x[2],0),profit=state.ledger.reduce((a,x)=>a+x.profit,0);['statContracts','finContracts','repContracts'].forEach(id=>{let el=$('#'+id);if(el)el.textContent=money(contracts)});['statCosts','finCosts','repCosts'].forEach(id=>{let el=$('#'+id);if(el)el.textContent=money(cost)});['statProfit','finProfit','repProfit'].forEach(id=>{let el=$('#'+id);if(el)el.textContent=money(profit)});['finReceived','repReceived'].forEach(id=>{let el=$('#'+id);if(el)el.textContent=money(received)});$('#ledgerBody').innerHTML=state.ledger.map(x=>`<div class="ledger-row"><div><strong>${esc(x.project)}</strong><small>${state.projects.some(p=>p.id===x.projectId)?'المشروع ما زال موجودًا':'السجل المالي محفوظ مستقلًا عن المشروع'}</small></div><span>${money(x.value)}</span><span>${money(x.cost)}</span><strong class="profit">${money(x.profit)}</strong></div>`).join('');renderCommandCenter(contracts,cost,received,profit)}
function renderCommandCenter(contracts,cost,received,profit){let overdue=state.projects.filter(p=>p.status==='على وشك الانتهاء').length;$('#commandCenter').innerHTML=`<div class="command-card"><span>صافي الوضع الحالي</span><strong>${money(received-cost)}</strong><small>المحصّل − التكاليف</small></div><div class="command-card"><span>مستحق من العملاء</span><strong>${money(Math.max(0,contracts-received))}</strong><small>قابل للتحصيل</small></div><div class="command-card"><span>مشاريع تحتاج متابعة</span><strong>${overdue}</strong><small>قريبة من التسليم</small></div><div class="command-card"><span>مخزون منخفض</span><strong>${state.inventory.filter(x=>x.qty<x.min).length}</strong><small>يحتاج إعادة طلب</small></div>`}
function syncInventoryAlerts(){
  const byId=new Map(state.inventory.map((item,index)=>[String(item.id||item.name||index),item]));
  const generated=[];
  state.inventory.forEach((item,index)=>{
    const qty=Number(item.qty)||0;
    const min=Number(item.min)||0;
    if(qty<=min){
      const id=`inventory-${item.id||norm(item.name)||index}`;
      const out=qty<=0;
      generated.push({id,type:'inventory',itemId:String(item.id||item.name||index),title:out?'نفاد المخزون':'مخزون منخفض',message:out?`انتهت كمية ${item.name||'الخامة'}.`:`كمية ${item.name||'الخامة'} وصلت إلى الحد الأدنى (${min} ${item.unit||''}).`,severity:out?'critical':'warning'});
    }
  });
  state.alerts=generated;
}
function renderAdvanced(){
  syncInventoryAlerts();
 $('#quotesGrid').innerHTML=state.quotes.map((q,i)=>`<article class="feature-card"><div class="feature-icon">◈</div><div><span class="tag">${esc(q.status)}</span><h3>${esc(q.title)}</h3><p>${esc(q.company)} · ${esc(q.client)}</p></div><strong>${money(q.value)}</strong><small>${q.date}</small><div class="card-actions"><button class="secondary" onclick="editModalItem('quote',${i})">تعديل</button><button class="danger" onclick="deleteModalItem('quote',${i})">حذف</button></div></article>`).join('');
 $('#workitemsBody').innerHTML=state.workitems.map((w,i)=>`<tr><td><strong>${esc(w[0])}</strong></td><td>${esc(w[1])}</td><td>${w[2]}</td><td>${w[3]}</td><td>${w[4]}</td><td>${esc(w[5])}</td><td>${money(w[6])}</td><td>${money(w[7])}</td><td><button class="text-btn" onclick="editModalItem('workitem',${i})">تعديل</button> <button class="text-btn danger-text" onclick="deleteModalItem('workitem',${i})">حذف</button></td></tr>`).join('');
 $('#suppliersGrid').innerHTML=state.suppliers.map((s,i)=>`<article class="feature-card"><div class="feature-icon">♜</div><div><h3>${esc(s.name)}</h3><p>${esc(s.company)}</p><small>${esc(s.specialty)} · ${esc(s.phone)}</small></div><strong>متبقي ${money(s.balance)}</strong><div class="card-actions"><button class="secondary" onclick="editModalItem('supplier',${i})">تعديل</button><button class="danger" onclick="deleteModalItem('supplier',${i})">حذف</button></div></article>`).join('');
 $('#inventoryGrid').innerHTML=state.inventory.map((item,i)=>`<article class="inventory-card ${item.qty<item.min?'low':''}"><div><span class="tag">${item.qty<item.min?'يحتاج إعادة طلب':'متوفر'}</span><h3>${esc(item.name)}</h3><p>${esc(item.location)}</p></div><strong>${item.qty} ${esc(item.unit)}</strong><small>الحد الأدنى: ${item.min} ${esc(item.unit)}</small><div class="card-actions"><button class="secondary" onclick="editModalItem('stock',${i})">تعديل</button><button class="danger" onclick="deleteModalItem('stock',${i})">حذف</button></div></article>`).join('') || '<div class="empty-state">لا يوجد مخزون.</div>';
 $('#duesBody').innerHTML=state.dues.map((d,i)=>`<tr><td><strong>${esc(d.name)}</strong></td><td>${esc(d.project)}</td><td>${esc(d.method)}</td><td>${money(d.due)}</td><td>${money(d.paid)}</td><td><strong>${money(Math.max(0,d.due-d.paid))}</strong></td><td>${d.last}</td><td><button class="text-btn" onclick="editModalItem('due',${i})">تعديل</button> <button class="text-btn danger-text" onclick="deleteModalItem('due',${i})">حذف</button></td></tr>`).join('');
 $('#archiveList').innerHTML=state.projects.filter(p=>p.archived).map(p=>`<div class="activity-row"><strong>${esc(p.name)}</strong><span>${esc(p.company||p.client)}</span><button class="text-btn" onclick="restoreProject('${p.id}')">استعادة</button></div>`).join('')||'<div class="empty-state">لا يوجد أرشيف.</div>';
 $('#trashList').innerHTML=state.deleted.map((item,index)=>`<div class="activity-row"><div><strong>${esc(item.name)}</strong><span>${esc(item.company||item.type||'')}</span></div><small>${item.deletedAt}</small><button class="text-btn danger-text" type="button" onclick="permanentlyDeleteTrash(${index})">حذف نهائي</button></div>`).join('')||'<div class="empty-state">سلة المحذوفات فارغة.</div>';
 $('#activityList').innerHTML=state.activities.map((a,index)=>`<div class="activity-row"><div><strong>${esc(a[0])}</strong><span>${esc(a[1])}</span></div><small>${esc(a[2])}</small><button class="text-btn danger-text" type="button" onclick="deleteActivityItem(${index})">حذف</button></div>`).join('')||'<div class="empty-state">لا يوجد نشاط.</div>';
 $('#alertsList').innerHTML=state.alerts.map(a=>`<div class="activity-row"><div><strong>${esc(a.title||'تنبيه')}</strong><span>${esc(a.message||'')}</span></div></div>`).join('')||'<div class="empty-state">لا توجد تنبيهات.</div>';
}
function renderAll(){renderProjects();renderRecent();renderMaterials();renderWorkers();renderExpenses();renderPayments();renderTeam();renderFinancial();renderAdvanced();renderExtracts();}
function openProject(id){let p=state.projects.find(x=>x.id===id);if(!p)return;openCustom(`<h3>${esc(p.name)}</h3><p class="modal-sub">تفاصيل المشروع الكاملة • ${esc(p.company||'بدون شركة')}</p><div class="detail-grid"><div><span>العميل</span><strong>${esc(p.client)}</strong></div><div><span>الشركة</span><strong>${esc(p.company||'غير محددة')}</strong></div><div><span>مدير الشركة</span><strong>${esc(p.manager||'غير محدد')}</strong></div><div><span>العنوان</span><strong>${esc(p.address||'غير محدد')}</strong></div><div><span>قيمة العقد</span><strong>${money(p.value)}</strong></div><div><span>مسؤول المشتريات</span><strong>${esc(p.purchasing||'غير محدد')}</strong></div><div><span>البداية</span><strong>${p.start||'غير محدد'}</strong></div><div><span>التسليم المتوقع</span><strong>${p.delivery||'غير محدد'}</strong></div></div><div class="detail-note"><span>وصف المشروع</span><p>${esc(p.description||'لا يوجد وصف مضاف.')}</p></div><div class="status-editor"><label>حالة المشروع<select id="detailStatus"><option ${p.status==='قيد التنفيذ'?'selected':''}>قيد التنفيذ</option><option ${p.status==='منتهي'?'selected':''}>منتهي</option><option ${p.status==='على وشك البدء'?'selected':''}>على وشك البدء</option><option ${p.status==='على وشك الانتهاء'?'selected':''}>على وشك الانتهاء</option></select></label><label>نسبة الإنجاز<input id="detailProgress" type="number" min="0" max="100" value="${p.progress}"></label></div><div class="form-actions"><button class="secondary" onclick="closeModal()">إغلاق</button><button class="secondary" onclick="editProject('${id}')">تعديل المشروع</button><button class="primary" onclick="saveProjectStatus('${id}')">حفظ التحديث</button></div>`)}
function editProject(id){let p=state.projects.find(x=>x.id===id);if(!p)return;openCustom(`<h3>تعديل المشروع</h3><p class="modal-sub">كل البيانات قابلة للتعديل، ومدير الشركة اختياري.</p>${projectForm(p,id)}`)}
function projectForm(p={},id='new'){return `<div class="form-grid"><label>اسم المشروع<input id="fName" value="${esc(p.name||'')}" type="text"></label><label>اسم العميل<input id="fClient" value="${esc(p.client||'')}" type="text"></label><label>اسم الشركة<input id="fCompany" value="${esc(p.company||'')}" type="text"></label><label>اسم مدير الشركة <small>(اختياري)</small><input id="fManager" value="${esc(p.manager||'')}" type="text"></label><label>رقم الهاتف<input id="fPhone" value="${esc(p.phone||'')}" type="tel"></label><label>عنوان المشروع<input id="fAddress" value="${esc(p.address||'')}" type="text"></label><label>قيمة العقد<input id="fValue" value="${p.value||0}" type="number" min="0"></label><label>تاريخ البداية<input id="fStart" value="${p.start||''}" type="date"></label><label>موعد التسليم المتوقع<input id="fDelivery" value="${p.delivery||''}" type="date"></label><label>مسؤول شراء الخامات<input id="fPurchasing" value="${esc(p.purchasing||'')}" type="text"></label><label>حالة المشروع<select id="fStatus"><option ${p.status==='قيد التنفيذ'?'selected':''}>قيد التنفيذ</option><option ${p.status==='منتهي'?'selected':''}>منتهي</option><option ${p.status==='على وشك البدء'?'selected':''}>على وشك البدء</option><option ${p.status==='على وشك الانتهاء'?'selected':''}>على وشك الانتهاء</option></select></label><label>نسبة الإنجاز<input id="fProgress" value="${p.progress||0}" type="number" min="0" max="100"></label><label class="full">وصف المشروع<textarea id="fDescription">${esc(p.description||'')}</textarea></label></div><div class="form-actions"><button class="secondary" onclick="closeModal()">إلغاء</button><button class="primary" onclick="saveProjectForm('${id}')">${id==='new'?'إنشاء المشروع':'حفظ تعديلات المشروع'}</button></div>`}
function projectDuplicateKey(data){
  return [data.name,data.client,data.company,data.manager,data.phone,data.address,data.value,data.start,data.delivery,data.purchasing,data.status,data.progress,data.description].map(v=>norm(v)).join('|');
}
function saveProjectForm(id){
  const value=Math.max(0,Number($('#fValue')?.value)||0);
  const progress=Math.max(0,Math.min(100,Number($('#fProgress')?.value)||0));
  const data={name:$('#fName')?.value.trim()||'',client:$('#fClient')?.value.trim()||'',company:$('#fCompany')?.value.trim()||'',manager:$('#fManager')?.value.trim()||'',phone:$('#fPhone')?.value.trim()||'',address:$('#fAddress')?.value.trim()||'',value,start:$('#fStart')?.value||'',delivery:$('#fDelivery')?.value||'',purchasing:$('#fPurchasing')?.value.trim()||'',status:$('#fStatus')?.value||'قيد التنفيذ',progress,description:$('#fDescription')?.value.trim()||'',archived:false};
  if(!data.name||!data.client){toast('اكتب اسم المشروع واسم العميل أولًا');return false;}
  if(id==='new'){
    const key=projectDuplicateKey(data);
    const duplicate=state.projects.some(p=>!p.archived&&projectDuplicateKey(p)===key);
    if(duplicate){toast('هذا المشروع موجود بالفعل بنفس البيانات');return false;}
    const nid='p'+Date.now();
    state.projects.unshift({id:nid,...data});
    state.ledger.unshift({projectId:nid,project:data.name,value,cost:0,profit:value});
    state.activities.unshift(['تامر صلاح','تم إنشاء مشروع '+data.name,'الآن']);
  }else{
    const p=state.projects.find(x=>x.id===id);
    if(!p)return false;
    const key=projectDuplicateKey(data);
    const duplicate=state.projects.some(x=>x.id!==id&&!x.archived&&projectDuplicateKey(x)===key);
    if(duplicate){toast('يوجد مشروع آخر بنفس البيانات بالفعل');return false;}
    Object.assign(p,data);
    const ledger=state.ledger.find(x=>x.projectId===id);
    if(ledger){ledger.project=p.name;ledger.value=value;ledger.profit=Math.max(0,value-ledger.cost)}
    state.activities.unshift(['تامر صلاح','تم تعديل بيانات '+data.name,'الآن']);
  }
  closeModal();
  renderAll();
  toast(id==='new'?'تم إنشاء المشروع بنجاح':'تم حفظ تعديلات المشروع بنجاح');
  return true;
}
function saveProjectStatus(id){let p=state.projects.find(x=>x.id===id);if(!p)return false;p.status=$('#detailStatus').value;p.progress=Math.max(0,Math.min(100,Number($('#detailProgress').value)||0));state.activities.unshift(['تامر صلاح',`تم تحديث حالة ${p.name} إلى ${p.status}`,'الآن']);closeModal();renderAll();toast('تم تحديث حالة المشروع')}
function archiveProject(id){let p=state.projects.find(x=>x.id===id);if(!p)return;p.archived=true;state.activities.unshift(['تامر صلاح','تمت أرشفة '+p.name,'الآن']);renderAll();toast('تمت أرشفة المشروع — البيانات المالية محفوظة')}
function restoreProject(id){let p=state.projects.find(x=>x.id===id);if(!p)return;p.archived=false;state.activities.unshift(['تامر صلاح','تمت استعادة '+p.name,'الآن']);renderAll();toast('تمت استعادة المشروع')}
function deleteProject(id){let p=state.projects.find(x=>x.id===id);if(!p)return;openCustom(`<div class="confirm-icon">!</div><h3>حذف مشروع «${esc(p.name)}»؟</h3><p>سيختفي المشروع من التشغيل، لكن <strong>التكاليف والربح التقديري والسجل المالي لن يتم حذفها</strong>.</p><div class="form-actions"><button class="secondary" onclick="closeModal()">إلغاء</button><button class="danger" onclick="confirmDelete('${id}')">نقل إلى سلة المحذوفات</button></div>`)}
function confirmDelete(id){let p=state.projects.find(x=>x.id===id);if(!p)return;state.projects=state.projects.filter(x=>x.id!==id);state.deleted.unshift({projectId:id,name:p.name,company:p.company||'بدون شركة',deletedAt:new Date().toISOString().slice(0,10)});state.activities.unshift(['تامر صلاح','تم نقل '+p.name+' إلى سلة المحذوفات','الآن']);closeModal();renderAll();toast('تم حذف المشروع من التشغيل مع الاحتفاظ بالسجل المالي')}
function permanentlyDeleteTrash(index){if(!state.deleted[index])return;const item=state.deleted[index];if(!confirm(`هل أنت متأكد من الحذف النهائي لـ ${item.name||'هذا العنصر'}؟\n\nلن يمكن استعادته بعد ذلك.`))return;state.deleted.splice(index,1);renderAll();toast('تم الحذف نهائيًا من سلة المحذوفات')}
function deleteInventoryItem(index){const item=state.inventory[index];if(!item)return;if(!confirm(`هل أنت متأكد من حذف المخزون «${item.name}»؟`))return;state.inventory.splice(index,1);state.activities.unshift(['تامر صلاح',`تم حذف المخزون ${item.name}`,'الآن']);renderAll();toast('تم حذف عنصر المخزون')}
function deleteActivityItem(index){if(!state.activities[index])return;state.activities.splice(index,1);renderAll();toast('تم حذف سجل النشاط')}
function clearActivityLog(){if(!state.activities.length)return;if(!confirm('هل أنت متأكد من حذف سجل النشاط بالكامل؟\n\nلن يمكن استعادته بعد ذلك.'))return;state.activities=[];renderAll();toast('تم حذف سجل النشاط بالكامل')}
function showDetails(e){openCustom(`<h3>${esc(e.item)}</h3><p class="modal-sub">تفاصيل المصروف كاملة</p><div class="detail-grid"><div><span>التاريخ</span><strong>${e.date}</strong></div><div><span>التصنيف</span><strong>${esc(e.category)}</strong></div><div><span>المشروع</span><strong>${esc(e.project)}</strong></div><div><span>المبلغ</span><strong>${money(e.amount)}</strong></div><div><span>المورد / المستفيد</span><strong>${esc(e.party)}</strong></div><div><span>طريقة الدفع</span><strong>${esc(e.method)}</strong></div><div><span>رقم الفاتورة</span><strong>${esc(e.invoice||'غير موجود')}</strong></div></div><div class="detail-note"><span>التفاصيل</span><p>${esc(e.details)}</p></div><div class="detail-note"><span>ملاحظات</span><p>${esc(e.notes||'لا توجد ملاحظات')}</p></div><div class="form-actions"><button class="secondary" onclick="closeModal()">إغلاق</button></div>`)}
function showSupplier(s){openCustom(`<h3>${esc(s.name)}</h3><p class="modal-sub">ملف المورد</p><div class="detail-grid"><div><span>الشركة</span><strong>${esc(s.company)}</strong></div><div><span>الهاتف</span><strong>${esc(s.phone)}</strong></div><div><span>التخصص</span><strong>${esc(s.specialty)}</strong></div><div><span>الرصيد المتبقي</span><strong>${money(s.balance)}</strong></div></div><div class="form-actions"><button class="secondary" onclick="closeModal()">إغلاق</button></div>`)}
function showWorker(w){openCustom(`<h3>${esc(w[0])}</h3><p class="modal-sub">بيانات العمالة</p><div class="detail-grid"><div><span>التخصص</span><strong>${esc(w[1])}</strong></div><div><span>طريقة الدفع</span><strong>${esc(w[2])}</strong></div><div><span>السعر</span><strong>${esc(w[3])}</strong></div></div><div class="form-actions"><button class="secondary" onclick="closeModal()">إغلاق</button></div>`)}
function showMaterial(m){openCustom(`<h3>${esc(m[0])}</h3><p class="modal-sub">تفاصيل الخامة</p><div class="detail-grid"><div><span>المشروع</span><strong>${esc(m[1])}</strong></div><div><span>الكمية</span><strong>${esc(m[2])}</strong></div><div><span>سعر الوحدة</span><strong>${money(m[3])}</strong></div><div><span>الإجمالي</span><strong>${money(m[4])}</strong></div><div><span>المسؤول</span><strong>${esc(m[5])}</strong></div></div><div class="form-actions"><button class="secondary" onclick="closeModal()">إغلاق</button></div>`)}

const typoMap={
 'اعمل':'أعمال','اعمال':'أعمال','التشطيبات':'التشطيبات','تنفيز':'تنفيذ','تنفيذ':'تنفيذ','خرسانه':'خرسانة','خرسان':'خرسانة','حديده':'حديد','دهانات':'دهانات','محاره':'محارة','محاره':'محارة','الموقع':'الموقع','الكميه':'الكمية','الكميات':'الكميات','المستخلص':'المستخلص','المستخلصات':'المستخلصات','اجمالي':'إجمالي','اجمالى':'إجمالي','المبلغ':'المبلغ','المستحق':'المستحق','المشروع':'المشروع','شركه':'شركة','مسئول':'مسؤول','مسوول':'مسؤول','مقاول':'مقاول','توريد':'توريد','توريدات':'توريدات','متر':'متر','مترمربع':'متر مربع','اعتماد':'اعتماد','اعتمد':'اعتمد','خصم':'خصم','احتجاز':'احتجاز','دفعة':'دفعة','دفعه':'دفعة','مستخلص':'مستخلص','فتره':'فترة','تاريخ':'تاريخ','مراجعه':'مراجعة','مراجعة':'مراجعة','نهائي':'نهائي','ابتدائي':'ابتدائي'
};
const knownWorkWords=new Set(Object.keys(typoMap).concat(Object.values(typoMap)).concat(['Heavy','Rock','Diagram','Arkan','Heavy Rock','Diagram','ج.م','م²','م³','طن','قطعة','شيكارة','مقاولات','تشطيب','تشطيبات','خرسانة','محارة','نجارة','كهرباء','سباكة','واجهات','أسقف','أرضيات','دهان','أعمال','بنود','كمية','سعر','وحدة','شركة','عميل','مورد','مقاول','مستخلص','مستخلصات','موقع','تنفيذ','مشروع','قيمة','عقد','دفعة','دفعات','احتجاز','ضريبة','ضريبه','إجمالي','صافي','مدفوع','متبقي','ملاحظات','اعتماد','مراجعة','تسليم','توريد','خامات','عمالة','معدات','نقل','مصاريف','مصروفات','تكلفة','ربح','تم','من','في','على','إلى','و','وتم','حسب','بالمتر','يومية','مقطوعية']));
function dynamicKnownWords(){const words=[...knownWorkWords];state.projects.forEach(p=>[p.name,p.company,p.client,p.manager,p.purchasing].forEach(v=>String(v||'').split(/\s+/).forEach(x=>words.push(x))));state.suppliers?.forEach(x=>[x.name,x.company,x.specialty].forEach(v=>String(v||'').split(/\s+/).forEach(x=>words.push(x))));return new Set(words.map(x=>norm(x)).filter(Boolean));}
function wordIssues(text){const known=dynamicKnownWords();return String(text||'').split(/(\s+|[،؛,:.!؟()\-\/]+)/).map(token=>{const clean=token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'');if(!clean||clean.length<3||/^[A-Za-z0-9]+$/.test(clean))return null;const n=norm(clean);if(known.has(n))return null;if(typoMap[clean])return {word:clean,suggestion:typoMap[clean]};if(typoMap[n])return {word:clean,suggestion:typoMap[n]};if(/^[A-Za-z]+$/.test(clean))return null;return {word:clean,suggestion:null};}).filter(Boolean);}
function spellRender(text){const tokens=String(text||'').split(/(\s+|[،؛,:.!؟()\-\/]+)/);return tokens.map(token=>{const clean=token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu,'');if(!clean||clean.length<3)return esc(token);const n=norm(clean);if(dynamicKnownWords().has(n))return esc(token);const sug=typoMap[clean]||typoMap[n]||'';if(!sug && /^[A-Za-z]+$/.test(clean))return esc(token);return `<span class="spell-error" data-word="${esc(clean)}" data-suggestion="${esc(sug)}">${esc(token)}</span>`;}).join('');}
function spellStats(text){const issues=wordIssues(text);return {count:issues.length,issues};}
function updateSpellEditor(){
  const ed=$('#extractEditor');if(!ed)return;
  const text=ed.innerText||'';
  const st=spellStats(text);
  const count=$('#spellCount');
  if(count){count.textContent=st.count?`⚠ ${st.count} كلمة تحتاج مراجعة`:'✓ لا توجد كلمات تحتاج مراجعة';count.className=st.count?'spell-warning':'spell-ok';}
  const list=$('#spellSuggestions');
  if(list){
    list.innerHTML=st.issues.slice(0,8).map(x=>`<button type="button" class="spell-suggestion" data-from="${esc(x.word)}" data-to="${esc(x.suggestion||'')}"><b>${esc(x.word)}</b>${x.suggestion?` <span>← ${esc(x.suggestion)}</span>`:' <span>مراجعة يدوية</span>'}</button>`).join('');
    list.querySelectorAll('.spell-suggestion').forEach(b=>b.onclick=()=>{const from=b.dataset.from,to=b.dataset.to;if(to)replaceEditorWord(from,to);});
  }
}
function getCaretOffset(root){const sel=window.getSelection();if(!sel||!sel.rangeCount)return (root.innerText||'').length;const r=sel.getRangeAt(0),pre=r.cloneRange();pre.selectNodeContents(root);pre.setEnd(r.startContainer,r.startOffset);return pre.toString().length;}
function restoreCaret(root,offset){let remaining=offset,walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(remaining<=n.nodeValue.length){const r=document.createRange();r.setStart(n,remaining);r.collapse(true);const s=window.getSelection();s.removeAllRanges();s.addRange(r);return;}remaining-=n.nodeValue.length;}const r=document.createRange();r.selectNodeContents(root);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
function replaceEditorWord(from,to){const ed=$('#extractEditor');if(!ed)return;const text=ed.innerText.replace(new RegExp('(^|\\s)'+from.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'(?=\\s|$)','u'),m=>m.startsWith(' ')?' '+to:to);ed.innerText=text;updateSpellEditor();}
function extractPreview(html){
  const tmp=document.createElement('div');
  tmp.innerHTML=html||'';
  return (tmp.innerText||'').replace(/\s+/g,' ').trim().slice(0,180);
}
function renderExtracts(){
  const grid=$('#extractGrid'); if(!grid)return;
  const q=norm($('#extractSearch')?.value||''), status=$('#extractStatus')?.value||'all';
  const list=state.extracts.filter(x=>{
    const hay=[x.title,x.project,x.company,x.client,x.status,x.content,x.notes].join(' ');
    return (status==='all'||x.status===status)&&(!q||searchScore(q,hay)>0);
  });
  grid.innerHTML=list.length?list.map(ex=>`<article class="extract-card document-card">
    <div class="extract-card-head"><div><span class="extract-number">${esc(ex.number||'مستخلص')}</span><h3>${esc(ex.title||'مستخلص بدون عنوان')}</h3><p>${esc(ex.project||'بدون مشروع')} ${ex.company?' • '+esc(ex.company):''}</p></div>
    <b class="badge ${ex.status==='معتمد'?'done':ex.status==='مرفوض'?'danger':ex.status==='قيد المراجعة'?'ending':ex.status==='مدفوع'?'progress':'start'}">${esc(ex.status||'مسودة')}</b></div>
    <div class="extract-document-preview">${esc(exPreview(ex.content||ex.notes||'لم تتم كتابة محتوى بعد.'))}</div>
    <div class="extract-progress"><span>${esc(ex.client||'بدون عميل')}</span><span>${esc(ex.date||'')}</span></div>
    <div class="extract-actions"><button class="secondary" onclick="openExtract('${ex.id}')">عرض المستخلص</button><button class="secondary" onclick="editExtract('${ex.id}')">تعديل</button><button class="danger" onclick="deleteExtract('${ex.id}')">حذف</button><button class="primary" onclick="printExtract('${ex.id}')">طباعة</button></div>
  </article>`).join(''):'<div class="empty-state">لا توجد مستخلصات مطابقة للبحث.</div>';
}
function exPreview(html){return extractPreview(html)}
function extractForm(ex={},id='new'){
  const status=ex.status||'مسودة';
  return `<div class="extract-document-form">
    <div class="form-grid extract-meta-form">
      <label>عنوان المستخلص<input id="exTitle" value="${esc(ex.title||'مستخلص أعمال')}"></label>
      <label>رقم المستخلص<input id="exNumber" value="${esc(ex.number||'MS-'+new Date().getFullYear()+'-')}"></label>
      <label>المشروع<select id="exProject"><option value="">اختر المشروع</option>${state.projects.map(p=>`<option data-no-translate value="${esc(p.name)}" ${p.name===ex.project?'selected':''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label>الشركة<input id="exCompany" value="${esc(ex.company||'')}" placeholder="اسم الشركة"></label>
      <label>العميل<input id="exClient" value="${esc(ex.client||'')}" placeholder="اسم العميل"></label>
      <label>تاريخ المستخلص<input id="exDate" type="date" value="${esc(ex.date||new Date().toISOString().slice(0,10))}"></label>
      <label>حالة المستخلص<select id="exStatus"><option ${status==='مسودة'?'selected':''}>مسودة</option><option ${status==='قيد المراجعة'?'selected':''}>قيد المراجعة</option><option ${status==='معتمد'?'selected':''}>معتمد</option><option ${status==='مرفوض'?'selected':''}>مرفوض</option><option ${status==='مدفوع'?'selected':''}>مدفوع</option></select></label>
    </div>
    <div class="word-editor-shell">
      <div class="word-editor-head"><div><strong>محرر المستخلص</strong><small>اكتب المستخلص هنا كما لو أنك تكتبه في Word.</small></div><span id="editorSaveState">جاهز للكتابة</span></div>
      <div class="word-toolbar" id="extractToolbar">
        <div class="toolbar-group"><button type="button" class="tool-btn" data-cmd="undo" title="تراجع">↶</button><button type="button" class="tool-btn" data-cmd="redo" title="إعادة">↷</button></div>
        <div class="toolbar-group"><select id="docStyle" title="نمط النص"><option value="p">نص عادي</option><option value="h1">عنوان كبير جدًا</option><option value="h2">عنوان كبير</option></select><select id="docFontSize" title="حجم الخط"><option value="3">عادي</option><option value="5">كبير</option><option value="7">كبير جدًا</option></select></div>
        <div class="toolbar-group"><button type="button" class="tool-btn format-btn" data-cmd="bold" title="عريض"><b>B</b></button><button type="button" class="tool-btn format-btn" data-cmd="italic" title="مائل"><i>I</i></button><button type="button" class="tool-btn format-btn" data-cmd="underline" title="تحته خط"><u>U</u></button></div>
        <div class="toolbar-group"><button type="button" class="tool-btn format-btn" data-cmd="justifyRight" title="محاذاة يمين">☰</button><button type="button" class="tool-btn format-btn" data-cmd="justifyCenter" title="توسيط">≡</button><button type="button" class="tool-btn format-btn" data-cmd="justifyLeft" title="محاذاة يسار">☰</button></div>
        <div class="toolbar-group"><button type="button" class="tool-btn format-btn" data-cmd="insertUnorderedList" title="قائمة نقطية">•</button><button type="button" class="tool-btn format-btn" data-cmd="insertOrderedList" title="قائمة مرقمة">1.</button></div>
      </div>
      <div class="document-paper-wrap modal-paper-wrap"><div id="extractEditor" class="document-paper" contenteditable="true" spellcheck="true" dir="rtl" data-placeholder="ابدأ بكتابة المستخلص هنا..."></div></div>
      <div class="document-footer"><span id="wordCount">0 كلمة</span><span id="charCount">0 حرف</span><span id="spellCount" class="spell-ok">✓ لا توجد كلمات تحتاج مراجعة</span><span id="editorSaveStateBottom">يتم الحفظ عند الضغط على حفظ المستخلص</span></div><div id="spellSuggestions" class="spell-suggestions" aria-live="polite"></div>
    </div>
    <div class="form-actions"><button class="secondary" onclick="closeModal()">إلغاء</button><button class="primary" onclick="saveExtract('${id}')">حفظ المستخلص</button></div>
  </div>`;
}
function openExtractForm(ex={},id='new'){
  openCustom(`<h3>${id==='new'?'كتابة مستخلص جديد':'تعديل المستخلص'}</h3><p class="modal-sub">المستخلص عبارة عن مستند نصي كامل، والحالة يحددها والدك بنفسه.</p>${extractForm(ex,id)}`);
  const ed=$('#extractEditor'); if(!ed)return;
  ed.innerHTML=sanitizeRichText(ex.content||ex.notes||'');
  setupDocumentEditor();
}
function setupDocumentEditor(){
  const ed=$('#extractEditor'); if(!ed)return;
  const toolbar=$('#extractToolbar');
  const update=()=>{
    const t=(ed.innerText||'').replace(/\s+/g,' ').trim();
    $('#wordCount').textContent=(t?t.split(' ').length:0)+' كلمة';
    $('#charCount').textContent=t.length+' حرف';
    const state=$('#editorSaveState'); if(state)state.textContent='تم تعديل المستند';
    const bottom=$('#editorSaveStateBottom'); if(bottom)bottom.textContent='هناك تغييرات غير محفوظة';
    updateToolbarState();
    updateSpellEditor();
  };
  const command=(cmd,value=null)=>{
    ed.focus();
    document.execCommand(cmd,false,value);
    update();
  };
  toolbar?.querySelectorAll('[data-cmd]').forEach(btn=>btn.addEventListener('mousedown',e=>e.preventDefault()));
  toolbar?.querySelectorAll('[data-cmd]').forEach(btn=>btn.addEventListener('click',()=>command(btn.dataset.cmd)));
  $('#docStyle')?.addEventListener('change',e=>command('formatBlock',e.target.value));
  $('#docFontSize')?.addEventListener('change',e=>command('fontSize',e.target.value));
  ed.addEventListener('input',update);
  ed.addEventListener('keyup',update);
  ed.addEventListener('mouseup',update);
  if(!window.__royaExtractSelectionBound){
    window.__royaExtractSelectionBound=true;
    document.addEventListener('selectionchange',()=>updateToolbarState());
  }
  update();
}
function updateToolbarState(){
  const ed=$('#extractEditor'); if(!ed)return;
  document.querySelectorAll('#extractToolbar [data-cmd]').forEach(btn=>{
    let active=false; try{active=document.queryCommandState(btn.dataset.cmd)}catch(e){}
    btn.classList.toggle('is-active',!!active);
  });
}
function collectExtract(){
  return {title:$('#exTitle').value.trim(),number:$('#exNumber').value.trim(),project:$('#exProject').value,company:$('#exCompany').value.trim(),client:$('#exClient').value.trim(),date:$('#exDate').value,status:$('#exStatus').value,content:sanitizeRichText($('#extractEditor')?.innerHTML||'')};
}
function saveExtract(id){
  const data=collectExtract();
  if(!data.title||!data.project||!(document.querySelector('#extractEditor')?.innerText||'').trim()){toast('اكتب عنوان المستخلص والمشروع ومحتوى المستخلص أولًا');return false;}
  if(id==='new'){
    const duplicate=state.extracts.some(x=>norm(x.number)===norm(data.number)&&norm(x.project)===norm(data.project));
    if(duplicate){toast('رقم المستخلص مستخدم بالفعل لهذا المشروع');return false;}
    data.id='ex'+Date.now();state.extracts.unshift(data);state.activities.unshift(['تامر صلاح','تم إنشاء مستخلص مكتوب جديد','الآن']);
  }else{
    const i=state.extracts.findIndex(x=>x.id===id);
    if(i<0)return false;
    const duplicate=state.extracts.some(x=>x.id!==id&&norm(x.number)===norm(data.number)&&norm(x.project)===norm(data.project));
    if(duplicate){toast('رقم المستخلص مستخدم بالفعل لهذا المشروع');return false;}
    state.extracts[i]={...state.extracts[i],...data};state.activities.unshift(['تامر صلاح','تم تعديل مستخلص مكتوب','الآن']);
  }
  closeModal();renderAll();toast('تم حفظ المستخلص بنجاح');return true;
}
function openExtract(id){
  const ex=state.extracts.find(x=>x.id===id); if(!ex)return;
  openCustom(`<div class="document-view-head"><div><span class="extract-number">${esc(ex.number||'مستخلص')}</span><h3>${esc(ex.title||'مستخلص أعمال')}</h3><p class="modal-sub">${esc(ex.project||'')} ${ex.company?' • '+esc(ex.company):''}</p></div><b class="badge ${ex.status==='معتمد'?'done':ex.status==='مرفوض'?'danger':ex.status==='قيد المراجعة'?'ending':ex.status==='مدفوع'?'progress':'start'}">${esc(ex.status||'مسودة')}</b></div><div class="saved-document"><div class="saved-document-paper" dir="rtl">${sanitizeRichText(ex.content||'<p>لا يوجد محتوى.</p>')}</div></div><div class="document-view-meta"><span>العميل: ${esc(ex.client||'—')}</span><span>التاريخ: ${esc(ex.date||'—')}</span><span>الحالة: ${esc(ex.status||'مسودة')}</span></div><div class="form-actions"><button class="secondary" onclick="closeModal()">إغلاق</button><button class="secondary" onclick="editExtract('${id}')">تعديل</button><button class="primary" onclick="printExtract('${id}')">طباعة / PDF</button></div>`);
}
function editExtract(id){const ex=state.extracts.find(x=>x.id===id);if(ex)openExtractForm(ex,id)}
function deleteExtract(id){const index=state.extracts.findIndex(x=>x.id===id);if(index<0)return;const ex=state.extracts[index];if(!confirm(`هل أنت متأكد من حذف المستخلص «${ex.title||ex.number||'هذا المستخلص'}»؟\n\nسيتم نقله إلى سلة المحذوفات ويمكن حذفه نهائيًا لاحقًا.`))return;state.extracts.splice(index,1);state.deleted.unshift({type:'extract',name:ex.title||ex.number||'مستخلص',company:ex.company||ex.project||'',payload:ex,deletedAt:new Date().toISOString().slice(0,10)});state.activities.unshift(['تامر صلاح',`تم حذف المستخلص ${ex.title||ex.number||''} ونقله إلى سلة المحذوفات`,'الآن']);renderAll();toast('تم حذف المستخلص ونقله إلى سلة المحذوفات')}
function printExtract(id){
  const ex=state.extracts.find(x=>x.id===id); if(!ex)return;
  const printEn=state.lang==='en'; const tr=window.RoyaI18n?.translateString||((x)=>x); const printText=(x)=>printEn?tr(x):x; const printDigits=(x)=>printEn?String(x).replace(/[٠-٩۰-۹]/g,ch=>{const c=ch.charCodeAt(0);return String(c>=0x0660&&c<=0x0669?c-0x0660:c-0x06F0)}):x; const printContent=sanitizeRichText(ex.content||''); const html=`<!doctype html><html lang="${printEn?'en':'ar'}" dir="${printEn?'ltr':'rtl'}"><head><meta charset="utf-8"><title>${esc(ex.title||'مستخلص')}</title><style>body{font-family:Arial,sans-serif;background:#eee;margin:0;padding:30px;color:#151b17}.paper{max-width:850px;margin:auto;background:#fff;padding:65px;min-height:1050px;box-shadow:0 0 18px #ccc}header{border-bottom:2px solid #a6c63d;padding-bottom:18px;margin-bottom:30px}h1{font-size:28px;margin:0 0 8px}h2{font-size:18px;margin:0;color:#667} .meta{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0;color:#667;font-size:13px}.content{font-size:18px;line-height:2.1}.content h1{font-size:32px}.content h2{font-size:25px;color:#151b17}.content p{margin:0 0 14px}@media print{body{background:#fff;padding:0}.paper{box-shadow:none;max-width:none;min-height:0;padding:50px}button{display:none}}</style></head><body><article class="paper"><header><h1>${esc(printText(ex.title||'مستخلص أعمال'))}</h1><h2>${esc(printDigits(ex.number||''))}</h2></header><div class="meta"><span>${printText('المشروع')}: ${esc(printText(ex.project||'—'))}</span><span>${printText('الشركة')}: ${esc(printText(ex.company||'—'))}</span><span>${printText('العميل')}: ${esc(printText(ex.client||'—'))}</span><span>${printText('الحالة')}: ${esc(printText(ex.status||'مسودة'))}</span><span>${printText('التاريخ')}: ${esc(printDigits(ex.date||'—'))}</span></div><div class="content">${printContent}</div></article><script>window.onload=()=>window.print()<\/script></body></html>`;
  const w=window.open('','_blank','width=1000,height=900');if(w){w.document.write(html);w.document.close();}
}
const modalConfigs={
 project:{title:'إضافة مشروع جديد',fields:[['اسم المشروع','مثال: مشروع جديد','text'],['اسم العميل','اسم العميل','text'],['اسم الشركة','مثال: Heavy Rock / Diagram','text'],['اسم مدير الشركة','اختياري — يمكن تركه فارغًا','text'],['رقم الهاتف','01xxxxxxxxx','tel'],['عنوان المشروع','العنوان','text'],['قيمة العقد','600000','number'],['تاريخ البداية','','date'],['موعد التسليم المتوقع','','date'],['مسؤول شراء الخامات','اسم المسؤول','text'],['وصف المشروع','وصف مختصر للمشروع','textarea']]},
 material:{title:'إضافة مشتريات',fields:[['اسم الخامة','أسمنت / حديد / سيراميك','text'],['الكمية','120','text'],['سعر الوحدة','210','number'],['المشروع','اسم المشروع','text'],['المسؤول','اسم المسؤول','text']]},worker:{title:'إضافة عامل',fields:[['اسم العامل','أحمد','text'],['التخصص','فني تشطيبات','text'],['طريقة الدفع','بالمتر / يومية / مقطوعية / أخرى','text'],['السعر','45','number']]},
 expense:{title:'تسجيل مصروف مفصل',fields:[['البند','أسمنت / نقل / كهرباء الموقع','text'],['التصنيف','خامات / عمالة / نقل / تشغيل / أخرى','text'],['المشروع','اسم المشروع','text'],['المبلغ','8500','number'],['المورد أو المستفيد','اسم الشخص أو الشركة','text'],['طريقة الدفع','نقدي / تحويل / شيك','text'],['التاريخ','','date'],['رقم الفاتورة أو المرجع','اختياري','text'],['التفاصيل','اكتب تفاصيل المصروف كاملة...','textarea'],['ملاحظات','أي ملاحظة إضافية','textarea']]},
 payment:{title:'تسجيل دفعة عميل',fields:[['المشروع','اسم المشروع','text'],['المبلغ','50000','number'],['طريقة الدفع','تحويل / نقدي / شيك','text'],['التاريخ','','date'],['رقم المرجع','اختياري','text'],['ملاحظات','تفاصيل الدفعة','textarea']]},member:{title:'إضافة شخص للفريق',fields:[['الاسم','اسم الشخص','text'],['الدور','شريك / موظف / مسؤول','text'],['الصلاحيات','مثال: المشاريع + المصروفات','text'],['المسمى','المسمى الوظيفي','text']]},
 quote:{title:'عرض سعر جديد',fields:[['عنوان العرض','عرض تشطيبات فيلا','text'],['الشركة','Heavy Rock','text'],['العميل','اسم العميل','text'],['القيمة','750000','number'],['الحالة','قيد المراجعة / معتمد','text'],['التاريخ','','date']]},workitem:{title:'إضافة بند أعمال',fields:[['اسم البند','محارة / خرسانة / أرضيات','text'],['المشروع','اسم المشروع','text'],['الكمية','100','number'],['الوحدة','م² / م³ / قطعة','text'],['سعر الوحدة','100','number']]},supplier:{title:'مورد جديد',fields:[['اسم المورد','اسم الشخص أو الجهة','text'],['الشركة','شركة التوريدات','text'],['الهاتف','01xxxxxxxxx','tel'],['التخصص','أسمنت / حديد / تشطيبات','text'],['الرصيد المتبقي','0','number']]},stock:{title:'حركة مخزون',fields:[['الخامة','أسمنت مقاوم','text'],['الكمية','100','number'],['الوحدة','شيكارة','text'],['الحد الأدنى','50','number'],['مكان التخزين','المخزن الرئيسي','text']]},due:{title:'تسجيل مستحق/دفعة عامل',fields:[['اسم العامل أو المقاول','أحمد حسن','text'],['المشروع','اسم المشروع','text'],['طريقة الحساب','بالمتر / يومية / مقطوعية','text'],['المستحق','50000','number'],['المدفوع','20000','number'],['آخر دفعة','','date']]}
};
function closeModal(){const modal=document.getElementById('modal');if(!modal)return;modal.classList.remove('show');const body=document.getElementById('modalBody');if(body)body.innerHTML='';modalSaving=false;}
window.closeModal=closeModal;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('modal')?.classList.contains('show'))closeModal();});
function openCustom(html){$('#modalBody').innerHTML=html;$('#modal').classList.add('show');window.RoyaI18n?.translateDOM?.();window.RoyaI18n?.enforceOwnerName?.();window.RoyaI18n?.translateDOM?.()}
const __openCustomV14=openCustom; openCustom=function(html){__openCustomV14(html); if(window.RoyaI18n) window.RoyaI18n.translateDOM();};
function openModal(type){if(type==='project'){openCustom(`<h3>إضافة مشروع جديد</h3><p class="modal-sub">أدخل بيانات المشروع. مدير الشركة اختياري.</p>${projectForm({},'new')}`);return}if(type==='extract'){openExtractForm();return}let c=modalConfigs[type];if(!c)return;openCustom(`<h3>${c.title}</h3><p class="modal-sub">هذه البيانات محفوظة ومتزامنة عبر Firebase.</p><div class="form-grid">${c.fields.map((f,i)=>`<label class="${f[2]==='textarea'?'full':''}">${f[0]}${f[2]==='textarea'?`<textarea id="m${i}" placeholder="${f[1]}"></textarea>`:`<input id="m${i}" type="${f[2]}" placeholder="${f[1]}">`}</label>`).join('')}</div><div class="form-actions"><button class="secondary" onclick="closeModal()">إلغاء</button><button class="primary" onclick="saveModal('${type}')">حفظ</button></div>`)}
function val(i){return ($('#m'+i)?.value||'').trim()}

function editTeamMember(i){
  const t=state.team[i]; if(!t)return;
  openCustom(`<h3>تعديل بيانات العضو</h3><p class="modal-sub">تعديل بيانات ${esc(t[0])}</p>
  <div class="form-grid">
    <label>الاسم<input id="m0" value="${esc(t[0])}"></label>
    <label>الدور<input id="m1" value="${esc(t[1])}"></label>
    <label>الصلاحيات<input id="m2" value="${esc(t[2])}"></label>
    <label>المسمى الوظيفي<input id="m3" value="${esc(t[3])}"></label>
  </div>
  <div class="form-actions"><button class="secondary" onclick="closeModal()">إلغاء</button><button class="primary" onclick="saveTeamMemberEdit(${i})">حفظ التعديلات</button></div>`);
}
function saveTeamMemberEdit(i){
  if(!state.team[i])return false;
  const old=state.team[i];
  const next=[val(0)||old[0],val(1)||old[1],val(2)||old[2],val(3)||old[3],Boolean(old[4])]; if(old.__docId) Object.defineProperty(next,'__docId',{value:old.__docId,writable:true,configurable:true,enumerable:false}); state.team[i]=next;
  closeModal();renderAll();toast('تم حفظ تعديلات العضو');return true;
}
function toggleTeamMember(i){
  const t=state.team[i]; if(!t)return false;
  t[4]=!Boolean(t[4]);
  state.activities.unshift(['تامر صلاح',`${t[4]?'تم تعطيل':'تم تفعيل'} العضو ${t[0]}`,'الآن']);
  renderAll();
  toast(t[4]?'تم تعطيل العضو':'تم تفعيل العضو');
  return true;
}

function deleteTeamMember(i){
  const t=state.team[i]; if(!t)return;
  if(!confirm(`هل أنت متأكد من حذف ${t[0]}؟\n\nسيتم نقله إلى الأرشيف، ولن يتم حذف سجلاته التاريخية.`))return;
  state.teamArchive.unshift({...t,deletedAt:new Date().toISOString()});
  state.team.splice(i,1);
  state.activities.unshift(['تامر صلاح',`تم حذف ${t[0]} ونقله إلى الأرشيف`,'الآن']);
  renderAll();toast('تم حذف العضو ونقله إلى الأرشيف');
}
function restoreTeamMember(i){
  const t=state.teamArchive[i]; if(!t)return;
  const restored=[t[0],t[1],t[2],t[3],Boolean(t[4])]; if(t.__docId) Object.defineProperty(restored,'__docId',{value:t.__docId,writable:true,configurable:true,enumerable:false}); state.team.unshift(restored);
  state.teamArchive.splice(i,1);
  state.activities.unshift(['تامر صلاح',`تمت استعادة ${t[0]} من الأرشيف`,'الآن']);
  renderAll();toast('تمت استعادة العضو');
}

function modalRecord(type,index){
  const map={material:'materials',worker:'workers',expense:'expenses',payment:'payments',quote:'quotes',workitem:'workitems',supplier:'suppliers',stock:'inventory',due:'dues'};
  const key=map[type]; return key?state[key]?.[index]:null;
}
function modalEditValues(type,item){
  if(type==='material')return [item[0],item[2],item[3],item[1],item[5]];
  if(type==='worker')return [item[0],item[1],item[2],item[3]];
  if(type==='expense')return [item.item,item.category,item.project,item.amount,item.party,item.method,item.date,item.invoice,item.details,item.notes];
  if(type==='payment')return [item[0],item[2],item[3],item[1],item[4]??'',item[5]??''];
  if(type==='quote')return [item.title,item.company,item.client,item.value,item.status,item.date];
  if(type==='workitem')return [item[0],item[1],item[2],item[5],item[6]];
  if(type==='supplier')return [item.name,item.company,item.phone,item.specialty,item.balance];
  if(type==='stock')return [item.name,item.qty,item.unit,item.min,item.location];
  if(type==='due')return [item.name,item.project,item.method,item.due,item.paid,item.last];
  return [];
}
function editModalItem(type,index){
  const item=modalRecord(type,index), cfg=modalConfigs[type]; if(!item||!cfg)return;
  const values=modalEditValues(type,item);
  openCustom(`<h3>تعديل ${cfg.title.replace(/^إضافة |^تسجيل |^حركة /,'')}</h3><p class="modal-sub">عدّل البيانات ثم احفظ التغييرات.</p><div class="form-grid">${cfg.fields.map((f,i)=>{const v=values[i]??'';return `<label class="${f[2]==='textarea'?'full':''}">${f[0]}${f[2]==='textarea'?`<textarea id="m${i}" placeholder="${esc(f[1])}">${esc(v)}</textarea>`:`<input id="m${i}" type="${f[2]}" value="${esc(v)}" placeholder="${esc(f[1])}">`}</label>`}).join('')}</div><div class="form-actions"><button class="secondary" onclick="closeModal()">إلغاء</button><button class="primary" onclick="saveModalEdit('${type}',${index})">حفظ التعديلات</button></div>`);
}
function saveModalEdit(type,index){
  if(modalSaving)return false;
  const item=modalRecord(type,index), cfg=modalConfigs[type];
  if(!item || !cfg)return false;
  const required={expense:[0,1,2,3],quote:[0,2,3],supplier:[0],stock:[0,1],due:[0,1,3],worker:[0],material:[0,1,2,3],payment:[0,1],workitem:[0,1,2,4]}[type]||[];
  if(required.some(i=>!val(i))){toast('من فضلك أكمل البيانات الأساسية أولًا');return false;}
  modalSaving=true;
  try{
    if(type==='expense')state.expenses[index]={...item,item:val(0),category:val(1),project:val(2),amount:Number(val(3))||0,party:val(4),method:val(5),date:val(6)||item.date,invoice:val(7),details:val(8),notes:val(9)};
    else if(type==='quote')state.quotes[index]={...item,title:val(0),company:val(1),client:val(2),value:Number(val(3))||0,status:val(4),date:val(5)||item.date};
    else if(type==='supplier')state.suppliers[index]={...item,name:val(0),company:val(1),phone:val(2),specialty:val(3),balance:Number(val(4))||0};
    else if(type==='stock')state.inventory[index]={...item,name:val(0),qty:Number(val(1))||0,unit:val(2),min:Number(val(3))||0,location:val(4)};
    else if(type==='due')state.dues[index]={...item,name:val(0),project:val(1),method:val(2),due:Number(val(3))||0,paid:Number(val(4))||0,last:val(5)||item.last};
    else if(type==='worker'){const next=[val(0),val(1),val(2),val(3)]; if(item.__docId) Object.defineProperty(next,'__docId',{value:item.__docId,writable:true,configurable:true,enumerable:false}); state.workers[index]=next;}
    else if(type==='material'){const next=[val(0),val(3),val(1),Number(val(2))||0,(Number(val(1))||0)*(Number(val(2))||0),val(4)]; if(item.__docId) Object.defineProperty(next,'__docId',{value:item.__docId,writable:true,configurable:true,enumerable:false}); state.materials[index]=next;}
    else if(type==='payment'){const next=[val(0),val(3)||item[1],num(val(1)),val(2),val(4),val(5)]; if(item.__docId) Object.defineProperty(next,'__docId',{value:item.__docId,writable:true,configurable:true,enumerable:false}); state.payments[index]=next;}
    else if(type==='workitem'){const q=Number(val(2))||0,u=val(3),price=Number(val(4))||0;const oldDone=state.workitems[index][3]||0;const next=[val(0),val(1),q,oldDone,Math.max(0,q-oldDone),u,price,q*price]; if(item.__docId) Object.defineProperty(next,'__docId',{value:item.__docId,writable:true,configurable:true,enumerable:false}); state.workitems[index]=next;}
    state.activities.unshift(['تامر صلاح',`تم تعديل ${cfg.title.replace(/^إضافة |^تسجيل |^حركة /,'')}`,'الآن']);
    closeModal();renderAll();toast('تم حفظ التعديلات بنجاح');return true;
  }finally{modalSaving=false;}
}
function deleteModalItem(type,index){
  const item=modalRecord(type,index), map={material:'materials',worker:'workers',expense:'expenses',payment:'payments',quote:'quotes',workitem:'workitems',supplier:'suppliers',stock:'inventory',due:'dues'}; const key=map[type]; if(!item||!key)return;
  const name=type==='worker'||type==='material'||type==='payment'||type==='workitem'?item[0]:(item.name||item.item||item.title||'هذا العنصر');
  if(!confirm(`هل أنت متأكد من حذف «${name}»؟\n\nسيتم نقله إلى سلة المحذوفات ويمكن حذفه نهائيًا لاحقًا.`))return;
  state[key].splice(index,1);
  state.deleted.unshift({type,name,company:item.company||item.project||'',payload:item,deletedAt:new Date().toISOString().slice(0,10)});
  state.activities.unshift(['تامر صلاح',`تم حذف ${name} ونقله إلى سلة المحذوفات`,'الآن']);
  renderAll();toast('تم الحذف ونقل العنصر إلى سلة المحذوفات');
}

let modalSaving=false;
function saveModal(type){
  if(modalSaving)return false;
  const required={expense:[0,1,2,3],quote:[0,2,3],supplier:[0],stock:[0,1],due:[0,1,3],worker:[0],material:[0,1,2,3],payment:[0,1],member:[0,1],workitem:[0,1,2,4]};
  const needed=required[type]||[];
  if(needed.some(i=>!val(i))){toast('من فضلك أكمل البيانات الأساسية أولًا');return false;}
  modalSaving=true;
  try{
    if(type==='expense'){state.expenses.unshift({date:val(6)||new Date().toISOString().slice(0,10),item:val(0),category:val(1),project:val(2),amount:Number(val(3))||0,party:val(4),method:val(5),invoice:val(7),details:val(8),notes:val(9)});state.activities.unshift(['تامر صلاح','تم تسجيل مصروف جديد','الآن'])}
    else if(type==='quote')state.quotes.unshift({id:'q'+Date.now(),title:val(0),company:val(1),client:val(2),value:Number(val(3))||0,status:val(4),date:val(5)||new Date().toISOString().slice(0,10)});
    else if(type==='supplier')state.suppliers.unshift({name:val(0),company:val(1),phone:val(2),specialty:val(3),balance:Number(val(4))||0});
    else if(type==='stock')state.inventory.unshift({name:val(0),qty:Number(val(1))||0,unit:val(2),min:Number(val(3))||0,location:val(4),status:'جديد'});
    else if(type==='due')state.dues.unshift({name:val(0),project:val(1),method:val(2),due:Number(val(3))||0,paid:Number(val(4))||0,last:val(5)||new Date().toISOString().slice(0,10)});
    else if(type==='worker')state.workers.unshift([val(0),val(1),val(2),val(3)]);
    else if(type==='material')state.materials.unshift([val(0),val(3),val(1),Number(val(2))||0,(Number(val(1))||0)*(Number(val(2))||0),val(4)]);
    else if(type==='payment')state.payments.unshift([val(0),val(3)||new Date().toISOString().slice(0,10),num(val(1)),val(2),val(4),val(5)]);
    else if(type==='member')state.team.unshift([val(0),val(1),val(2),val(3),false]);
    else if(type==='workitem'){let q=Number(val(2))||0,u=val(3),price=Number(val(4))||0;state.workitems.unshift([val(0),val(1),q,0,q,u,price,q*price])}
    else return false;
    closeModal();renderAll();toast('تمت الإضافة بنجاح — تم حفظ البيانات');return true;
  }finally{modalSaving=false;}
}
function setupSearch(){const input=$('#globalSearch'),box=$('#searchSuggestions');if(!input)return;function render(){let q=input.value.trim();if(!q){box.classList.remove('show');box.innerHTML='';return}let items=searchItems(q);box.innerHTML=items.length?items.map((x,i)=>`<button class="search-item" data-i="${i}"><span class="search-type">${esc(x.type)}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.sub)}</small></div><b>↵</b></button>`).join(''):`<div class="search-empty">مفيش نتيجة مطابقة. جرّب اسم المشروع، الشركة، العميل، المصروف أو حتى كلمة بالعامية.</div>`;box.classList.add('show');box.querySelectorAll('.search-item').forEach((b,i)=>b.onclick=()=>{items[i].action();box.classList.remove('show');input.blur()})}input.addEventListener('input',render);input.addEventListener('keydown',e=>{if(e.key==='Escape'){input.value='';box.classList.remove('show')}if(e.key==='Enter'){let first=box.querySelector('.search-item');if(first)first.click()}});document.addEventListener('click',e=>{if(!e.target.closest('.global-search'))box.classList.remove('show')});document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();input.focus()}})}
$$('.nav-item').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));$$('[data-page-jump]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.pageJump)));$('#menuBtn').onclick=()=>{$('#sidebar').classList.add('open');$('#overlay').classList.add('show')};$('#overlay').onclick=()=>{$('#sidebar').classList.remove('open');$('#overlay').classList.remove('show')};$('#themeBtn').onclick=()=>{state.dark=!state.dark;applyTheme()};$('#themeSwitch').onclick=()=>{state.dark=!state.dark;applyTheme()};$('#langBtn').onclick=()=>{state.lang=state.lang==='ar'?'en':'ar';localStorage.setItem('bc-lang',state.lang);applyLang();renderAll()};$('#settingsLang').onclick=()=>$('#langBtn').click();$('#closeModal').onclick=()=>closeModal();$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};$$('[data-modal]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.modal)));$('#extractSearch')?.addEventListener('input',renderExtracts);$('#extractStatus')?.addEventListener('change',renderExtracts);$('#extractProject')?.addEventListener('change',renderExtracts);$('#projectSearch').addEventListener('input',renderProjects);$('#statusFilter').addEventListener('change',renderProjects);$('#projectSort').addEventListener('change',renderProjects);

/* V14 — Roya identity + complete UI bilingual layer */
(() => {
  const AR_EN = {
    "إدارة أعمال المقاولات":"Construction Management",
    "نظرة عامة":"Overview",
    "لوحة التحكم":"Dashboard",
    "المشاريع":"Projects",
    "التشغيل":"Operations",
    "الخامات والمشتريات":"Materials & Purchases",
    "العمالة":"Labor",
    "المصروفات":"Expenses",
    "دفعات العملاء":"Client Payments",
    "المستخلصات":"Extracts",
    "التحليل":"Analytics",
    "التقارير":"Reports",
    "الفريق والشركاء":"Team & Partners",
    "إدارة متقدمة":"Advanced Management",
    "عروض الأسعار والعقود":"Quotes & Contracts",
    "بنود الأعمال والكميات":"Work Items & Quantities",
    "الموردون":"Suppliers",
    "المخزون":"Inventory",
    "مستحقات العمال والمقاولين":"Labor Payables",
    "الأرشيف وسلة المحذوفات":"Archive & Trash",
    "سجل النشاط والتنبيهات":"Activity & Alerts",
    "الإعدادات":"Settings",
    "النظام جاهز":"System Ready",
    "النظام متصل بـFirebase":"Firebase-connected system",
    "مساحة العمل":"Workspace",
    "ابحث في النظام: مشروع، شركة، عميل، مصروف، مورد...":"Search the system: project, company, client, expense, supplier...",
    "نظرة اليوم":"Today's Overview",
    "مركز التحكم في أعمالك":"Your Business Command Center",
    "تابع المشاريع، الشركات، التكاليف، العمالة ودفعات العملاء من مكان واحد.":"Track projects, companies, costs, labor, and client payments in one place.",
    "مشروع جديد":"New Project",
    "المشاريع النشطة":"Active Projects",
    "قيد التنفيذ حاليًا":"Currently in progress",
    "قيمة العقود":"Contract Value",
    "جنيه مصري":"Egyptian Pounds",
    "إجمالي التكاليف":"Total Costs",
    "مسجلة في النظام":"Recorded in the system",
    "الربح التقديري":"Estimated Profit",
    "يظل محفوظًا حتى بعد حذف المشروع":"Preserved even after a project is deleted",
    "حركة المصروفات":"Expense Activity",
    "آخر 6 أشهر":"Last 6 months",
    "مايو":"May","يونيو":"June","يوليو":"July","أغسطس":"August","سبتمبر":"September","أكتوبر":"October",
    "أحدث المشاريع":"Latest Projects",
    "حسب آخر تحديث":"By latest update",
    "عرض الكل":"View All",
    "الملخص المالي":"Financial Summary",
    "التكاليف والأرباح محفوظة كسجل مستقل عن حالة المشروع":"Costs and profits are preserved independently of project status",
    "التقرير الكامل":"Full Report",
    "العقود":"Contracts","المحصّل":"Collected","التكاليف":"Costs",
    "كل مشروع مرتبط بعميله وشركته ومديره وتكاليفه وحالته التشغيلية.":"Every project is linked to its client, company, manager, costs, and operating status.",
    "ابحث عن المشروع أو الشركة أو العميل...":"Search by project, company, or client...",
    "كل الحالات":"All statuses",
    "قيد التنفيذ":"In Progress","منتهي":"Completed","على وشك البدء":"Starting Soon","على وشك الانتهاء":"Finishing Soon",
    "الأحدث أولًا":"Newest First","الأعلى قيمة":"Highest Value",
    "مهم:":"Important:",
    "حذف المشروع يحذف بطاقة المشروع من التشغيل فقط، بينما تظل سجلات المصروفات والتكاليف والربح التقديري محفوظة في السجل المالي.":"Deleting a project removes its operational card only. Expenses, costs, and estimated profit remain in the financial ledger.",
    "تتبع المواد والكميات والأسعار وربطها بالمشروع والمسؤول عن الشراء.":"Track materials, quantities, prices, projects, and purchasing responsibility.",
    "إضافة مشتريات":"Add Purchase","الخامة":"Material","المشروع":"Project","الكمية":"Quantity","سعر الوحدة":"Unit Price","الإجمالي":"Total","المسؤول":"Responsible Person",
    "طريقة الدفع مرنة: بالمتر، يومية، مقطوعية أو أي اتفاق آخر.":"Payment can be per meter, daily, fixed, or another agreed method.",
    "إضافة عامل":"Add Worker",
    "كل مصروف له تفاصيل كاملة حتى يمكن مراجعة التكلفة لاحقًا.":"Every expense keeps complete details for later cost review.",
    "تسجيل مصروف":"Record Expense","عدد السجلات":"Record Count","إجمالي المصروفات":"Total Expenses","أعلى بند":"Top Category",
    "التاريخ":"Date","البند":"Item","التصنيف":"Category","المبلغ":"Amount","المورد/المستفيد":"Supplier / Beneficiary","طريقة الدفع":"Payment Method","تفاصيل":"Details",
    "سجل كل دفعة واعرف المتبقي على كل مشروع.":"Record every payment and see the remaining balance for each project.",
    "تسجيل دفعة":"Record Payment","الطريقة":"Method","ملاحظات":"Notes",
    "اكتب المستخلص كمستند كامل، واحفظه واعرضه لاحقًا بنفس التنسيق الذي كتبه والدك.":"Write the extract as a complete document, save it, and view it later with the same formatting.",
    "مستخلص جديد":"New Extract","ابحث باسم المستخلص أو المشروع أو الشركة أو العميل...":"Search by extract, project, company, or client...",
    "مسودة":"Draft","قيد المراجعة":"Under Review","معتمد":"Approved","مرفوض":"Rejected","مدفوع":"Paid",
    "قراءة مالية وتشغيلية أوضح لأعمالك.":"Clearer financial and operational insight for your business.",
    "إجمالي العقود":"Total Contracts","قيمة كل العقود المسجلة":"Value of all recorded contracts","مواد + عمالة + مصروفات":"Materials + Labor + Expenses","العقد − التكاليف":"Contract − Costs",
    "سجل الأرباح المحفوظ":"Saved Profit Ledger","السجل لا يعتمد على وجود بطاقة المشروع الحالية":"The ledger is independent of the current project card",
    "الفريق والشركاء":"Team & Partners","إدارة الشركاء والموظفين بصلاحيات واضحة، مع حفظ السجل التاريخي.":"Manage partners and employees with clear permissions while preserving historical records.",
    "إضافة شخص":"Add Person","أعضاء الفريق":"Team Members","الأشخاص المحذوفون من الفريق النشط. سجلاتهم التاريخية تظل محفوظة.":"Members removed from the active team. Their historical records remain preserved.",
    "صلاحيات إدارة الفريق":"Team Management Permissions",
    "تامر صلاح هو المالك والمخول بإضافة وتعديل وتعطيل وحذف واستعادة أعضاء الفريق. حذف العضو ينقله إلى الأرشيف ولا يحذف تاريخه.":"Tamer Salah is the owner and is authorized to add, edit, disable, delete, and restore team members. Deleting a member moves them to the archive without deleting their history.",
    "المالك":"Owner","صلاحيات كاملة":"Full Access","الشركاء":"Partners","الموظفون":"Employees","الأرشيف":"Archive",
    "الحساب الرئيسي":"Primary Account","إدارة كاملة للنظام والفريق":"Full control of the system and team",
    "الأشخاص المحذوفون من الفريق النشط. سجلاتهم التاريخية تظل محفوظة.":"Members removed from the active team. Their historical records remain preserved.",
    "الأرشيف فارغ.":"The archive is empty.","محذوف من الفريق":"Removed from Team","استعادة":"Restore","حذف":"Delete","تعطيل":"Disable","تعديل":"Edit",
    "إدارة الشركاء والفريق":"Team Management","إدارة الشركاء والموظفين مع الحفاظ على السجل التاريخي الكامل.":"Manage partners and employees while preserving the complete historical record.",
    "نظام الصلاحيات":"Permission System","المالك يستطيع الإضافة والتعديل والتعطيل والاستعادة. الشريك لا يستطيع حذف نفسه أو شريكًا آخر، والموظف لا يدير أعضاء الفريق.":"The owner can add, edit, disable, and restore members. Partners cannot delete themselves or other partners, and employees cannot manage team members.",
    "الاسم الكامل":"Full Name","رقم الهاتف":"Phone Number","البريد الإلكتروني":"Email","الدور":"Role","شريك":"Partner","موظف":"Employee","تاريخ الانضمام":"Join Date","نسبة الشراكة %":"Partnership %","إلغاء":"Cancel","حفظ":"Save",
    "أنشئ عرض سعر، راجعه، ثم حوّله إلى مشروع عند اعتماد العميل.":"Create a quote, review it, then convert it to a project when approved by the client.",
    "عرض سعر جديد":"New Quote","تابع الكميات المخططة والمنفذة والمتبقية وسعر الوحدة.":"Track planned, executed, and remaining quantities and unit prices.","بند عمل":"Work Item","المنفذ":"Executed","المتبقي":"Remaining","الوحدة":"Unit",
    "بيانات الموردين والمشتريات والمدفوعات والمبالغ المتبقية.":"Supplier, purchase, payment, and outstanding balance data.","مورد جديد":"New Supplier",
    "راقب الكميات وحدود إعادة الطلب ومواقع التخزين.":"Monitor quantities, reorder thresholds, and storage locations.","إضافة حركة":"Add Movement",
    "اعرف المستحق والمدفوع والمتبقي لكل شخص.":"See what is due, paid, and remaining for each person.","طريقة الحساب":"Payment Basis","المستحق":"Due","المدفوع":"Paid","آخر دفعة":"Last Payment",
    "المشاريع المؤرشفة والمحذوفة تظل قابلة للمراجعة، والسجل المالي لا يُفقد.":"Archived and deleted projects remain reviewable, and the financial ledger is never lost.",
    "المشاريع المؤرشفة":"Archived Projects","للمراجعة والرجوع عند الحاجة":"For review and restoration when needed","سلة المحذوفات":"Trash","حذف تشغيلي مع الاحتفاظ بالسجل المالي":"Operational deletion while preserving the financial ledger",
    "كل تعديل مهم وتنبيه يحتاج متابعة في مكان واحد.":"Every important change and alert that needs attention in one place.",
    "آخر النشاطات":"Recent Activity","من قام بماذا ومتى":"Who did what and when","التنبيهات":"Alerts","مواعيد ومشاكل ومخزون":"Deadlines, issues, and inventory",
    "إعدادات النظام الأساسية.":"Core system settings.","الوضع الداكن":"Dark Mode","مظهر مناسب للعمل الطويل":"A comfortable appearance for long work sessions",
    "لغة النظام":"System Language","العربية / English":"Arabic / English","تغيير اللغة":"Change Language","النسخ الاحتياطي":"Backup","البيانات محفوظة تلقائيًا":"Data is saved automatically","قريبًا":"Coming Soon",
    "المشروع ما زال موجودًا":"Project still exists","السجل المالي محفوظ مستقلًا عن المشروع":"Financial ledger preserved independently of the project",
    "صافي الوضع الحالي":"Current Net Position","المحصّل − التكاليف":"Collected − Costs","مستحق من العملاء":"Receivable from Clients","قابل للتحصيل":"Collectible",
    "مشاريع تحتاج متابعة":"Projects Needing Attention","قريبة من التسليم":"Near Delivery","مخزون منخفض":"Low Inventory","يحتاج إعادة طلب":"Needs Reorder",
    "متوفر":"Available","الحد الأدنى:":"Minimum:","لا يوجد أرشيف.":"No archive.",
    "سلة المحذوفات فارغة.":"Trash is empty.","عرض التفاصيل":"View Details","التفاصيل":"Details","تعديل المشروع":"Edit Project","أرشفة":"Archive",
    "لا توجد مشاريع مطابقة للبحث.":"No projects match your search.",
    "تفاصيل المشروع الكاملة":"Full Project Details","العميل":"Client","العنوان":"Address","مسؤول المشتريات":"Purchasing Manager",
    "البداية":"Start","التسليم المتوقع":"Expected Delivery","وصف المشروع":"Project Description","لا يوجد وصف مضاف.":"No description added.",
    "حالة المشروع":"Project Status","إغلاق":"Close","حفظ التحديث":"Save Update","كل البيانات قابلة للتعديل، ومدير الشركة اختياري.":"All data can be edited, and the company manager is optional.",
    "اسم المشروع":"Project Name","اسم العميل":"Client Name","اسم الشركة":"Company Name","اسم مدير الشركة":"Company Manager Name","اختياري)":"Optional)",
    "عنوان المشروع":"Project Address","تاريخ البداية":"Start Date","موعد التسليم المتوقع":"Expected Delivery Date",
    "إنشاء المشروع":"Create Project","حفظ تعديلات المشروع":"Save Project Changes","مشروع بدون اسم":"Unnamed Project",
    "تم إنشاء المشروع بنجاح":"Project created successfully","تم حفظ تعديلات المشروع بنجاح":"Project changes saved successfully","تم تحديث حالة المشروع":"Project status updated",
    "تمت أرشفة المشروع — البيانات المالية محفوظة":"Project archived — financial data preserved","تمت استعادة المشروع":"Project restored",
    "حذف مشروع":"Delete Project","سيختفي المشروع من التشغيل، لكن":"The project will disappear from operations, but","التكاليف والربح التقديري والسجل المالي لن يتم حذفها":"costs, estimated profit, and the financial ledger will not be deleted",
    "نقل إلى سلة المحذوفات":"Move to Trash","تم حذف المشروع من التشغيل مع الاحتفاظ بالسجل المالي":"Project removed from operations while preserving the financial ledger",
    "تفاصيل المصروف كاملة":"Full Expense Details","المورد / المستفيد":"Supplier / Beneficiary","رقم الفاتورة":"Invoice Number","غير موجود":"Not available","لا توجد ملاحظات":"No notes",
    "ملف المورد":"Supplier Profile","الهاتف":"Phone","التخصص":"Specialty","الرصيد المتبقي":"Remaining Balance",
    "بيانات العمالة":"Labor Details","السعر":"Rate","تفاصيل الخامة":"Material Details","اعمل":"Work","أعمال":"Works",
    "رؤية":"Roya","تامر صلاح":"Tamer Salah","تامر صلاح قرني":"Tamer Salah",
    "مفيش نتيجة مطابقة. جرّب اسم المشروع، الشركة، العميل، المصروف أو حتى كلمة بالعامية.":"No matching result. Try a project, company, client, expense, or colloquial keyword.",
    "تمت الإضافة بنجاح — تم حفظ البيانات":"Added successfully — data saved",
     "حذف نهائي":"Delete Permanently","حذف":"Delete","تم الحذف نهائيًا من سلة المحذوفات":"Permanently deleted from Trash","تم حذف عنصر المخزون":"Inventory item deleted","تم حذف سجل النشاط":"Activity record deleted","تم حذف سجل النشاط بالكامل":"Activity log cleared","لا يوجد مخزون.":"No inventory.","لا يوجد نشاط.":"No activity.","سلة المحذوفات فارغة.":"Trash is empty."
  };

  // Dynamic phrase translations that intentionally preserve user-entered names.
  const PHRASES = [
    ["تم تحديث حالة","Status updated for"],
    ["إلى","to"],
    ["تم حذفه ونقله إلى الأرشيف","Deleted and moved to Archive"],
    ["تمت استعادة","Restored"],
    ["تم تعديل حالة مشروع","Project status updated for"],
    ["تم تسجيل مصروف جديد","New expense recorded"],
    ["تمت إضافة توريد حديد","Steel supply added"],
    ["تمت أرشفة","Archived"],
    ["تم إنشاء مشروع","Created project"],
    ["تم تعديل بيانات","Updated data for"],
    ["تم نقل","Moved"],
    ["إلى سلة المحذوفات","to Trash"],
    ["تم حذف","Deleted"],
    ["ونقله إلى الأرشيف","and moved to Archive"],
    ["تمت استعادة","Restored"],
    ["مخزون الأسمنت أقل من الحد الأدنى","Cement stock is below minimum"],
    ["يقترب من موعد التسليم","is approaching its delivery date"],
    ["دفعة عميل مستحقة","Client payment due"],
    ["مشكلة توريد مفتوحة","Open supply issue"],
    ["متبقي","Remaining"],
    ["منذ ساعة","an hour ago"],
    ["منذ 18 دقيقة","18 minutes ago"],
    ["اليوم","Today"],
    ["أمس","Yesterday"],
    ["الآن","Now"],
    ["شركة:","Company:"],["مشروع:","Project:"],["مصروف:","Expense:"],["عامل:","Worker:"],
    ["خامات:","Materials:"],["مدير:","Manager:"],["عميل:","Client:"],["مورد:","Supplier:"],["ربح:","Profit:"],["دفعة:","Payment:"],
    ["بدون شركة","No Company"],["غير محددة","Not Specified"],["مدير الشركة","Company Manager"],["غير محدد","Not Specified"],
    ["قيمة العقد","Contract Value"],["مسؤول شراء الخامات","Materials Purchasing Manager"],["نسبة الإنجاز","Progress"]
  ];

  const EXTRA = {
    "إضافة مشروع جديد":"Add New Project",
    "أدخل بيانات المشروع. مدير الشركة اختياري.":"Enter the project details. The company manager is optional.",
    "إضافة مشتريات":"Add Purchase","إضافة عامل":"Add Worker",
    "تسجيل مصروف مفصل":"Record Detailed Expense","تسجيل دفعة عميل":"Record Client Payment",
    "إضافة شخص للفريق":"Add Team Member","عرض سعر جديد":"New Quote",
    "إضافة بند أعمال":"Add Work Item","مورد جديد":"New Supplier",
    "حركة مخزون":"Inventory Movement","تسجيل مستحق/دفعة عامل":"Record Worker Payable / Payment",
    "هذه البيانات محفوظة ومتزامنة عبر Firebase.":"These data are saved and synchronized through Firebase.",
    "اسم العامل":"Worker Name","طريقة الدفع":"Payment Method","السعر":"Rate",
    "اسم الخامة":"Material Name","اسم المسؤول":"Responsible Person",
    "اسم الشخص أو الشركة":"Person or Company Name","اختياري":"Optional",
    "اكتب تفاصيل المصروف كاملة...":"Enter the complete expense details...",
    "أي ملاحظة إضافية":"Any additional note","تفاصيل الدفعة":"Payment details",
    "اسم الشخص":"Person Name","المسمى الوظيفي":"Job Title",
    "مثال: المشاريع + المصروفات":"Example: Projects + Expenses",
    "اسم الشخص أو الجهة":"Person or Organization","شركة التوريدات":"Supply Company",
    "أسمنت / حديد / تشطيبات":"Cement / Steel / Finishing",
    "المخزن الرئيسي":"Main Storage","م² / م³ / قطعة":"m² / m³ / Piece",
    "بالمتر / يومية / مقطوعية / أخرى":"Per Meter / Daily / Fixed / Other",
    "بالمتر / يومية / مقطوعية":"Per Meter / Daily / Fixed",
    "الأعضاء الذين تم حذفهم من الفريق النشط. سجلاتهم التاريخية تظل محفوظة.":"Members removed from the active team. Their historical records remain preserved.",
    "الأشخاص المحذوفون من الفريق النشط. سجلاتهم التاريخية تظل محفوظة.":"Members removed from the active team. Their historical records remain preserved.",
    "المالك • صلاحيات كاملة":"Owner • Full Access",
    "إدارة كاملة للنظام والفريق":"Full control of the system and team",
    "حذف العضو ينقله إلى الأرشيف ولا يحذف تاريخه.":"Deleting a member moves them to the archive without deleting their history.",
    "المشاريع + المصروفات":"Projects + Expenses","المواد والمشتريات":"Materials + Purchases",
    "مسؤول مشتريات":"Purchasing Manager","لا يوجد أعضاء نشطون.":"No active team members."
  };
  // Demo/seed content is part of the shipped UI, so it must also be localized.
  // User-entered data is intentionally not translated.
  Object.assign(AR_EN, {
    "بدون شركة":"No Company","غير محددة":"Not Specified","مدير الشركة":"Company Manager","غير محدد":"Not Specified","الشركة":"Company","التفاصيل":"Details",
    "طباعة":"Print","طباعة / PDF":"Print / PDF","مالك":"Owner","المالك":"Owner","شريك":"Partner","شركاء":"Partners","موظف":"Employee","موظفون":"Employees","مسؤول مشتريات":"Purchasing Manager","مسؤول":"Responsible","مدير":"Manager","عامل":"Worker","عمالة":"Labor","مقاول":"Contractor","مورد":"Supplier","عميل":"Client","عضو":"Member","نشط":"Active","معطل":"Disabled","مؤرشف":"Archived","محذوف":"Deleted","قيد التنفيذ":"In Progress","منتهي":"Completed","على وشك البدء":"Starting Soon","على وشك الانتهاء":"Finishing Soon","معتمد":"Approved","مرفوض":"Rejected","قيد المراجعة":"Under Review","مدفوع":"Paid","مسودة":"Draft","منخفض":"Low","جيد":"Good","متبقي":"Remaining","يحتاج إعادة طلب":"Needs Reorder","متوفر":"Available","خامة":"Material","مستخلص":"Extract","مستخلص أعمال":"Works Extract",
    "محذوف من الفريق":"Removed from Team","استعادة":"Restore","لا يوجد أعضاء نشطون.":"No active team members.","المشروع ما زال موجودًا":"Project still exists","السجل المالي محفوظ مستقلًا عن المشروع":"Financial ledger preserved independently of the project",
    "نقدي":"Cash","متبقي":"Remaining","يحتاج إعادة طلب":"Needs Reorder","متوفر":"Available","مستخلص":"Extract","مستخلص بدون عنوان":"Untitled Extract","بدون مشروع":"No Project","بدون عميل":"No Client","لم تتم كتابة محتوى بعد.":"No content has been written yet.",
    "عرض المستخلص":"View Extract","تعديل":"Edit","حالة المستخلص":"Extract Status","اختر المشروع":"Select Project","اسم الشركة":"Company Name","اسم العميل":"Client Name","تاريخ المستخلص":"Extract Date","عنوان المستخلص":"Extract Title","رقم المستخلص":"Extract Number",
    "محرر المستخلص":"Extract Editor","اكتب المستخلص هنا كما لو أنك تكتبه في Word.":"Write the extract here as if you were writing it in Word.","جاهز للكتابة":"Ready to write","تراجع":"Undo","إعادة":"Redo","نمط النص":"Text Style","نص عادي":"Normal Text","عنوان كبير جدًا":"Very Large Heading","عنوان كبير":"Large Heading","عريض":"Bold","مائل":"Italic","محاذاة يمين":"Align Right","محاذاة وسط":"Align Center","محاذاة يسار":"Align Left","قائمة نقطية":"Bulleted List","قائمة مرقمة":"Numbered List","ابدأ بكتابة المستخلص هنا...":"Start writing the extract here...","كلمة":"words","حرف":"characters","يتم الحفظ عند الضغط على حفظ المستخلص":"Saved when you click Save Extract",
    "كتابة مستخلص جديد":"Write New Extract","تعديل المستخلص":"Edit Extract","المستخلص عبارة عن مستند نصي كامل، والحالة يحددها والدك بنفسه.":"The extract is a complete text document, and its status is set by your father.","حفظ المستخلص":"Save Extract",
    "إضافة مشروع جديد":"Add New Project","أدخل بيانات المشروع. مدير الشركة اختياري.":"Enter the project details. The company manager is optional.","إلغاء":"Cancel","حفظ":"Save","حفظ التعديلات":"Save Changes","تعديل بيانات العضو":"Edit Member Details","تعديل بيانات":"Edit data for","الدور":"Role","الصلاحيات":"Permissions","المسمى الوظيفي":"Job Title","حفظ التعديلات":"Save Changes",
    "هل أنت متأكد من حذف":"Are you sure you want to delete","سيتم نقله إلى الأرشيف، ولن يتم حذف سجلاته التاريخية.":"It will be moved to the archive, and its historical records will not be deleted.","تم حذفه ونقله إلى الأرشيف":"Deleted and moved to Archive","تمت استعادة":"Restored",
    "تم تحديث حالة":"Status updated for","إلى":"to","مفيش نتيجة مطابقة. جرّب اسم المشروع، الشركة، العميل، المصروف أو حتى كلمة بالعامية.":"No matching result. Try a project, company, client, expense, or even a colloquial keyword.",
    "⚠ ":"⚠ ","كلمة تحتاج مراجعة":"words need review","مراجعة يدوية":"Manual Review","مستخلص أعمال":"Works Extract","مستخلص بدون عنوان":"Untitled Extract","نعم":"Yes","لا":"No",
    "فيلا النخيل":"Al Nakheel Villa","محمود السيد":"Mahmoud El Sayed","أحمد المدير":"Ahmed El Manager","أحمد حسن":"Ahmed Hassan",
    "التجمع الخامس":"Fifth Settlement","أعمال التشطيبات الداخلية والخارجية":"Interior and Exterior Finishing Works","مبنى الروضة":"Al Rawda Building","شركة الروضة":"Al Rawda Company",
    "محمود علي":"Mahmoud Ali","مدينة نصر":"Nasr City","أعمال خرسانة وهيكل إنشائي":"Concrete and Structural Works","عيادة سيتي":"City Clinic","شركة سيتي":"City Company","سارة محمد":"Sara Mohamed","الشيخ زايد":"Sheikh Zayed","تجهيز وتشطيب كامل":"Complete Preparation and Finishing",
    "منزل أكتوبر":"October House","حسام عادل":"Hossam Adel","محمد سامي":"Mohamed Sami","6 أكتوبر":"6th of October","تشطيبات سكنية":"Residential Finishing","مكتب الأعمال":"Business Office","شركة أركان":"Arkan Company","ياسر علي":"Yasser Ali","حسن أحمد":"Hassan Ahmed","المعادي":"Maadi","تجهيز إداري":"Office Preparation","فيلا النور":"Al Noor Villa","ياسر كامل":"Yasser Kamel","علي محمود":"Ali Mahmoud","العين السخنة":"Ain Sokhna","أعمال تشطيب":"Finishing Works",
    "أسمنت مقاوم":"Resistant Cement","خامات":"Materials","مورد النخيل":"Al Nakheel Supplier","تحويل":"Transfer","120 شيكارة — أمر شراء #104":"120 Bags — Purchase Order #104","توريد عاجل":"Urgent Supply","نقل حديد":"Steel Transport","نقل":"Transport","شركة نقل مصر":"Egypt Transport Company","نقدي":"Cash","نقل 3.2 طن إلى الموقع":"Transport 3.2 Tons to Site",
    "دفعة عمالة":"Labor Payment","عمالة":"Labor","فريق التشطيبات":"Finishing Team","دفعة أسبوعية":"Weekly Payment","كهرباء موقع":"Site Electricity","تشغيل":"Operations","شركة الكهرباء":"Electricity Company","فاتورة الموقع":"Site Invoice","120 شيكارة":"120 Bags","حديد تسليح 16مم":"16mm Reinforcement Steel","3.2 طن":"3.2 Tons","سيراميك أرضيات":"Floor Tiles","180 م²":"180 m²","فني تشطيبات":"Finishing Technician","بالمتر":"Per Meter","45 ج.م / م²":"EGP 45 / m²","محمد علي":"Mohamed Ali","نجار مسلح":"Formwork Carpenter","يومية":"Daily","650 ج.م / يوم":"EGP 650 / Day","سعيد محمود":"Saeed Mahmoud","كهربائي":"Electrician","مقطوعية":"Fixed Price","حسب الاتفاق":"As Agreed","دفعة تعاقدية":"Contract Payment","شيك":"Cheque","دفعة أولى":"First Payment","تسوية نهائية":"Final Settlement",
    "مستخلص أعمال التشطيبات والواجهات":"Finishing and Facade Works Extract",
    "مستخلص الهيكل والأعمال الخرسانية":"Structural and Concrete Works Extract",
    "م. أحمد":"Eng. Ahmed",
    "عرض فيلا النخيل":"Al Nakheel Villa Quote","عرض مبنى تجاري":"Commercial Building Quote","محارة داخلية":"Internal Plaster","م²":"m²","خرسانة مسلحة":"Reinforced Concrete","م³":"m³","أرضيات":"Flooring","النخيل للتوريدات":"Al Nakheel Supplies","أسمنت وحديد":"Cement and Steel","شيكارة":"Bag","مخزن التجمع":"Settlement Warehouse","منخفض":"Low","حديد 16مم":"16mm Steel","طن":"Ton","مخزن مدينة نصر":"Nasr City Warehouse","جيد":"Good","مخزن الشيخ زايد":"Sheikh Zayed Warehouse","مشروع قديم":"Old Project","شركة النور":"Al Noor Company",
    "تم تعديل حالة مشروع فيلا النخيل":"Al Nakheel Villa status updated","منذ 18 دقيقة":"18 minutes ago","تم تسجيل مصروف 25,200 ج.م":"Expense of EGP 25,200 recorded","منذ ساعة":"an hour ago","تمت إضافة توريد حديد":"Steel supply added","اليوم 10:22 ص":"Today 10:22 AM","تم أرشفة عيادة سيتي":"City Clinic archived","أمس":"Yesterday","مخزون الأسمنت أقل من الحد الأدنى":"Cement stock is below minimum","85 من 100 شيكارة":"85 of 100 bags","مكتب الأعمال يقترب من موعد التسليم":"Business Office is approaching its delivery date","متبقي 18 يومًا":"18 days remaining","دفعة عميل مستحقة":"Client payment due","100,000 ج.م — فيلا النخيل":"EGP 100,000 — Al Nakheel Villa","مشكلة توريد مفتوحة":"Open supply issue","تأخر مورد الحديد — مبنى الروضة":"Steel supplier delay — Al Rawda Building",
    " ج.م":" EGP",
    "<h1>مستخلص أعمال التشطيبات والواجهات</h1><p>تم تنفيذ أعمال التشطيبات والواجهات بالمشروع وفقًا لما تم اعتماده، ويعرض هذا المستخلص وصف الأعمال المنفذة وملاحظات الموقع خلال الفترة الحالية.</p><h2>أعمال تم تنفيذها</h2><p>تم الانتهاء من أعمال المحارة الداخلية وأعمال الدهانات وتجهيز الواجهات، مع مراجعة جودة التنفيذ بالموقع.</p><p>ملاحظات: تمت مراجعة الأعمال المنفذة مع فريق الموقع والالتزام بالتعليمات الفنية المعتمدة.</p>":"<h1>Finishing and Facade Works Extract</h1><p>The project's finishing and facade works were completed according to the approved scope. This extract presents the completed work and current site notes.</p><h2>Completed Works</h2><p>Internal plastering, painting, and facade preparation have been completed, with execution quality reviewed on site.</p><p>Notes: The completed works were reviewed with the site team in accordance with the approved technical instructions.</p>",
    "<h1>مستخلص الهيكل والأعمال الخرسانية</h1><p>يتضمن هذا المستخلص تقريرًا عن الأعمال الخرسانية والهيكلية التي تم تنفيذها بالمشروع، مع توضيح حالة التنفيذ والملاحظات الحالية.</p><h2>حالة الأعمال</h2><p>تم تنفيذ الأعمال طبقًا للبرنامج المعتمد، وما زالت بعض الأعمال تحت المراجعة قبل اعتماد المرحلة التالية.</p>":"<h1>Structural and Concrete Works Extract</h1><p>This extract reports on the concrete and structural works completed on the project, including the current execution status and notes.</p><h2>Work Status</h2><p>The works were completed according to the approved schedule, while some items remain under review before the next stage is approved.</p>"
  });
  Object.assign(AR_EN, EXTRA);
  const EN_AR = Object.fromEntries(Object.entries(AR_EN).map(([a,e]) => [e,a]));
  const EN_PHRASES = PHRASES.map(([a,e]) => [e,a]);

  // Translate complete text nodes AND mixed/dynamic phrases.
  // The previous implementation only translated when the entire text node
  // exactly matched a dictionary key, so strings such as "Company: Heavy Rock"
  // or generated activity messages could remain partially untranslated.
  function translateString(value) {
    if (typeof value !== "string" || !value.trim()) return value;

    const pairs = state.lang === "ar"
      ? [...EN_PHRASES, ...Object.entries(EN_AR)]
      : [...PHRASES, ...Object.entries(AR_EN)];

    // Longest-first prevents a short key (e.g. "Project") from consuming
    // part of a more specific phrase before it can be translated.
    pairs.sort((a,b) => b[0].length - a[0].length);

    let out = value;
    for (const [from, to] of pairs) {
      if (from && out.includes(from)) out = out.split(from).join(to);
    }
    return out;
  }

  function toEnglishDigits(value){
    return String(value).replace(/[٠-٩۰-۹]/g, ch => {
      const code=ch.charCodeAt(0);
      if(code>=0x0660 && code<=0x0669) return String(code-0x0660);
      if(code>=0x06F0 && code<=0x06F9) return String(code-0x06F0);
      return ch;
    });
  }

  function toArabicDigits(value){
    return String(value).replace(/[0-9]/g, ch => String.fromCharCode(0x0660 + Number(ch)));
  }

  function localizeDigits(value){
    return state.lang==='en' ? toEnglishDigits(value) : value;
  }

  function translateDOM() {
    const root = document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      if (!node.nodeValue.trim()) return;
      // Don't translate editable/user-entered content or code-like areas.
      if (node.parentElement?.closest("script,style,[contenteditable='true'],input,textarea,.extract-document-preview,.document-paper,[data-no-translate]")) return;
      const translated = localizeDigits(translateString(node.nodeValue));
      if (translated !== node.nodeValue) node.nodeValue = translated;
    });

    $$("input,textarea").forEach(el => {
      ["placeholder","aria-label","title"].forEach(attr => {
        if (el.hasAttribute(attr)) {
          const v = el.getAttribute(attr);
          el.setAttribute(attr, localizeDigits(translateString(v)));
        }
      });
    });
    $$("option").forEach(el => {
      if (el.hasAttribute("data-no-translate")) return;
      el.textContent = localizeDigits(translateString(el.textContent));
    });
    document.title = state.lang === "ar" ? "Roya — إدارة أعمال المقاولات" : "Roya — Construction Management";
  }

  // Replace owner labels in generated activity data and ensure the current owner identity is stable.
  state.activities = state.activities.map(a => a.map((v,i) => i===0 && (v==="م. محمد" || v==="تامر صلاح قرني") ? (state.lang==="en"?"Tamer Salah":"تامر صلاح") : v));

  const oldApplyLang = applyLang;
  applyLang = function(){
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    const btn = $("#langBtn");
    if (btn) btn.textContent = state.lang === "ar" ? "EN" : "AR";
    updateTitle();
    translateDOM();
  };

  const oldRenderAll = renderAll;
  renderAll = function(){
    oldRenderAll();
    translateDOM();
    enforceOwnerName();
    translateDOM();
  };

  // Ensure the owner's visible identity is Tamer Salah everywhere in the DOM.
  function enforceOwnerName() {
    // Owner identity is intentionally generic; no personal seed data is stored.
  }

  // First pass: Arabic by default, then full English when requested.
  translateDOM();
  enforceOwnerName();
  window.RoyaI18n = { translateDOM, enforceOwnerName, translateString };
})();

applyTheme();applyLang();setupSearch();renderAll();


/* RoyaDataBridge: exposes the complete business state for Firebase persistence. */
window.RoyaApp = {
  serializeState() {
    const data = JSON.parse(JSON.stringify(state));
    // Keep language/theme local to each device; business data is shared.
    delete data.lang;
    delete data.dark;
    return data;
  },
  restoreState(data) {
    if (!data || typeof data !== 'object') return;
    const currentLang = state.lang;
    const currentDark = state.dark;
    const defaults = {
      projects:[], expenses:[], materials:[], workers:[], payments:[], ledger:[],
      extracts:[], team:[], teamArchive:[], quotes:[], workitems:[], suppliers:[],
      inventory:[], dues:[], deleted:[], activities:[], alerts:[]
    };
    // Firebase collection names are mapped to the application's state keys.
    if (Array.isArray(data.workItems) && !Array.isArray(data.workitems)) data.workitems = data.workItems;
    Object.keys(defaults).forEach(key => {
      state[key] = Array.isArray(data[key]) ? data[key] : defaults[key];
      if(key==='payments') state.payments=state.payments.map(normalizePaymentRow);
      if(key==='team') state.team=state.team.map(t=>Array.isArray(t)?[t[0]??'',t[1]??'',t[2]??'',t[3]??'',Boolean(t[4])]:t);
    });
    state.lang = currentLang;
    state.dark = currentDark;
    applyTheme();
    applyLang();
    renderAll();
  },
  refresh() {
    applyTheme();
    applyLang();
    renderAll();
  }
};


/* RoyaRuntimeGuard: prevent one optional UI error from breaking the whole shell. */
window.RoyaRuntimeGuard = true;
window.addEventListener('error', function (event) {
  console.warn('Roya UI error:', event.message);
});


