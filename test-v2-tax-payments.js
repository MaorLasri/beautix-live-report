(() => {
  'use strict';
  const cfg=window.BEAUTIX_V2_CONFIG;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:2}).format(Number(v||0));
  const dateText=v=>v?new Intl.DateTimeFormat('he-IL').format(new Date(`${String(v).slice(0,10)}T12:00:00`)):'—';
  const pad=n=>String(n).padStart(2,'0');
  const monthPeriod=()=>{const d=new Date();return{start:`${d.getFullYear()}-${pad(d.getMonth()+1)}-01`,end:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(new Date(d.getFullYear(),d.getMonth()+1,0).getDate())}`}};
  let period=monthPeriod();
  let report=null;

  function inject(){
    const form=$('tax-form');
    if(!form||$('tax-vat-expense-share'))return false;
    const notes=$('tax-notes')?.closest('label');
    const label=document.createElement('label');
    label.innerHTML='שיעור הוצאות שנלקח לאומדן מע״מ תשומות<select id="tax-vat-expense-share"><option value="35">35% — שמרני מאוד</option><option value="40" selected>40% — ברירת מחדל</option><option value="45">45%</option><option value="50">50% — תקרה</option></select><small>האומדן מוגבל לשיעור זה מכלל ההוצאות, ולא כולל שכירות, תשלומי מדינה, מסים, שכר, ריבית, הלוואות, עמלות וביטוחים.</small>';
    notes?.insertAdjacentElement('beforebegin',label);

    const section=document.createElement('section');
    section.id='tax-payments-section';section.className='section';
    section.innerHTML='<div class="section-head"><div><h2>תשלומי מיסים</h2><p>יצירת תשלום מתוך החישוב ואישור לאחר ביצוע בפועל.</p></div></div><div id="tax-payment-actions" class="tax-payment-actions"></div><div id="tax-payment-list" class="tax-payment-list"><div class="tax-note">טוען תשלומים…</div></div><div id="tax-payment-feedback" class="tax-note"></div>';
    form.closest('.section')?.insertAdjacentElement('afterend',section);

    form.addEventListener('submit',saveSettings,true);
    return true;
  }

  async function loadReport(){
    if(!$('panel-taxes')||$('panel-taxes').hidden)return;
    const {data,error}=await client.rpc('get_test_v2_tax_report_v1',{p_start:period.start,p_end:period.end});
    if(error){const box=$('tax-payment-feedback');if(box)box.textContent=error.message;return}
    report=data||{};
    const share=$('tax-vat-expense-share');if(share)share.value=String(report.input_vat_expense_share_pct||40);
    renderPayments();
  }

  function renderPayments(){
    if(!report)return;
    const actions=$('tax-payment-actions'),list=$('tax-payment-list');if(!actions||!list)return;
    actions.innerHTML=`<button type="button" class="primary-btn" data-create-tax="vat" ${Number(report.vat_due_estimate||0)<=0?'disabled':''}>יצירת תשלום מע״מ · ${money(report.vat_due_estimate)}</button><button type="button" class="primary-btn" data-create-tax="income_tax" ${Number(report.income_tax_remaining||0)<=0?'disabled':''}>יצירת תשלום מס הכנסה · ${money(report.income_tax_remaining)}</button>`;
    actions.querySelectorAll('[data-create-tax]').forEach(btn=>btn.addEventListener('click',()=>createPayment(btn.dataset.createTax)));
    const rows=Array.isArray(report.payment_records)?report.payment_records:[];
    list.innerHTML=rows.length?rows.map(r=>`<article class="tax-payment-card ${r.status}"><div><b>${r.tax_type==='vat'?'מע״מ':'מס הכנסה'}</b><span>${dateText(report.period?.start)}–${dateText(report.period?.end)}</span></div><div><span>לתשלום</span><strong>${money(r.amount_due)}</strong></div><div><span>סטטוס</span><strong>${r.status==='paid'?'שולם':r.status==='planned'?'ממתין לתשלום':'בוטל'}</strong></div>${r.status==='paid'?`<div><span>שולם בפועל</span><strong>${money(r.amount_paid)} · ${dateText(r.paid_on)}</strong></div>`:`<div class="tax-payment-buttons"><button type="button" class="primary-btn" data-paid-id="${r.id}" data-due="${r.amount_due}">אישור ששולם</button><button type="button" class="secondary-btn" data-cancel-id="${r.id}">ביטול</button></div>`}</article>`).join(''):'<div class="tax-note">עדיין לא נוצרו תשלומי מס לתקופה זו.</div>';
    list.querySelectorAll('[data-paid-id]').forEach(b=>b.addEventListener('click',()=>markPaid(b.dataset.paidId,Number(b.dataset.due))));
    list.querySelectorAll('[data-cancel-id]').forEach(b=>b.addEventListener('click',()=>cancelPayment(b.dataset.cancelId)));
  }

  async function saveSettings(e){
    e.preventDefault();e.stopImmediatePropagation();
    const btn=e.submitter; if(btn)btn.disabled=true;
    const feedback=$('tax-feedback');
    const args={p_start:report?.period?.start||period.start,p_end:report?.period?.end||period.end,p_input_vat_actual:$('tax-input-vat').value===''?null:Number($('tax-input-vat').value),p_vat_paid:Number($('tax-vat-paid').value||0),p_income_tax_reserve_rate:Number($('tax-income-rate').value||20),p_income_tax_paid:Number($('tax-income-paid').value||0),p_notes:$('tax-notes').value.trim()||null,p_input_vat_expense_share_pct:Number($('tax-vat-expense-share').value||40)};
    const {error}=await client.rpc('save_test_v2_tax_period_v1',args);
    if(btn)btn.disabled=false;
    if(error){feedback.className='tax-note error';feedback.textContent=`השמירה נכשלה: ${error.message}`;return}
    feedback.className='tax-note';feedback.textContent='הגדרות המס נשמרו לתקופה המוצגת.';
    await loadReport();
    window.dispatchEvent(new CustomEvent('beautix-v2:period-change',{detail:{...period,source:'tax-settings-refresh'}}));
  }

  async function createPayment(type){
    if(!report)return;
    const amount=type==='vat'?Number(report.vat_due_estimate||0):Number(report.income_tax_remaining||0);
    const calculated=type==='vat'?Number(report.output_vat||0):Number(report.income_tax_estimate||0);
    if(amount<=0)return;
    const due=prompt('תאריך יעד לתשלום (YYYY-MM-DD), אפשר להשאיר ריק:','')||null;
    const {error}=await client.rpc('create_test_v2_tax_payment_v1',{p_start:report.period.start,p_end:report.period.end,p_tax_type:type,p_calculated_amount:calculated,p_amount_due:amount,p_due_date:due||null,p_notes:null});
    const box=$('tax-payment-feedback');
    if(error){box.className='tax-note error';box.textContent=error.message;return}
    box.className='tax-note';box.textContent='התשלום נוצר ונשמר כממתין לתשלום.';await loadReport();
  }

  async function markPaid(id,due){
    const amountRaw=prompt('מה הסכום ששולם בפועל?',String(due));if(amountRaw===null)return;
    const amount=Number(amountRaw);if(!Number.isFinite(amount)||amount<0)return alert('סכום לא תקין');
    const paidOn=prompt('תאריך התשלום (YYYY-MM-DD):',new Date().toISOString().slice(0,10));if(!paidOn)return;
    const {error}=await client.rpc('mark_test_v2_tax_payment_paid_v1',{p_id:id,p_amount_paid:amount,p_paid_on:paidOn,p_notes:null});
    if(error)return alert(error.message);
    await loadReport();window.dispatchEvent(new CustomEvent('beautix-v2:period-change',{detail:{...period,source:'tax-payment-paid'}}));
  }

  async function cancelPayment(id){
    if(!confirm('לבטל את רשומת התשלום? ההיסטוריה תישמר.'))return;
    const {error}=await client.rpc('cancel_test_v2_tax_payment_v1',{p_id:id});if(error)return alert(error.message);await loadReport();
  }

  window.addEventListener('beautix-v2:period-change',e=>{const d=e.detail||{};if(d.start&&d.end){period={start:d.start,end:d.end};setTimeout(loadReport,80)}});
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="taxes"]'))setTimeout(()=>{inject();loadReport()},180)},true);
  function init(){let tries=0;const timer=setInterval(()=>{tries++;if(inject()||tries>60){clearInterval(timer);if($('panel-taxes')&&!$('panel-taxes').hidden)loadReport()}},100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();