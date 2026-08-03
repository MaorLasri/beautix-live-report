(() => {
  'use strict';
  const cfg = window.BEAUTIX_V2_CONFIG;
  const $ = id => document.getElementById(id);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const today = () => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); };
  const state = { tab: cfg.defaultTab, mode: cfg.defaultPeriodMode, anchor: new Date(), client: null, cashflowRange: 'back90', cashflowStart: null, cashflowEnd: null };
  const tabMeta = {
    overview:['סקירה כללית','מה מצב העסק ומה דורש פעולה'], cashflow:['תזרים','עבר ועתיד באותו דוח לפי טווח נבחר'], sales:['מכירות ויעדים','ביצועים, קצב ויעדים לפי התקופה'], retention:['שיווק ושימור','לקוחות ומנויים עם הזדמנות לפעולה'], reports:['דוחות מפורטים','הסברים, מגמות ואיכות נתונים'], input:['הזנת נתונים','העלאה, אישור וניהול תנועות']
  };
  const money = value => new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(value||0));
  const dateText = value => value ? new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : '—';
  const esc = value => String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function formatPeriod(){const d=state.anchor;if(state.mode==='year')return String(d.getFullYear());if(state.mode==='quarter')return `רבעון ${Math.floor(d.getMonth()/3)+1}, ${d.getFullYear()}`;return new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(d)}
  function shiftPeriod(delta){if(state.mode==='year')state.anchor.setFullYear(state.anchor.getFullYear()+delta);else if(state.mode==='quarter')state.anchor.setMonth(state.anchor.getMonth()+delta*3);else state.anchor.setMonth(state.anchor.getMonth()+delta);state.anchor=new Date(state.anchor);renderPeriod();periodChanged()}
  function getPeriod(){const d=new Date(state.anchor);let start,end;if(state.mode==='year'){start=new Date(d.getFullYear(),0,1);end=new Date(d.getFullYear(),11,31)}else if(state.mode==='quarter'){const m=Math.floor(d.getMonth()/3)*3;start=new Date(d.getFullYear(),m,1);end=new Date(d.getFullYear(),m+3,0)}else{start=new Date(d.getFullYear(),d.getMonth(),1);end=new Date(d.getFullYear(),d.getMonth()+1,0)}return{mode:state.mode,start:iso(start),end:iso(end),label:formatPeriod()}}
  function renderPeriod(){$('period-label').textContent=formatPeriod()}
  function periodChanged(){const detail=getPeriod();window.dispatchEvent(new CustomEvent('beautix-v2:period-change',{detail}));if(state.client&&state.tab==='overview')loadOverview()}
  function setTab(tab){if(!tabMeta[tab])return;state.tab=tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==`panel-${tab}`);$('page-heading').textContent=tabMeta[tab][0];$('page-subheading').textContent=tabMeta[tab][1];$('app-view').classList.toggle('cashflow-mode',tab==='cashflow');$('sidebar').classList.remove('open');history.replaceState(null,'',`#${tab}`);if(state.client){if(tab==='overview')loadOverview();if(tab==='cashflow')loadCashflow()}}

  function renderOverview(data){const panel=$('panel-overview');const progress=data.target_progress_pct;const change=data.sales_change_pct;const result=Number(data.operating_result||0);const action=Number(data.sales||0)===0?'להתחיל לייצר מכירות בתקופה':progress!==null&&progress<70?'להאיץ מכירות מול היעד':result<0?'לצמצם הוצאות ולשמור נזילות':'לשמור על הקצב ולחזק רזרבה';panel.querySelector('.summary-grid').innerHTML=`<article class="summary-card"><span>מכירות בתקופה</span><strong>${money(data.sales)}</strong><p>${data.sales_rows||0} עסקאות · ${data.active_days||0} ימי פעילות</p></article><article class="summary-card"><span>עמידה ביעד</span><strong>${progress===null?'אין יעד':`${progress}%`}</strong><p>${data.target?`${money(data.sales)} מתוך ${money(data.target)}`:'לא הוגדר יעד לתקופה'}</p></article><article class="summary-card"><span>הוצאות שבוצעו בתקופה</span><strong>${money(data.expenses_actual)}</strong><p>${data.expense_rows||0} תנועות שאושרו כבוצעו בפועל</p></article><article class="summary-card ${result<0?'negative':'positive'}"><span>יתרה תפעולית לתקופה</span><strong>${money(result)}</strong><p>מכירות בתקופה פחות הוצאות שבוצעו בתקופה · לא רווח נקי חשבונאי</p></article>`;panel.querySelector('.placeholder-grid').innerHTML=`<article class="placeholder"><div><b>שינוי מול התקופה הקודמת</b><p>${change===null?'אין בסיס השוואה':`${change>0?'+':''}${change}% במכירות`}</p></div><small>${money(data.previous_sales)} בתקופה הקודמת</small></article><article class="placeholder"><div><b>איכות נתוני המכירות</b><p>הנתון האחרון שנקלט: ${data.latest_sales_date||'אין נתון'}</p></div><small>${data.sales_rows||0} רשומות מקור</small></article><article class="placeholder action-card"><div><b>הפעולה החשובה הבאה</b><p>${action}</p></div><small>נבחר לפי נתוני התקופה</small></article>`}
  async function loadOverview(){if(!state.client)return;const period=getPeriod(),panel=$('panel-overview');panel.setAttribute('aria-busy','true');const{data,error}=await state.client.rpc('get_test_v2_overview_period_v1',{p_start:period.start,p_end:period.end});panel.removeAttribute('aria-busy');if(error){panel.querySelector('.summary-grid').innerHTML=`<article class="summary-card"><span>שגיאת טעינה</span><strong>לא ניתן לטעון</strong><p>${esc(error.message)}</p></article>`;return}renderOverview(data||{})}

  function resolveCashflowRange(key){
    const t=today(); let start=new Date(t),end=new Date(t);
    if(key==='back30')start.setDate(start.getDate()-29);
    else if(key==='back60')start.setDate(start.getDate()-59);
    else if(key==='back90')start.setDate(start.getDate()-89);
    else if(key==='forward30')end.setDate(end.getDate()+29);
    else if(key==='forward60')end.setDate(end.getDate()+59);
    else if(key==='forward90')end.setDate(end.getDate()+89);
    else if(key==='month_end')end=new Date(t.getFullYear(),t.getMonth()+1,0);
    return {start:iso(start),end:iso(end)};
  }
  function currentCashflowRange(){return state.cashflowRange==='custom'?{start:state.cashflowStart,end:state.cashflowEnd}:resolveCashflowRange(state.cashflowRange)}

  function renderCashflow(data){
    const totalIn=Number(data.inflows||0),totalOut=Number(data.outflows||0),net=Number(data.net||0),ending=Number(data.ending_balance||0),lowest=Number(data.lowest_balance||0);
    const actualIn=Number(data.actual_inflows||0),actualOut=Number(data.actual_outflows||0),forecastIn=Number(data.forecast_inflows||0),forecastOut=Number(data.forecast_outflows||0);
    $('cashflow-as-of').textContent=`${dateText(data.start_date)}–${dateText(data.end_date)}`;
    const stale=data.data_quality?.balance_is_stale;
    $('cashflow-balance-quality').textContent=`יתרה בתחילת הטווח ${money(data.opening_balance)}${stale?' · מבוססת על יתרה שדורשת עדכון':''}`;
    $('cashflow-balance-quality').classList.toggle('warning',!!stale);
    $('cashflow-summary').innerHTML=`
      <article class="summary-card"><span>הכנסות בטווח</span><strong>${money(totalIn)}</strong><p>בפועל ${money(actualIn)} · צפוי ${money(forecastIn)}</p></article>
      <article class="summary-card"><span>הוצאות בטווח</span><strong>${money(totalOut)}</strong><p>בפועל ${money(actualOut)} · צפוי ${money(forecastOut)}</p></article>
      <article class="summary-card ${net<0?'negative':'positive'}"><span>נטו בטווח</span><strong>${money(net)}</strong><p>הכנסות פחות הוצאות</p></article>
      <article class="summary-card ${ending<0?'negative':'positive'}"><span>יתרה בסוף הטווח</span><strong>${money(ending)}</strong><p>יתרה מחושבת לפי התנועות בטווח</p></article>`;
    const hasForecast=forecastIn>0||forecastOut>0;
    $('cashflow-insights').innerHTML=`
      <article class="placeholder ${lowest<0?'risk-card':''}"><div><b>היתרה הנמוכה בטווח</b><p>${dateText(data.lowest_date)} · ${money(lowest)}</p></div><small>${lowest<0?'סיכון נזילות':'לא ירדה מתחת לאפס'}</small></article>
      <article class="placeholder"><div><b>יום ההוצאה הגדול ביותר</b><p>${data.largest_outflow_date?`${dateText(data.largest_outflow_date)} · ${money(data.largest_outflow)}`:'אין הוצאות בטווח'}</p></div><small>${data.active_days||0} ימים עם תנועה</small></article>
      <article class="placeholder"><div><b>הרכב הטווח</b><p>${hasForecast?'כולל עבר בפועל ועתיד צפוי':'כולל תנועות שבוצעו בפועל בלבד'}</p></div><small>עבר לא כולל תחזיות</small></article>`;
    const days=Array.isArray(data.days)?data.days:[];
    if(!days.length){$('cashflow-upcoming').innerHTML='<div class="empty-state"><p>אין תנועות בטווח שנבחר.</p></div>';return}
    $('cashflow-upcoming').innerHTML=days.map(day=>`<article class="cashflow-day"><div class="cashflow-day-head"><div><strong>${dateText(day.date)}</strong><span>${day.event_count||0} תנועות</span></div><div class="cashflow-day-totals"><span class="income">+${money(day.inflows)}</span><span class="expense">-${money(day.outflows)}</span><b>${money(day.balance)}</b></div></div><div class="cashflow-entries">${(day.entries||[]).slice(0,8).map(entry=>`<div><span>${esc(entry.description||'תנועה')}</span><small>${entry.type==='income'?'הכנסה':'הוצאה'} · ${entry.state==='actual'?'בוצע':'צפוי'}</small><b>${money(entry.amount)}</b></div>`).join('')}${(day.entries||[]).length>8?`<small class="more-entries">ועוד ${(day.entries||[]).length-8} תנועות</small>`:''}</div></article>`).join('');
  }
  async function loadCashflow(){if(!state.client)return;const range=currentCashflowRange();if(!range.start||!range.end)return;const panel=$('panel-cashflow');panel.setAttribute('aria-busy','true');const{data,error}=await state.client.rpc('get_test_v2_cashflow_range_v1',{p_start:range.start,p_end:range.end});panel.removeAttribute('aria-busy');if(error){$('cashflow-summary').innerHTML=`<article class="summary-card"><span>שגיאת טעינה</span><strong>לא ניתן לטעון</strong><p>${esc(error.message)}</p></article>`;return}renderCashflow(data||{})}

  async function initAuth(){state.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const{data}=await state.client.auth.getSession();showSession(data.session);state.client.auth.onAuthStateChange((_event,session)=>showSession(session))}
  function showSession(session){$('login-view').classList.toggle('hidden',!!session);$('app-view').classList.toggle('hidden',!session);if(session){$('user-email').textContent=session.user?.email||'משתמש מחובר';$('system-text').textContent='מחובר למקור האמת';if(state.tab==='cashflow')loadCashflow();else loadOverview()}}
  async function login(e){e.preventDefault();$('login-error').classList.add('hidden');const email=$('email').value.trim(),password=$('password').value;const{error}=await state.client.auth.signInWithPassword({email,password});if(error){$('login-error').textContent=error.message;$('login-error').classList.remove('hidden')}}
  function wire(){
    $('login-form').addEventListener('submit',login);$('logout').addEventListener('click',()=>state.client.auth.signOut());$('mobile-nav-toggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
    $('period-mode').addEventListener('change',e=>{state.mode=e.target.value;renderPeriod();periodChanged()});$('period-prev').addEventListener('click',()=>shiftPeriod(-1));$('period-next').addEventListener('click',()=>shiftPeriod(1));$('period-today').addEventListener('click',()=>{state.anchor=new Date();renderPeriod();periodChanged()});
    document.querySelectorAll('[data-range]').forEach(button=>button.addEventListener('click',()=>{state.cashflowRange=button.dataset.range;document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b===button));$('cashflow-custom-range').classList.toggle('hidden',state.cashflowRange!=='custom');if(state.cashflowRange!=='custom')loadCashflow()}));
    $('cashflow-custom-range').addEventListener('submit',e=>{e.preventDefault();state.cashflowStart=$('cashflow-start').value;state.cashflowEnd=$('cashflow-end').value;loadCashflow()});
  }
  async function boot(){wire();renderPeriod();const initial=resolveCashflowRange(state.cashflowRange);$('cashflow-start').value=initial.start;$('cashflow-end').value=initial.end;setTab(location.hash.slice(1)||cfg.defaultTab);await initAuth();window.BEAUTIX_V2={getPeriod,setTab,refreshOverview:loadOverview,refreshCashflow:loadCashflow}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();