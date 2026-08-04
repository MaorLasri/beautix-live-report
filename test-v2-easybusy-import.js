(() => {
  'use strict';
  const cfg=window.BEAUTIX_V2_CONFIG;
  const statusBox=document.getElementById('import-status');
  if(!cfg||!window.supabase||!window.JSZip||!window.XLSX){statusBox.className='status error';statusBox.textContent='רכיב הייבוא לא נטען במלואו.';return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  let payload=null;
  const $=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS'}).format(Number(n||0));
  const pad=n=>String(n).padStart(2,'0');
  const localIso=v=>{const d=v instanceof Date?v:new Date(v);if(Number.isNaN(d.getTime()))return null;return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`};
  const dateOnly=v=>localIso(v)?.slice(0,10)||null;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readSheet=(wb,name)=>{const sheet=wb.Sheets[name]||wb.Sheets[wb.SheetNames[0]];return sheet?XLSX.utils.sheet_to_json(sheet,{defval:null,raw:true}):[]};
  const findBook=(books,prefix)=>Object.entries(books).find(([name])=>name.split('/').pop().toLowerCase().startsWith(prefix.toLowerCase())&&/\.xlsx?$/i.test(name))?.[1];
  function parsePayments(text,doc){
    if(!text)return[];
    return String(text).split(',').map((part,i)=>{
      const m=part.trim().match(/^(.*?)\s*\(([-\d.,]+)\)$/);if(!m)return null;
      const label=m[1].trim(),amount=Number(m[2].replace(/,/g,''));
      let method='other';
      if(label.includes('אשראי'))method='credit_card';else if(label.includes('מזומן'))method='cash';else if(label.includes('צ'))method='check';else if(label.toLowerCase().includes('bit')||label.includes('ביט'))method='bit';else if(label.toLowerCase().includes('paybox'))method='paybox';else if(label.includes('העברה'))method='bank_transfer';
      return {document_number:doc,payment_method:method,payment_provider:label,amount,cheque_number:null,source_reference:`easybusy_daily_zip:${doc}:payment:${i+1}:${method}:${amount}`,metadata:{label,import_source:'daily_zip'}};
    }).filter(x=>x&&x.amount>0)
  }
  async function parseZip(file){
    const zip=await JSZip.loadAsync(file),books={};
    for(const [name,entry] of Object.entries(zip.files))if(!entry.dir&&/\.xlsx?$/i.test(name))books[name]=XLSX.read(await entry.async('arraybuffer'),{type:'array',cellDates:true});
    const inc=findBook(books,'Incomes_')||findBook(books,'Incomes');
    const intake=findBook(books,'Intakes_')||findBook(books,'Intakes');
    const zbook=findBook(books,'ZIndexes_')||findBook(books,'ZIndexes');
    if(!inc||!intake||!zbook)throw new Error('ה־ZIP חייב להכיל קבצי Incomes, Intakes ו־ZIndexes בפורמט Excel');
    const incomes=readSheet(inc,'Incomes'),intakes=readSheet(intake,'Intakes'),zs=readSheet(zbook,'ZIndexes');
    const intakeMap=new Map(intakes.map(r=>[String(r.IntakeNumber??'').trim(),r]));
    const zByDate=new Map(zs.map(r=>[dateOnly(r.Date),r]));
    const sales=incomes.map(r=>{
      const doc=String(r.IncomeNumber??'').trim(),detail=intakeMap.get(doc)||{},d=dateOnly(r.Date),z=zByDate.get(d)||{};
      return {transaction_datetime:localIso(r.Date),transaction_date:d,z_index:z.ZIndexNumber||null,invoice_number:doc,notes:r.Remarks||detail.Remarks||null,employee_name:null,customer_name:r.CustomerName||detail.CustomerName||null,payment_method:r.PaymentDescription||detail.PaymentDescription||null,amount:Number(r.TotalAmount||0),debt:0,easybusy_customer_id:r.CustomerId?String(r.CustomerId):null,identity_number:r.IdentifyNumber?String(r.IdentifyNumber):null,products_services:detail.Details||null,prepayment:0,source_reference:`easybusy_daily_zip:${doc}`,raw_data:{income_type:r.IncomeType,vat:Number(r.Vat||0),allocation_number:r.AllocationNumber||null,import_source:'daily_zip'}};
    }).filter(r=>r.invoice_number&&r.transaction_date);
    const payments=sales.flatMap(s=>parsePayments(s.payment_method,s.invoice_number));
    const days=zs.map(r=>({work_date:dateOnly(r.Date),sales:Number(r.TotalIncomes||0),receipts:Number(r.TotalIntakes||0),immediate_receipts:Number(r.TotalCash||0)+Number(r.TotalExternal||0)+Number(r.TotalCredit||0)+Number(r.TotalCheque||0),transaction_count:Number(r.SumOfActions||0),refunds:Number(r.TotalRefunds||0),source_reference:`easybusy_daily_zip:z:${r.ZIndexNumber}`,notes:`Z ${r.ZIndexNumber}; חובות ${Number(r.TotalDebts||0)}; מקדמות ${Number(r.TotalPrePayments||0)}`})).filter(r=>r.work_date);
    if(!sales.length&&!days.length)throw new Error('לא נמצאו רשומות תקינות בדוחות');
    return {sales,payments,days};
  }
  function render(){
    const total=payload.sales.reduce((s,r)=>s+r.amount,0),debts=payload.days.reduce((s,r)=>{const m=String(r.notes||'').match(/חובות ([\d.-]+)/);return s+Number(m?.[1]||0)},0);
    $('summary').hidden=false;
    $('summary').innerHTML=`<article><span>מסמכים</span><strong>${payload.sales.length}</strong></article><article><span>רכיבי תשלום</span><strong>${payload.payments.length}</strong></article><article><span>ימי Z</span><strong>${payload.days.length}</strong></article><article><span>סה״כ הכנסות</span><strong>${money(total)}</strong></article><article><span>חובות בסיכומי Z</span><strong>${money(debts)}</strong></article>`;
    $('preview-wrap').hidden=false;
    $('preview-body').innerHTML=payload.sales.map(r=>`<tr><td>${esc(new Date(r.transaction_date+'T12:00:00').toLocaleDateString('he-IL'))}</td><td>${esc(r.invoice_number)}</td><td>${esc(r.customer_name)}</td><td>${money(r.amount)}</td><td>${esc(r.payment_method)}</td><td>${esc(r.products_services||'—')}</td></tr>`).join('');
    $('import-button').disabled=false;
  }
  $('zip-file').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    $('file-name').textContent=file.name;payload=null;$('import-button').disabled=true;$('summary').hidden=true;$('preview-wrap').hidden=true;statusBox.className='status';statusBox.textContent='קורא ומנתח את קובצי Excel…';
    try{payload=await parseZip(file);render();statusBox.className='status ok';statusBox.textContent='הקובץ נותח. יש לבדוק את התצוגה ולאשר ייבוא.'}
    catch(err){statusBox.className='status error';statusBox.textContent=err.message||String(err)}
  });
  $('import-button').addEventListener('click',async()=>{
    if(!payload)return;
    const btn=$('import-button');btn.disabled=true;statusBox.className='status';statusBox.textContent='מייבא ל־Supabase…';
    try{const{data,error}=await client.rpc('import_easybusy_daily_zip_v1',{p_payload:payload});if(error)throw error;statusBox.className='status ok';statusBox.textContent=`הייבוא הושלם: ${Number(data?.inserted_sales||0)} מסמכים חדשים, ${Number(data?.updated_sales||0)} מסמכים עודכנו, ${Number(data?.inserted_payment_components||0)} רכיבי תשלום חדשים ו־${Number(data?.updated_days||0)} ימי Z עודכנו.`;parent.postMessage({type:'beautix-v2-data-updated',source:'easybusy',result:data},location.origin)}catch(err){statusBox.className='status error';statusBox.textContent='הייבוא נכשל: '+(err.message||err);btn.disabled=false}
  });
})();