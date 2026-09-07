(() => {
  'use strict';
  const cfg=window.BEAUTIX_CONFIG;
  const $=id=>document.getElementById(id);
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  let period=null,loading=false,monthly=null,monthlyIsPeriod=false,settingsNode=null,formOpen=false;
  const money=v=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(v||0));
  const num=v=>new Intl.NumberFormat('he-IL').format(Number(v||0));
  const pct=v=>v===null||v===undefined?'—':`${Number(v).toFixed(1)}%`;
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const monthName=v=>v?new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(new Date(`${String(v).slice(0,10)}T00:00:00`)):'';
  const monthStartOf=v=>`${String(v).slice(0,7)}-01`;
  const currentMonthStart=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`};

  function chart(items){
    const values=(items||[]).map(x=>Number(x.sales||0));
    const max=Math.max(...values,1);
    return `<div class="sales-bars">${(items||[]).map((x,i)=>`<div class="sales-bar" title="${esc(x.date)} · ${money(x.sales)}"><i style="height:${Math.max(3,Math.round(Number(x.sales||0)/max*100))}%"></i><span>${i===0||i===(items.length-1)||i%7===0?String(x.date).slice(8):''}</span></div>`).join('')}</div>`;
  }

  function ranked(items,total){
    if(!items?.length)return '<div class="empty-state"><p>אין נתונים בתקופה.</p></div>';
    return `<div class="rank-list">${items.map(x=>{const share=total?Number(x.sales||0)/total*100:0;return `<div><div><strong>${esc(x.name)}</strong><span>${x.transactions||0} עסקאות</span></div><div class="rank-value"><b>${money(x.sales)}</b><small>${share.toFixed(1)}%</small></div></div>`}).join('')}</div>`;
  }

  /* ---------- monthly target: level + next raise ---------- */

  function statusHtml(){
    if(!monthly)return '<p class="target-status-empty">לא ניתן לטעון את מדרגות היעד החודשי.</p>';
    const current=Number(monthly.current_target||0);
    const growth=Number(monthly.growth_ratio||0);
    const threshold=Number(monthly.threshold_ratio||0);
    const raiseAt=Number(monthly.next_raise_at||0);
    return `<div class="target-status">
      <div><span>חודש היעד</span><strong>${esc(monthName(monthly.month_start))}</strong><small>${monthlyIsPeriod?'התקופה שנבחרה':'החודש הנוכחי · התקופה שנבחרה רחבה מחודש'}</small></div>
      <div><span>רמה נוכחית</span><strong>${num(monthly.level)}</strong><small>${monthly.level?`הועלה ${num(monthly.level)} פעמים מיעד הבסיס ${money(monthly.base_target)}`:`יעד הבסיס ${money(monthly.base_target)}`}</small></div>
      <div><span>יעד החודש</span><strong>${money(current)}</strong><small>${pct(monthly.progress_percent)} הושלמו · ${money(monthly.sales)}</small></div>
      <div class="target-next"><span>העלאה הבאה במכירות של</span><strong>${money(raiseAt)}</strong><small>${(threshold*100).toFixed(0)}% מהיעד · ואז היעד יעלה ל־${money(current*(1+growth))}</small></div>
    </div>`;
  }

  /* ---------- settings form (persistent node, survives re-renders) ---------- */

  function buildSettings(){
    if(settingsNode)return settingsNode;
    settingsNode=document.createElement('section');
    settingsNode.className='section sales-target-settings';
    settingsNode.innerHTML=`<div class="section-head"><div><h2>הגדרת יעד המכירות</h2><p>יעד הפתיחה של כל חודש ואחוז ההעלאה בכל פעם שהיעד כמעט מושג.</p></div><button type="button" class="ghost-btn target-toggle" aria-expanded="false">עריכת היעד</button></div>
      <div class="target-status-slot"></div>
      <form class="target-form" hidden novalidate>
        <label>יעד פתיחה לחודש (₪)<input class="target-base" type="number" step="100" min="1" inputmode="decimal" required></label>
        <label>העלאה בכל רמה (%)<input class="target-growth" type="number" step="1" min="0.1" inputmode="decimal" required></label>
        <details class="target-advanced"><summary>הגדרות מתקדמות</summary>
          <label>סף להעלאת היעד (% מהיעד הנוכחי)<input class="target-threshold" type="number" step="1" min="1" max="100" inputmode="decimal" required></label>
          <p class="target-hint">כשהמכירות בחודש מגיעות לאחוז הזה מהיעד, היעד עולה רמה. ברירת המחדל היא 90%.</p>
        </details>
        <label class="wide">הערה (לא חובה)<input class="target-note" type="text" maxlength="200" placeholder="למשל: יעד מעודכן לרבעון הרביעי"></label>
        <p class="target-hint wide">השמירה מעדכנת את ההגדרות ומרעננת מיד את יעד החודש הנוכחי. חודשים שעברו נשארים כפי שנרשמו ולא מחושבים מחדש.</p>
        <p class="target-error" hidden role="alert"></p>
        <div class="target-actions"><button type="submit" class="primary-btn target-save">שמירת היעד</button><button type="button" class="ghost-btn target-cancel">ביטול</button></div>
      </form>
      <p class="target-success" hidden role="status"></p>`;
    settingsNode.querySelector('.target-toggle').addEventListener('click',()=>formOpen?closeForm():openForm());
    settingsNode.querySelector('.target-cancel').addEventListener('click',closeForm);
    settingsNode.querySelector('.target-form').addEventListener('submit',save);
    return settingsNode;
  }

  function paintSettings(){
    if(!settingsNode)return;
    settingsNode.querySelector('.target-status-slot').innerHTML=statusHtml();
    settingsNode.querySelector('.target-toggle').disabled=!monthly;
    if(!formOpen)fill();
  }

  function fill(){
    if(!settingsNode||!monthly)return;
    settingsNode.querySelector('.target-base').value=Number(monthly.base_target||0);
    settingsNode.querySelector('.target-growth').value=Number((Number(monthly.growth_ratio||0)*100).toFixed(2));
    settingsNode.querySelector('.target-threshold').value=Number((Number(monthly.threshold_ratio||0)*100).toFixed(2));
  }

  function openForm(){
    if(!settingsNode)return;
    fill();
    settingsNode.querySelector('.target-note').value='';
    const error=settingsNode.querySelector('.target-error');
    error.hidden=true;error.textContent='';
    settingsNode.querySelector('.target-success').hidden=true;
    settingsNode.querySelector('.target-form').hidden=false;
    formOpen=true;
    const toggle=settingsNode.querySelector('.target-toggle');
    toggle.setAttribute('aria-expanded','true');
    toggle.textContent='סגירת הטופס';
    settingsNode.querySelector('.target-base').focus();
  }

  function closeForm(){
    if(!settingsNode)return;
    settingsNode.querySelector('.target-form').hidden=true;
    formOpen=false;
    const toggle=settingsNode.querySelector('.target-toggle');
    toggle.setAttribute('aria-expanded','false');
    toggle.textContent='עריכת היעד';
  }

  async function save(event){
    event.preventDefault();
    if(!settingsNode)return;
    const error=settingsNode.querySelector('.target-error');
    const success=settingsNode.querySelector('.target-success');
    error.hidden=true;error.textContent='';success.hidden=true;

    const base=Number(settingsNode.querySelector('.target-base').value);
    const growth=Number(settingsNode.querySelector('.target-growth').value);
    const threshold=Number(settingsNode.querySelector('.target-threshold').value);
    const note=settingsNode.querySelector('.target-note').value.trim();
    if(!Number.isFinite(base)||base<=0){error.textContent='יש להזין יעד פתיחה חיובי.';error.hidden=false;return}
    if(!Number.isFinite(growth)||growth<=0){error.textContent='אחוז ההעלאה חייב להיות מספר חיובי (למשל 30 עבור 30%).';error.hidden=false;return}
    if(!Number.isFinite(threshold)||threshold<=0||threshold>100){error.textContent='הסף להעלאת היעד חייב להיות בין 0 ל־100 אחוזים.';error.hidden=false;return}

    const buttons=settingsNode.querySelectorAll('.target-form button');
    buttons.forEach(b=>{b.disabled=true});
    const saveBtn=settingsNode.querySelector('.target-save');
    const saveLabel=saveBtn.textContent;
    saveBtn.textContent='שומר…';

    const {data,error:rpcError}=await client.rpc('set_sales_target_settings_v1',{
      p_base_target:base,p_growth_ratio_pct:growth,p_threshold_ratio_pct:threshold,p_note:note||null
    });

    buttons.forEach(b=>{b.disabled=false});
    saveBtn.textContent=saveLabel;

    if(rpcError){error.textContent=rpcError.message||'שמירת היעד נכשלה.';error.hidden=false;return}

    const result=data||{};
    success.innerHTML=`ההגדרות נשמרו · יעד פתיחה <b>${esc(money(result.base_target))}</b> · העלאה של <b>${esc(String(result.growth_ratio_pct))}%</b> בכל רמה · סף <b>${esc(String(result.threshold_ratio_pct))}%</b>${result.current_month_refreshed?` · יעד ${esc(monthName(result.current_month_refreshed))} רוענן`:''}`;
    success.hidden=false;
    closeForm();
    await load();
  }

  /* ---------- report ---------- */

  function render(data){
    const panel=$('panel-sales');
    const target=Number(data.target||0),sales=Number(data.sales||0),projection=Number(data.pace_projection||0),change=data.change_pct;
    const gap=data.data_quality?.known_gap;
    const level=monthlyIsPeriod&&monthly?` · רמה ${num(monthly.level)}`:'';
    panel.innerHTML=`
      <div class="hero sales-hero"><div><h2>מכירות ויעדים</h2><p>ביצוע בפועל, קצב, יעד והרכב המכירות לפי התקופה הגלובלית.</p></div><div class="quality-strip"><span class="quality-chip">מקור: EasyBizy</span><span class="quality-chip">עדכון אחרון: ${data.latest_date||'אין נתון'}</span><span class="quality-chip ${gap?'warning':''}">${gap?`פער נתונים ידוע: ${gap.start}–${gap.end}`:'לא ידוע על פערים'}</span></div></div>
      <div class="summary-grid sales-summary">
        <article class="summary-card"><span>מכירות בתקופה</span><strong>${money(sales)}</strong><p>${num(data.transactions)} עסקאות · ${num(data.active_days)} ימי מכירה</p></article>
        <article class="summary-card"><span>יעד לתקופה</span><strong>${target?money(target):'לא הוגדר'}</strong><p>${target?`${pct(data.target_progress_pct)} מהיעד${level}`:'אין יעד שמור לחודשים בתקופה'}</p></article>
        <article class="summary-card ${projection<target&&target?'negative':'positive'}"><span>קצב צפוי</span><strong>${money(projection)}</strong><p>${target?`${projection>=target?'מעל':'מתחת'} ליעד ב־${money(Math.abs(projection-target))}`:'מבוסס על קצב המכירות בתקופה'}</p></article>
        <article class="summary-card ${Number(change)<0?'negative':'positive'}"><span>שינוי מול תקופה קודמת</span><strong>${change===null?'אין בסיס':`${Number(change)>0?'+':''}${pct(change)}`}</strong><p>בתקופה הקודמת: ${money(data.previous_sales)}</p></article>
      </div>
      <div class="sales-target-slot"></div>
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
    panel.querySelector('.sales-target-slot').appendChild(buildSettings());
    paintSettings();
  }

  async function load(){
    if(loading||!period||$('panel-sales')?.hidden)return;
    loading=true;
    const panel=$('panel-sales');panel.innerHTML='<div class="empty-state"><p>טוען נתוני מכירות…</p></div>';
    monthlyIsPeriod=String(period.start).slice(0,7)===String(period.end).slice(0,7);
    const monthStart=monthlyIsPeriod?monthStartOf(period.start):currentMonthStart();
    const [report,target]=await Promise.all([
      client.rpc('get_sales_report_v1',{p_start:period.start,p_end:period.end}),
      client.rpc('get_monthly_sales_target_v1',{p_month_start:monthStart})
    ]);
    loading=false;
    monthly=target.error?null:(target.data||null);
    if(target.error)console.error('Failed to load monthly sales target',target.error);
    if(report.error){panel.innerHTML=`<div class="empty-state"><h2>לא ניתן לטעון</h2><p>${esc(report.error.message)}</p></div>`;return}
    render(report.data||{});
  }

  window.addEventListener('beautix:period-change',e=>{period=e.detail;if(!$('panel-sales')?.hidden)load()});
  document.addEventListener('click',e=>{if(e.target.closest('[data-tab="sales"]'))setTimeout(()=>{period=window.BEAUTIX?.getPeriod?.()||period;load()},350)});
  client.auth.onAuthStateChange((_event,session)=>{if(session&&location.hash==='#sales')setTimeout(()=>{period=window.BEAUTIX?.getPeriod?.();load()},500)});
})();
