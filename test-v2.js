(() => {
  'use strict';
  const cfg = window.BEAUTIX_V2_CONFIG;
  const $ = (id) => document.getElementById(id);
  const state = { tab: cfg.defaultTab, mode: cfg.defaultPeriodMode, anchor: new Date(), client: null };
  const tabMeta = {
    overview: ['סקירה כללית','מה מצב העסק ומה דורש פעולה'],
    cashflow: ['תזרים','תחזית נזילות, התחייבויות וסיכונים'],
    sales: ['מכירות ויעדים','ביצועים, קצב ויעדים לפי התקופה'],
    retention: ['שיווק ושימור','לקוחות ומנויים עם הזדמנות לפעולה'],
    reports: ['דוחות מפורטים','הסברים, מגמות ואיכות נתונים'],
    input: ['הזנת נתונים','העלאה, אישור וניהול תנועות']
  };
  const money = value => new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(value||0));

  function formatPeriod() {
    const d = state.anchor;
    if (state.mode === 'year') return String(d.getFullYear());
    if (state.mode === 'quarter') return `רבעון ${Math.floor(d.getMonth()/3)+1}, ${d.getFullYear()}`;
    return new Intl.DateTimeFormat('he-IL',{month:'long',year:'numeric'}).format(d);
  }
  function shiftPeriod(delta) {
    if (state.mode === 'year') state.anchor.setFullYear(state.anchor.getFullYear()+delta);
    else if (state.mode === 'quarter') state.anchor.setMonth(state.anchor.getMonth()+delta*3);
    else state.anchor.setMonth(state.anchor.getMonth()+delta);
    state.anchor = new Date(state.anchor);
    renderPeriod();
    periodChanged();
  }
  function getPeriod() {
    const d = new Date(state.anchor);
    let start,end;
    if(state.mode==='year'){start=new Date(d.getFullYear(),0,1);end=new Date(d.getFullYear(),11,31);}
    else if(state.mode==='quarter'){const m=Math.floor(d.getMonth()/3)*3;start=new Date(d.getFullYear(),m,1);end=new Date(d.getFullYear(),m+3,0);}
    else{start=new Date(d.getFullYear(),d.getMonth(),1);end=new Date(d.getFullYear(),d.getMonth()+1,0);}
    const iso=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    return {mode:state.mode,start:iso(start),end:iso(end),label:formatPeriod()};
  }
  function renderPeriod(){ $('period-label').textContent=formatPeriod(); }
  function periodChanged(){
    const detail=getPeriod();
    window.dispatchEvent(new CustomEvent('beautix-v2:period-change',{detail}));
    if(state.client) loadOverview();
  }
  function setTab(tab){
    if(!tabMeta[tab]) return;
    state.tab=tab;
    document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
    document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!==`panel-${tab}`);
    $('page-heading').textContent=tabMeta[tab][0];
    $('page-subheading').textContent=tabMeta[tab][1];
    $('sidebar').classList.remove('open');
    history.replaceState(null,'',`#${tab}`);
    if(tab==='overview' && state.client) loadOverview();
  }
  function renderOverview(data){
    const panel=$('panel-overview');
    const progress=data.target_progress_pct;
    const change=data.sales_change_pct;
    const result=Number(data.operating_result||0);
    const action = Number(data.sales||0)===0 ? 'להתחיל לייצר מכירות בתקופה' : progress!==null && progress<70 ? 'להאיץ מכירות מול היעד' : result<0 ? 'לצמצם הוצאות ולשמור נזילות' : 'לשמור על הקצב ולחזק רזרבה';
    panel.querySelector('.summary-grid').innerHTML=`
      <article class="summary-card"><span>מכירות בתקופה</span><strong>${money(data.sales)}</strong><p>${data.sales_rows||0} עסקאות · ${data.active_days||0} ימי פעילות</p></article>
      <article class="summary-card"><span>עמידה ביעד</span><strong>${progress===null?'אין יעד':`${progress}%`}</strong><p>${data.target?`${money(data.sales)} מתוך ${money(data.target)}`:'לא הוגדר יעד לתקופה'}</p></article>
      <article class="summary-card"><span>הוצאות שאושרו</span><strong>${money(data.expenses_actual)}</strong><p>${data.expense_rows||0} תנועות שבוצעו בפועל</p></article>
      <article class="summary-card ${result<0?'negative':'positive'}"><span>תוצאה תפעולית</span><strong>${money(result)}</strong><p>מכירות פחות הוצאות מאושרות</p></article>`;
    panel.querySelector('.placeholder-grid').innerHTML=`
      <article class="placeholder"><div><b>שינוי מול התקופה הקודמת</b><p>${change===null?'אין בסיס השוואה':`${change>0?'+':''}${change}% במכירות`}</p></div><small>${money(data.previous_sales)} בתקופה הקודמת</small></article>
      <article class="placeholder"><div><b>איכות נתוני המכירות</b><p>הנתון האחרון שנקלט: ${data.latest_sales_date||'אין נתון'}</p></div><small>${data.sales_rows||0} רשומות מקור</small></article>
      <article class="placeholder action-card"><div><b>הפעולה החשובה הבאה</b><p>${action}</p></div><small>נבחר לפי נתוני התקופה</small></article>`;
  }
  async function loadOverview(){
    if(!state.client) return;
    const period=getPeriod();
    const panel=$('panel-overview');
    panel.setAttribute('aria-busy','true');
    const {data,error}=await state.client.rpc('get_test_v2_overview_period_v1',{p_start:period.start,p_end:period.end});
    panel.removeAttribute('aria-busy');
    if(error){
      panel.querySelector('.summary-grid').innerHTML=`<article class="summary-card"><span>שגיאת טעינה</span><strong>לא ניתן לטעון</strong><p>${error.message}</p></article>`;
      return;
    }
    renderOverview(data||{});
  }
  async function initAuth(){
    state.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data}=await state.client.auth.getSession();
    showSession(data.session);
    state.client.auth.onAuthStateChange((_event,session)=>showSession(session));
  }
  function showSession(session){
    $('login-view').classList.toggle('hidden',!!session);
    $('app-view').classList.toggle('hidden',!session);
    if(session){ $('user-email').textContent=session.user?.email||'משתמש מחובר'; $('system-text').textContent='מחובר למקור האמת'; loadOverview(); }
  }
  async function login(e){
    e.preventDefault(); $('login-error').classList.add('hidden');
    const email=$('email').value.trim(),password=$('password').value;
    const {error}=await state.client.auth.signInWithPassword({email,password});
    if(error){$('login-error').textContent=error.message;$('login-error').classList.remove('hidden');}
  }
  function wire(){
    $('login-form').addEventListener('submit',login);
    $('logout').addEventListener('click',()=>state.client.auth.signOut());
    $('mobile-nav-toggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
    document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
    $('period-mode').addEventListener('change',e=>{state.mode=e.target.value;renderPeriod();periodChanged();});
    $('period-prev').addEventListener('click',()=>shiftPeriod(-1));
    $('period-next').addEventListener('click',()=>shiftPeriod(1));
    $('period-today').addEventListener('click',()=>{state.anchor=new Date();renderPeriod();periodChanged();});
  }
  async function boot(){
    wire(); renderPeriod(); setTab(location.hash.slice(1)||cfg.defaultTab); await initAuth();
    window.BEAUTIX_V2={getPeriod,setTab,refreshOverview:loadOverview};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
