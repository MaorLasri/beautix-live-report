(() => {
  const cfg=window.BEAUTIX_CONFIG;
  const remember=localStorage.getItem('beautix-remember-device')==='true';
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,storage:remember?localStorage:sessionStorage,autoRefreshToken:true}});
  let payload=null;
  const $=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS'}).format(Number(n||0));
  const pad=n=>String(n).padStart(2,'0');
  const localIso=v=>{const d=v instanceof Date?v:new Date(v);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`};
  const dateOnly=v=>localIso(v).slice(0,10);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readSheet=(wb,name)=>XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:null,raw:true});
  const findBook=(books,prefix)=>Object.entries(books).find(([name])=>name.toLowerCase().startsWith(prefix.toLowerCase())&&name.endsWith('.xlsx'))?.[1];
  function parsePayments(text,doc){
    if(!text) return [];
    return String(text).split(',').map((part,i)=>{
      const m=part.trim().match(/^(.*?)\s*\(([-\d.,]+)\)$/); if(!m) return null;
      const label=m[1].trim(), amount=Number(m[2].replace(/,/g,''));
      let method='other',provider=label;
      if(label.includes('אשראי')) method='credit_card'; else if(label.includes('מזומן')) method='cash'; else if(label.includes('צ')) method='check'; else if(label.toLowerCase().includes('bit')||label.includes('ביט')) method='bit'; else if(label.toLowerCase().includes('paybox')) method='paybox';
      return {document_number:doc,payment_method:method,payment_provider:provider,amount,cheque_number:null,source_reference:`easybusy_daily_zip:${doc}:payment:${i+1}:${method}:${amount}`,metadata:{label,import_source:'daily_zip'}};
    }).filter(Boolean);
  }
  async function status(){
    const {data,error}=await client.rpc('get_easybusy_import_status_v1');
    if(error){$('latest-note').textContent='לא ניתן לקרוא את מצב הייבוא: '+error.message;return;}
    const full=data.latest_complete_date?new Date(data.latest_complete_date+'T12:00:00').toLocaleDateString('he-IL'):'אין עדיין יום מלא';
    const latest=data.latest_record_date?new Date(data.latest_record_date+'T12:00:00').toLocaleDateString('he-IL'):'אין נתונים';
    $('latest-note').textContent=`היום המלא האחרון במערכת: ${full}. התאריך העדכני ביותר שקיים: ${latest}${data.today_rows?` (${data.today_rows} רשומות מהיום, ייתכן שהיום עדיין חלקי)`:''}.`;
  }
  async function parseZip(file){
    const zip=await JSZip.loadAsync(file), books={};
    for(const [name,entry] of Object.entries(zip.files)) if(!entry.dir&&name.toLowerCase().endsWith('.xlsx')) books[name]=XLSX.read(await entry.async('arraybuffer'),{type:'array',cellDates:true});
    const inc=findBook(books,'Incomes_'), intake=findBook(books,'Intakes_'), zbook=findBook(books,'ZIndexes_');
    if(!inc||!intake||!zbook) throw new Error('ה-ZIP חייב להכיל קבצי Incomes, Intakes ו-ZIndexes');
    const incomes=readSheet(inc,'Incomes'), intakes=readSheet(intake,'Intakes'), zs=readSheet(zbook,'ZIndexes');
    const intakeMap=new Map(intakes.map(r=>[String(r.IntakeNumber),r]));
    const zByDate=new Map(zs.map(r=>[dateOnly(r.Date),r]));
    const sales=incomes.map(r=>{
      const doc=String(r.IncomeNumber), detail=intakeMap.get(doc)||{}, d=dateOnly(r.Date), z=zByDate.get(d)||{};
      return {transaction_datetime:localIso(r.Date),transaction_date:d,z_index:z.ZIndexNumber||null,invoice_number:doc,notes:r.Remarks||detail.Remarks||null,employee_name:null,customer_name:r.CustomerName||detail.CustomerName||null,payment_method:r.PaymentDescription||detail.PaymentDescription||null,amount:Number(r.TotalAmount||0),debt:0,easybusy_customer_id:r.CustomerId?String(r.CustomerId):null,identity_number:r.IdentifyNumber?String(r.IdentifyNumber):null,products_services:detail.Details||null,prepayment:0,source_reference:`easybusy_daily_zip:${doc}`,raw_data:{income_type:r.IncomeType,vat:Number(r.Vat||0),allocation_number:r.AllocationNumber||null,import_source:'daily_zip'}};
    });
    const payments=sales.flatMap(s=>parsePayments(s.payment_method,s.invoice_number));
    const days=zs.map(r=>({work_date:dateOnly(r.Date),sales:Number(r.TotalIncomes||0),receipts:Number(r.TotalIntakes||0),immediate_receipts:Number(r.TotalCash||0)+Number(r.TotalExternal||0)+Number(r.TotalCredit||0)+Number(r.TotalCheque||0),transaction_count:Number(r.SumOfActions||0),refunds:Number(r.TotalRefunds||0),source_reference:`easybusy_daily_zip:z:${r.ZIndexNumber}`,notes:`Z ${r.ZIndexNumber}; חובות ${Number(r.TotalDebts||0)}; מקדמות ${Number(r.TotalPrePayments||0)}`}));
    return {sales,payments,days};
  }
  function render(){
    const total=payload.sales.reduce((s,r)=>s+r.amount,0), debts=payload.days.reduce((s,r)=>{const m=r.notes.match(/חובות ([\d.-]+)/);return s+Number(m?.[1]||0)},0);
    $('summary').hidden=false;$('summary').innerHTML=`<article><span>מסמכים</span><strong>${payload.sales.length}</strong></article><article><span>רכיבי תשלום</span><strong>${payload.payments.length}</strong></article><article><span>ימי Z</span><strong>${payload.days.length}</strong></article><article><span>סה״כ הכנסות</span><strong>${money(total)}</strong></article><article><span>חובות בסיכומי Z</span><strong>${money(debts)}</strong></article>`;
    $('preview').hidden=false;$('preview-body').innerHTML=payload.sales.map(r=>`<tr><td>${esc(new Date(r.transaction_date+'T12:00:00').toLocaleDateString('he-IL'))}</td><td>${esc(r.invoice_number)}</td><td>${esc(r.customer_name)}</td><td>${money(r.amount)}</td><td>${esc(r.payment_method)}</td><td>${esc(r.products_services||'—')}</td></tr>`).join('');
    $('import-button').disabled=false;
  }
  $('choose-file').onclick=()=>$('zip-file').click();
  $('zip-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;$('file-name').textContent=file.name;$('import-status').textContent='קורא ומנתח את הקובץ…';try{payload=await parseZip(file);render();$('import-status').textContent='הקובץ נותח. יש לבדוק את התצוגה ולאשר ייבוא.';$('import-status').className='status ok';}catch(err){payload=null;$('import-button').disabled=true;$('import-status').textContent=err.message;$('import-status').className='status error';}};
  $('import-button').onclick=async()=>{if(!payload)return;$('import-button').disabled=true;$('import-status').textContent='מייבא למסד…';const {data,error}=await client.rpc('import_easybusy_daily_zip_v1',{p_payload:payload});if(error){$('import-status').textContent='הייבוא נכשל: '+error.message;$('import-status').className='status error';$('import-button').disabled=false;return;}$('import-status').textContent=`הייבוא הושלם: ${data.inserted_sales} מסמכים חדשים, ${data.updated_sales} מסמכים שעודכנו, ${data.inserted_payment_components} רכיבי תשלום חדשים ו-${data.updated_days} ימי Z.`;$('import-status').className='status ok';await status();};
  status();
})();