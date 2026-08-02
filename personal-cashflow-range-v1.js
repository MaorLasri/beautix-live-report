(() => {
  if (window.__beautixPersonalCashflowRangeV1) return;
  window.__beautixPersonalCashflowRangeV1 = true;
  const cfg = window.BEAUTIX_CONFIG;
  if (!cfg || !window.supabase) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  const money = v => new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:2}).format(Number(v||0));
  const esc = v => String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  function style(){if(document.getElementById('personal-cashflow-style-v1'))return;const s=document.createElement('style');s.id='personal-cashflow-style-v1';s.textContent='.personal-range-total{margin:12px 0 18px;padding:16px 18px;border:1px solid #eadcf2;border-radius:18px;background:#fbf7ff}.personal-range-total span{display:block;color:#7d6d8e}.personal-range-total strong{display:block;margin-top:6px;font-size:1.45rem;color:#7d3ca7}.personal-day-section{margin-top:14px}.personal-day-section h4{color:#7d3ca7}.personal-entry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:10px;border:1px solid #eadff0;border-radius:12px;background:#fcf9ff}.personal-entry small{display:block;color:#7d8795}';document.head.appendChild(s)}
  async function load(detail){
    const start=detail?.start,end=detail?.end;if(!start||!end)return;
    const {data,error}=await client.rpc('get_personal_cashflow_range_v1',{p_start:start,p_end:end});if(error){console.error(error);return}
    style();
    let total=document.getElementById('personal-range-total');
    if(!total){total=document.createElement('div');total.id='personal-range-total';total.className='personal-range-total';document.getElementById('cashflow-range-controls')?.insertAdjacentElement('afterend',total)}
    total.innerHTML=`<span>הוצאות אישיות בטווח המוצג</span><strong>${money(data?.personal_expenses)}</strong><small>מוצגות בתזרים בלבד ואינן נכללות בדוחות העסקיים</small>`;
    const byDate=new Map((data?.daily||[]).map(d=>[String(d.date).slice(0,10),d]));
    document.querySelectorAll('[data-day-card][data-cashflow-date]').forEach(card=>{
      card.querySelector('.personal-day-section')?.remove();
      const day=byDate.get(card.dataset.cashflowDate), entries=(day?.entries||[]).filter(x=>x.type==='expense');
      if(!entries.length)return;
      const body=card.querySelector('.day-body');if(!body)return;
      const section=document.createElement('section');section.className='personal-day-section';
      section.innerHTML=`<h4>הוצאות אישיות</h4><ul>${entries.map(x=>`<li class="personal-entry"><div><strong>${esc(x.description||'הוצאה אישית')}</strong><small>${esc(x.state==='actual'?'בפועל':'צפוי')}</small></div><strong>${money(x.amount)}</strong></li>`).join('')}</ul>`;
      body.appendChild(section);
      const count=card.querySelector('.summary-date small');if(count){const current=parseInt(count.textContent)||0;count.textContent=`${current+entries.length} תנועות`}
    });
  }
  window.addEventListener('beautix:cashflow-range-rendered',e=>setTimeout(()=>load(e.detail),150));
})();