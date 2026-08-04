(() => {
  'use strict';
  const cfg=window.BEAUTIX_V2_CONFIG;
  const $=id=>document.getElementById(id);
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  let period=null,loading=false;
  const money=v=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(v||0));
  const num=v=>new Intl.NumberFormat('he-IL').format(Number(v||0));
  const pct=v=>v===null||v===undefined?'—':`${Number(v).toFixed(1)}%`;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function chart(items){
    const values=(items||[]).map(x=>Number(x.sales||0));
    const max=Math.max(...values,1);
    return `<div class="sales-bars">${(items||[]).map((x,i)=>`<div class="sales-bar" title="${esc(x.date)} · ${money(x.sales)}"><i style="height:${Math.max(3,Math.round(Number(x.sales||0)/max*100))}%"></i><span>${i===0||i===(items.length-1)||i%7===0?String(x.date).slice(8):''}</span></div>`).join('')}</div>`;
  }

  function ranked(items,total){
    if(!items?.length)return '<div class="empty-state"><p>אין נתונים בתקופה.</p></div>';
    return `<div class="rank-list">${items.map(x=>{const share=total?Number(x.sales||0)/total*100:0;return `<div><div><strong>${esc(x.name)}</strong><span>${x.transactions||0} עסקאות</span></div><div class="rank-value"><b>${money(x.sales)}</b><small>${share.toFixed(1)}%</small></div></div>`}).join('')}</div>`;
  }

  function render(data){
    const panel=$('panel-sales');
    const target=Number(data.target||0),sales=Number(data.sales||0),projection=Number(data.pace_projection||0),change=data.change_pct;
    const gap=data.data_quality?.known_gap;
    panel.innerHTML=`
      <div class="hero sales-hero"><div><h2>מכירות ויעדים</h2><p>ביצוע בפועל, קצב, יעד והרכב המכירות לפי התקופה הגלובלית.</p></div><div class="quality-strip"><span class="quality-chip">מקור: EasyBizy</span><span class="quality-chip">עדכון אחרון: ${data.latest_date||'אין נתון'}</span><span class="quality-chip ${gap?'warning':''}">${gap?`פער נתונים ידוע: ${gap.start}–${gap.end}`:'לא ידוע על פערים'}</span></div></div>
      <div class="summary-grid sales-summary">
        <article class="summary-card"><span>מכירות בתקופה</span><strong>${money(sales)}</strong><p>${num(data.transactions)} עסקאות · ${num(data.active_days)} ימי מכירה</p></article>
        <article class="summary-card"><span>יעד לתקופה</span><strong>${target?money(target):'לא הוגדר'}</strong><p>${target?`${pct(data.target_progress_pct)} מהיעד`:'אין יעד שמור לחודשים בתקופה'}</p></article>
        <article class="summary-card ${projection<target&&target?'negative':'positive'}"><span>קצב צפוי</span><strong>${money(projection)}</strong><p>${target?`${projection>=target?'מעל':'מתחת'} ליעד ב־${money(Math.abs(projection-target))}`:'מבוסס על קצב המכירות בתקופה'}</p></article>
        <article class="summary-card ${Number(change)<0?'negative':'positive'}"><span>שינוי מול תקופה קודמת</span><strong>${change===null?'אין בסיס':`${Number(change)>0?'+':''}${pct(change)}`}</strong><p>בתקופה הקודמת: ${money(data.previous_sales)}</p></article>
      </div>
      <section class="section"><div class="section-head"><div><h2>מגמת מכירות</h2><p>מכירות יומיות לאורך התקופה שנבחרה.</p></div></div>${chart(data.daily||[])}</section>
      <div class="sales-two-col">
        <section class="section"><div class="section-head"><div><h2>מוצרים ושירותים מובילים</h2><p>לפי סכום מכירות בתקופה.</p></div></div>${ranked(data.top_services,sales)}</section>
        <section class="section"><div class="section-head"><div><h2>אמצעי תשלום</h2><p>התפלגות לפי מקור התשלום שנקלט.</p></div></div>${ranked(data.payment_methods,sales)}</section>
      </div>
      <section class="section"><div class="section-head"><div><h2>איכות הנתונים</h2><p>מה ידוע ומה חסר בתקופה.</p></div></div><div class="placeholder-grid">
        <article class="placeholder"><div><b>לקוחות ייחודיים</b><p>${num(data.customers)}</p></div><small>${num(data.data_quality?.missing_customer)} עסקאות ללא שם לקוח</small></article>
        <article class="placeholder"><div><b>עסקה ממוצעת</b><p>${money(data.average_transaction)}</p></div><small>${num(data.transactions)} עסקאות מקור</small></article>
        <article class="placeholder"><div><b>סיווג חסר</b><p>${num(data.data_quality?.missing_service)} ללא שירות · ${num(data.data_quality?.missing_payment_method)} ללא אמצעי תשלום</p></div><small>לא הושלמו נתונים חסרים באופן אוטומטי</small></article>
      </div></section>`;
  }

  async function load(){
    if(loading||!period||$('panel-sales')?.hidden)return;
    loading=true;
    const panel=$('panel-sales');panel.innerHTML='<div class="empty-state"><p>טוען נתוני מכירות…</p></div>';
    const {data,error}=await client.rpc('get_test_v2_sales_report_v1',{p_start:period.start,p_end:period.end});
    loading=false;
    if(error){panel.innerHTML=`<div class="empty-state"><h2>לא ניתן לטעון</h2><p>${esc(error.message)}</p></div>`;return}
    render(data||{});
  }

  window.addEventListener('beautix-v2:period-change',e=>{period=e.detail;if(!$('panel-sales')?.hidden)load()});
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="sales"]'))setTimeout(()=>{period=window.BEAUTIX_V2?.getPeriod?.()||period;load()},350)});
  client.auth.onAuthStateChange((_event,session)=>{if(session&&location.hash==='#sales')setTimeout(()=>{period=window.BEAUTIX_V2?.getPeriod?.();load()},500)});
})();