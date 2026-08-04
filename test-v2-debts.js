(() => {
  'use strict';
  const cfg = window.BEAUTIX_V2_CONFIG;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {auth:{persistSession:true,autoRefreshToken:true}});
  const $ = id => document.getElementById(id);
  const money = value => new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(value||0));
  const pct = value => `${Number(value||0).toLocaleString('he-IL',{maximumFractionDigits:2})}%`;
  const dateText = value => value ? new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : 'לא הוגדר';
  const esc = value => String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  let loaded = false;

  function renderShell(){
    const panel = $('panel-debts');
    if (!panel) return;
    panel.innerHTML = `<div class="hero debts-hero"><div><h2>חובות והלוואות</h2><p>יתרות פתוחות, החזרים חודשיים ומועדי תשלום ממקור האמת.</p></div><div class="quality-strip"><span id="debts-updated" class="quality-chip">עודכן: כעת</span><span class="quality-chip">מקור: v_open_loans</span><span id="debts-quality" class="quality-chip">בודק איכות נתונים…</span></div></div><div id="debts-summary" class="summary-grid"><article class="summary-card"><span>טוען</span><strong>—</strong><p>מחשב מצב חובות…</p></article></div><section class="section"><div class="section-head"><div><h2>כל החובות הפתוחים</h2><p>מסודרים מהיתרה הגבוהה לנמוכה.</p></div></div><div id="debts-list" class="debts-list"><div class="empty-state"><p>טוען חובות…</p></div></div></section>`;
  }

  function render(rows){
    const totalBalance = rows.reduce((s,r)=>s+Number(r.current_balance||0),0);
    const totalOriginal = rows.reduce((s,r)=>s+Number(r.original_amount||0),0);
    const monthly = rows.reduce((s,r)=>s+Number(r.monthly_payment||0),0);
    const estimated = rows.filter(r=>r.is_estimated).length;
    const today = new Date(); today.setHours(0,0,0,0);
    const overdue = rows.filter(r=>r.next_payment_date && new Date(`${r.next_payment_date}T00:00:00`) < today).length;
    const repaid = Math.max(0,totalOriginal-totalBalance);
    const repaidPct = totalOriginal ? Math.round(repaid/totalOriginal*100) : 0;

    $('debts-summary').innerHTML = `<article class="summary-card negative"><span>יתרת חוב כוללת</span><strong>${money(totalBalance)}</strong><p>${rows.length} חובות והלוואות פתוחים</p></article><article class="summary-card"><span>החזר חודשי כולל</span><strong>${money(monthly)}</strong><p>לפי ההחזרים הידועים במסד</p></article><article class="summary-card positive"><span>קרן שנפרעה</span><strong>${money(repaid)}</strong><p>${repaidPct}% מהסכום המקורי</p></article><article class="summary-card ${overdue?'negative':''}"><span>דורש בדיקה</span><strong>${overdue}</strong><p>${estimated} רשומות כוללות נתון משוער</p></article>`;
    $('debts-quality').textContent = estimated ? `${estimated} חובות עם נתון משוער` : 'כל הנתונים מסומנים כמאומתים';
    $('debts-quality').classList.toggle('warning',estimated>0);
    $('debts-updated').textContent = `עודכן: ${new Intl.DateTimeFormat('he-IL',{dateStyle:'short',timeStyle:'short'}).format(new Date())}`;

    $('debts-list').innerHTML = rows.length ? rows.map(row=>{
      const balance = Number(row.current_balance||0), original = Number(row.original_amount||0);
      const progress = original ? Math.max(0,Math.min(100,Math.round((original-balance)/original*100))) : 0;
      const paymentDate = row.next_payment_date ? new Date(`${row.next_payment_date}T00:00:00`) : null;
      const isOverdue = paymentDate && paymentDate < today;
      return `<article class="debt-card ${isOverdue?'overdue':''}"><div class="debt-card-head"><div><span class="debt-lender">${esc(row.lender_name||'מלווה לא ידוע')}</span><h3>${esc(row.name||'חוב')}</h3></div><div class="debt-balance"><span>יתרה</span><strong>${money(balance)}</strong></div></div><div class="debt-progress" aria-label="${progress}% נפרע"><i style="width:${progress}%"></i></div><div class="debt-stats"><div><span>סכום מקורי</span><b>${money(original)}</b></div><div><span>החזר חודשי</span><b>${money(row.monthly_payment)}</b></div><div><span>ריבית שנתית</span><b>${pct(row.annual_interest_rate)}</b></div><div><span>תשלום הבא</span><b class="${isOverdue?'danger-text':''}">${dateText(row.next_payment_date)}</b></div><div><span>סיום צפוי</span><b>${dateText(row.end_date)}</b></div><div><span>איכות נתון</span><b>${row.is_estimated?'משוער':'מאומת'}</b></div></div>${isOverdue?'<div class="debt-alert">מועד התשלום הרשום עבר — יש לאמת אם התשלום בוצע ולעדכן את היתרה.</div>':''}</article>`;
    }).join('') : '<div class="empty-state"><p>אין חובות פתוחים במקור הנתונים.</p></div>';
  }

  async function load(){
    if (loaded && !$('panel-debts')?.hidden) return;
    const {data,error} = await client.from('v_open_loans').select('*').order('current_balance',{ascending:false});
    if (error){$('debts-list').innerHTML=`<div class="empty-state"><p>לא ניתן לטעון חובות: ${esc(error.message)}</p></div>`;return;}
    loaded = true; render(data||[]);
  }

  function openTab(){
    document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='debts'));
    document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='panel-debts');
    $('page-heading').textContent='חובות';
    $('page-subheading').textContent='יתרות, החזרים ומועדי תשלום';
    $('app-view').classList.remove('cashflow-mode');
    $('sidebar')?.classList.remove('open');
    history.replaceState(null,'','#debts');
    load();
  }

  function init(){
    renderShell();
    document.addEventListener('click',e=>{const button=e.target.closest('[data-tab="debts"]');if(button){e.preventDefault();e.stopImmediatePropagation();openTab();}},true);
    if(location.hash==='#debts') setTimeout(openTab,50);
    client.auth.onAuthStateChange((_event,session)=>{if(session&&location.hash==='#debts')setTimeout(openTab,150)});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();