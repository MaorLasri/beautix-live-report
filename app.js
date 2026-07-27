(() => {
  const config = window.BEAUTIX_CONFIG;
  const rememberPreference = localStorage.getItem("beautix-remember-device") === "true";
  const storage = rememberPreference ? window.localStorage : window.sessionStorage;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, storage, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");
  const reportView = document.getElementById("report-view");
  const loginForm = document.getElementById("login-form");
  const loginSubmit = document.getElementById("login-submit");
  const loginError = document.getElementById("login-error");
  const reportError = document.getElementById("report-error");
  const refreshBtn = document.getElementById("refresh-btn");
  const authAction = document.getElementById("auth-action");
  const activeUser = document.getElementById("active-user");
  const rememberDevice = document.getElementById("remember-device");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("toggle-password");
  const expandAllBtn = document.getElementById("expand-all-btn");
  const collapseAllBtn = document.getElementById("collapse-all-btn");
  const daysContainer = document.getElementById("days");
  const assetContainer = document.getElementById("loan-asset-cards");
  const lastUpdated = document.getElementById("last-updated");
  let refreshTimer = null;
  let isLoading = false;

  rememberDevice.checked = rememberPreference;

  const money = (value) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(Number(value || 0));
  const numberText = (value, digits = 1) => new Intl.NumberFormat("he-IL", { maximumFractionDigits: digits }).format(Number(value || 0));
  const dateText = (value) => value ? new Intl.DateTimeFormat("he-IL").format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : "—";
  const setText = (id, value, className = null) => { const el = document.getElementById(id); if (!el) return; el.textContent = value; el.classList.remove("pos","neg","warn"); if (className) el.classList.add(className); };
  const setProgress = (id, value, tone = "pink") => { const el = document.getElementById(id); if (!el) return; el.style.width = `${Math.max(0,Math.min(Number(value||0),100))}%`; el.dataset.tone = tone; };
  const setMetric = (id, value, polarity = null) => { const el = document.getElementById(id); if (!el) return; el.textContent = money(value); el.classList.remove("pos","neg"); if (polarity === "balance") el.classList.add(Number(value) >= 0 ? "pos" : "neg"); };
  const normalizeReport = (payload) => Array.isArray(payload) && payload.length === 1 && payload[0]?.report ? payload[0].report : payload?.report || payload;
  const normalizeEntryType = (type) => { const t = String(type || "").toLowerCase(); if (["income","receipt","credit"].includes(t)) return "income"; if (["expense","loan_payment","debit"].includes(t)) return "expense"; return t; };
  const escapeHtml = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

  async function resolveDisplayName(session){
    const fallback=session?.user?.email||"משתמש מחובר";
    const userId=session?.user?.id;
    if(!userId) return fallback;
    try{
      const {data,error}=await client.from("app_users").select("display_name,is_active").eq("auth_user_id",userId).maybeSingle();
      if(error) throw error;
      if(data?.is_active===false) return "משתמש לא פעיל";
      return data?.display_name?.trim()||fallback;
    }catch(error){
      console.warn("Unable to load user profile",error);
      return fallback;
    }
  }

  async function updateActiveUser(session){
    activeUser.textContent=await resolveDisplayName(session);
  }

  function buildForecast(report) {
    const accounts = report.accounts || [], daily = report.daily || [], clearing = report.future_clearing || [];
    const checking = accounts.find((x) => x.name === "עו״ש עסק – הבינלאומי");
    let balance = Number(checking?.balance || 0);
    const events = new Map();
    const add = (date, event) => { if (!date) return; const key = String(date).slice(0,10); const list = events.get(key) || []; list.push({ ...event, type: normalizeEntryType(event.type) }); events.set(key,list); };
    daily.forEach((day) => (day.entries || []).forEach((entry) => add(day.date,{ type: entry.type, description: entry.description || "תנועה", amount: Math.abs(Number(entry.amount || 0)), source: entry.source || "Supabase" })));
    clearing.forEach((item) => { if (item.status === "expected") add(item.date,{ type:"income", description:"זיכוי סליקה עתידי", amount:Math.abs(Number(item.net||0)), source:item.source_reference||"Supabase" }); });
    const start = new Date(); start.setHours(0,0,0,0); const days=[];
    for (let i=0;i<30;i+=1){ const d=new Date(start); d.setDate(start.getDate()+i); const key=d.toISOString().slice(0,10); const entries=events.get(key)||[]; const income=entries.filter((e)=>e.type==="income").reduce((s,e)=>s+e.amount,0); const expense=entries.filter((e)=>e.type==="expense").reduce((s,e)=>s+e.amount,0); const net=income-expense; balance+=net; days.push({date:key,entries,income,expense,net,projectedBalance:balance}); }
    return days;
  }

  function renderEntries(entries, type){ const filtered=entries.filter((e)=>e.type===type); if(!filtered.length) return '<li class="empty">אין תנועות</li>'; return filtered.map((e)=>`<li><span>${escapeHtml(e.description)}</span><strong>${money(e.amount)}</strong><small>${escapeHtml(e.source||"Supabase")}</small></li>`).join(""); }
  function setCardOpen(card,open){ const button=card.querySelector(".day-toggle"); const panel=card.querySelector("div[id^='day-panel-']"); button.setAttribute("aria-expanded",String(open)); panel.hidden=!open; card.classList.toggle("is-open",open); }
  function setAllCards(open){ document.querySelectorAll("[data-day-card]").forEach((card)=>setCardOpen(card,open)); }
  function renderDays(days){ daysContainer.innerHTML=days.map((day,index)=>`<article class="day-card" data-day-card><button class="day-toggle" type="button" aria-expanded="false" aria-controls="day-panel-${index}"><div class="summary-date"><span class="chevron">⌄</span><div><h3>${dateText(day.date)}</h3><small>${day.entries.length} תנועות</small></div></div><div class="day-kpis"><div><span>הכנסות</span><strong class="pos">${money(day.income)}</strong></div><div><span>הוצאות</span><strong class="neg">${money(day.expense)}</strong></div><div><span>נטו</span><strong class="${day.net>=0?"pos":"neg"}">${money(day.net)}</strong></div><div><span>יתרה חזויה</span><strong class="${day.projectedBalance>=0?"pos":"neg"}">${money(day.projectedBalance)}</strong></div></div></button><div id="day-panel-${index}" hidden><div class="day-body"><section><h4>הכנסות</h4><ul>${renderEntries(day.entries,"income")}</ul></section><section><h4>הוצאות</h4><ul>${renderEntries(day.entries,"expense")}</ul></section></div></div></article>`).join(""); document.querySelectorAll("[data-day-card]").forEach((card)=>card.querySelector(".day-toggle").addEventListener("click",()=>setCardOpen(card,card.querySelector(".day-toggle").getAttribute("aria-expanded")!=="true"))); }

  function renderSalesInsights(report){
    const sales=Number(report.sales?.income||0), target=Number(report.settings?.monthly_sales_target||report.sales?.target||0);
    const latest=report.sales?.latest?new Date(`${String(report.sales.latest).slice(0,10)}T00:00:00`):new Date();
    const day=Math.max(1,latest.getDate()), monthEnd=new Date(latest.getFullYear(),latest.getMonth()+1,0).getDate();
    const daily=sales/day, forecast=daily*monthEnd, progress=target>0?sales/target*100:0, gap=target-sales;
    setText("sales-note",`${numberText(progress,1)}% מהיעד הפעיל`); setText("sales-progress",`${numberText(progress,1)}%`,progress>=100?"pos":progress>=80?"warn":null); setProgress("sales-progress-bar",progress,progress>=100?"green":progress>=80?"amber":"pink");
    setText("sales-progress-note",progress>=100?`היעד הושג ונחצה ב־${money(Math.abs(gap))}`:`נותרו ${money(Math.max(gap,0))} ליעד`); setText("sales-daily-rate",money(daily)); setText("sales-daily-rate-note",`ממוצע לפי ${day} ימים בחודש`); setText("sales-forecast",money(forecast),forecast>=target?"pos":"warn"); setText("sales-forecast-note",forecast>=target?`צפי לסיום מעל היעד ב־${money(forecast-target)}`:`צפי לחוסר של ${money(target-forecast)}`); setText("sales-gap",money(Math.abs(gap)),gap<=0?"pos":"neg"); setText("sales-gap-note",gap<=0?`מעל היעד ב־${money(Math.abs(gap))}`:`נדרש קצב של ${money(gap/Math.max(monthEnd-day,1))} ליום עד סוף החודש`);
    const milestones=[{amount:50000,date:"2026-07-21"},{amount:75000,date:"2026-07-23"},{amount:target,date:null}]; const list=document.getElementById("sales-milestones"); if(list) list.innerHTML=milestones.map((m)=>`<li class="${m.date?"achieved":"active"}"><span>${money(m.amount)}</span><small>${m.date?`נשבר ב־${dateText(m.date)}`:"יעד פעיל"}</small></li>`).join("");
  }

  function renderBusinessKpis(report,checkingBalance){
    const settings=report.settings||{}, monthly=report.monthly||{}, sales=Number(report.sales?.income||monthly.sales||0), immediate=Number(monthly.immediate_receipts||monthly.bank_receipts||0), immediateTarget=Number(settings.monthly_revenue_target||57500), dailyTarget=Number(settings.daily_immediate_receipts_target||2500), expenseTarget=Number(settings.monthly_expense_target||20000), checkingTarget=Number(settings.available_cash_target||10000), expenses=Number(monthly.business_expenses||0);
    const outputVatRaw=report.tax?.output_vat_exact;
    const incomeTaxRaw=report.tax?.income_tax_estimate;
    const hasTaxData=outputVatRaw!==null&&outputVatRaw!==undefined&&incomeTaxRaw!==null&&incomeTaxRaw!==undefined;
    const outputVat=Number(outputVatRaw||0), incomeTax=Number(incomeTaxRaw||0), grossProfit=sales-outputVat-incomeTax, grossProfitMargin=sales>0?grossProfit/sales:0;
    const latest=report.sales?.latest?new Date(`${String(report.sales.latest).slice(0,10)}T00:00:00`):new Date(); let elapsed=0; for(let d=1;d<=latest.getDate();d+=1){const dt=new Date(latest.getFullYear(),latest.getMonth(),d);if(dt.getDay()!==5&&dt.getDay()!==6)elapsed+=1;} const remaining=Math.max(23-elapsed,0), immediateProgress=immediateTarget>0?immediate/immediateTarget*100:0, gap=Math.max(immediateTarget-immediate,0), required=remaining>0?gap/remaining:gap;
    const checkingGap=checkingBalance-checkingTarget, expenseProgress=expenses>0&&expenseTarget>0?expenses/expenseTarget*100:0, checkingProgress=checkingTarget>0?Math.max(0,checkingBalance/checkingTarget)*100:0;
    setText("immediate-receipts",money(immediate),immediate>=immediateTarget?"pos":null); setText("immediate-receipts-progress-note",gap<=0?"היעד הושג":`${numberText(immediateProgress,1)}% מהיעד · חסרים ${money(gap)}`); setProgress("immediate-progress-bar",immediateProgress,immediateProgress>=100?"green":immediateProgress>=75?"amber":"pink"); setText("immediate-receipts-daily-needed",money(required),required<=dailyTarget?"pos":"warn"); setText("immediate-receipts-daily-needed-note",`${remaining} ימי עבודה נותרו · יעד יומי רגיל ${money(dailyTarget)}`);
    setText("monthly-expenses",expenses>0?money(expenses):"אין נתון",expenses>expenseTarget?"neg":expenses>0?"pos":null); setText("monthly-expense-target",money(expenseTarget)); setText("monthly-expenses-note",expenses>0?(expenses>expenseTarget?`חריגה של ${money(expenses-expenseTarget)}`:`נותרה מסגרת של ${money(expenseTarget-expenses)}`):"ה־RPC עדיין אינו מחזיר הוצאות חודשיות בפועל"); setProgress("expense-progress-bar",expenseProgress,expenses>expenseTarget?"red":"green");
    setText("checking-target",money(checkingTarget)); setText("checking-target-note",checkingGap>=0?`מעל היעד ב־${money(checkingGap)}`:`חסרים ${money(Math.abs(checkingGap))} ליעד`); setProgress("checking-target-progress-bar",checkingProgress,checkingBalance>=checkingTarget?"green":checkingBalance>=0?"amber":"red"); setText("checking-gap-note",checkingGap>=0?`העו״ש מעל היעד ב־${money(checkingGap)}`:`חסרים ${money(Math.abs(checkingGap))} ליעד עו״ש של ${money(checkingTarget)}`); setProgress("checking-progress-bar",checkingProgress,checkingBalance>=checkingTarget?"green":checkingBalance>=0?"amber":"red");
    if(hasTaxData){
      setText("gross-profit",money(grossProfit),grossProfit>=0?"pos":"neg");
      setText("gross-profit-margin",`${numberText(grossProfitMargin*100,1)}%`,grossProfitMargin>=0?"pos":"neg");
      setText("gross-profit-note",`מכירות ${money(sales)} פחות מע״מ עסקאות ${money(outputVat)} ופחות מס הכנסה ${money(incomeTax)}`);
    }else{
      setText("gross-profit","אין נתון","warn");
      setText("gross-profit-margin","—");
      setText("gross-profit-note","החישוב ממתין לנתוני מע״מ עסקאות ומס הכנסה מלאים ועדכניים");
    }
  }

  function renderCashflowInsights(days,checkingBalance){ const totalIncome=days.reduce((s,d)=>s+d.income,0),totalExpense=days.reduce((s,d)=>s+d.expense,0),net=totalIncome-totalExpense,ending=days.at(-1)?.projectedBalance??checkingBalance,low=days.reduce((a,d)=>!a||d.projectedBalance<a.projectedBalance?d:a,null),largest=days.reduce((a,d)=>!a||d.expense>a.expense?d:a,null),coverage=totalExpense>0?totalIncome/totalExpense:0; setText("forecast-income",money(totalIncome),"pos"); setText("forecast-expense",money(totalExpense),totalExpense>0?"neg":null); setText("forecast-net",money(net),net>=0?"pos":"neg"); setText("forecast-ending-balance",money(ending),ending>=0?"pos":"neg"); setText("forecast-low-day",low?dateText(low.date):"—",low?.projectedBalance>=0?"pos":"neg"); setText("forecast-low-note",low?`יתרה חזויה: ${money(low.projectedBalance)}`:"אין נתונים"); setText("forecast-largest-expense-day",largest&&largest.expense>0?dateText(largest.date):"—"); setText("forecast-largest-expense-note",largest&&largest.expense>0?`הוצאה צפויה: ${money(largest.expense)}`:"אין הוצאות מתוזמנות"); setText("forecast-coverage",`${numberText(coverage*100,0)}%`,coverage>=1?"pos":"neg"); setText("forecast-coverage-note",coverage>=1?"ההכנסות הצפויות מכסות את ההוצאות":`חסר כיסוי של ${money(Math.max(totalExpense-totalIncome,0))}`); setProgress("coverage-progress-bar",coverage*100,coverage>=1?"green":coverage>=.75?"amber":"red"); return{totalIncome,totalExpense,net,endingBalance:ending,coverage}; }

  function renderOpportunities(report){ const monthly=report.monthly||{},sales=Number(report.sales?.income||monthly.sales||0),immediate=Number(monthly.immediate_receipts||0),debts=Number(monthly.customer_debts||report.debts?.customers||0),gap=Math.max(sales-immediate,0); setMetric("customer-debts",debts); setMetric("uncollected-sales",gap); setText("uncollected-sales-note",gap>0?"כולל אשראי עתידי, חוב והפרשי תזמון":"כל המכירות תורגמו לתקבול מיידי"); }

  function renderAssets(report){
    const positiveAccounts=(report.accounts||[]).filter((x)=>x.scope==="business"&&Number(x.balance||0)>0);
    const loanItems=Array.isArray(report.loan_items)?report.loan_items:Array.isArray(report.loans?.items)?report.loans.items:Array.isArray(report.loans?.details)?report.loans.details:[];
    const loans=report.loans||{};
    const cards=[];
    const totalDebt=Number(loans.balance||loanItems.reduce((sum,item)=>sum+Number(item.balance||item.current_balance||0),0));
    if(totalDebt>0){ cards.push(`<article class="asset-card liability-card debt-total-card"><span>סך החוב הכולל</span><strong class="neg">${money(totalDebt)}</strong><dl><div><dt>מספר הלוואות</dt><dd>${loanItems.length||loans.count||0}</dd></div><div><dt>החזר חודשי כולל</dt><dd>${money(loans.monthly||loanItems.reduce((sum,item)=>sum+Number(item.monthly_payment||item.monthly||0),0))}</dd></div><div><dt>התשלום הקרוב</dt><dd>${dateText(loans.next_payment)}</dd></div></dl></article>`); }
    if(loanItems.length){ loanItems.forEach((loan,index)=>cards.push(`<article class="asset-card liability-card"><span>${escapeHtml(loan.name||loan.lender||`הלוואה ${index+1}`)}</span><strong class="neg">${money(loan.balance||loan.current_balance||0)}</strong><button class="asset-toggle" type="button" aria-expanded="false">הצג פירוט</button><div class="asset-details" hidden><dl><div><dt>יתרה נוכחית</dt><dd>${money(loan.balance||loan.current_balance||0)}</dd></div><div><dt>יתרה מקורית</dt><dd>${loan.original_balance?money(loan.original_balance):"לא זמין"}</dd></div><div><dt>החזר חודשי</dt><dd>${money(loan.monthly_payment||loan.monthly||0)}</dd></div><div><dt>ריבית</dt><dd>${loan.interest_rate?`${numberText(loan.interest_rate,2)}%`:"לא זמין"}</dd></div><div><dt>תשלום הבא</dt><dd>${dateText(loan.next_payment||loan.next_payment_date)}</dd></div></dl></div></article>`)); }
    positiveAccounts.forEach((account)=>cards.push(`<article class="asset-card"><span>${escapeHtml(account.name||"נכס עסקי")}</span><strong class="pos">${money(account.balance||0)}</strong><button class="asset-toggle" type="button" aria-expanded="false">הצג פירוט</button><div class="asset-details" hidden><dl><div><dt>סוג</dt><dd>${escapeHtml(account.type||"חשבון")}</dd></div><div><dt>תחום</dt><dd>${escapeHtml(account.scope||"עסקי")}</dd></div><div><dt>מקור</dt><dd>${escapeHtml(account.source||"Supabase")}</dd></div></dl></div></article>`));
    if(!cards.length) cards.push('<article class="asset-card data-missing-card"><span>הלוואות ונכסים</span><strong>אין נתון</strong><p>ה־RPC עדיין אינו מחזיר פירוט הלוואות או חשבונות חיוביים.</p></article>');
    assetContainer.innerHTML=cards.join("");
    assetContainer.querySelectorAll(".asset-toggle").forEach((button)=>button.addEventListener("click",()=>{const panel=button.nextElementSibling;const open=button.getAttribute("aria-expanded")!=="true";button.setAttribute("aria-expanded",String(open));button.textContent=open?"הסתר פירוט":"הצג פירוט";panel.hidden=!open;}));
  }

  function renderManagementOverview(report,cashflow){ const sales=Number(report.sales?.income||0),target=Number(report.settings?.monthly_sales_target||report.sales?.target||0),checking=Number((report.accounts||[]).find((x)=>x.name==="עו״ש עסק – הבינלאומי")?.balance||0),tax=Number(report.tax?.total_tax_reserve||0),salesScore=target>0?Math.min(sales/target,1):0,cashScore=checking>=0?1:0,taxScore=tax>0?1:.5,coverageScore=Math.min(cashflow.coverage,1),score=Math.round((salesScore*.35+cashScore*.25+taxScore*.15+coverageScore*.25)*100); setText("health-score",`${score}/100`,score>=80?"pos":score>=60?"warn":"neg");setText("health-score-note",score>=80?"העסק מציג תמונה חזקה ברוב המדדים":score>=60?"מצב ביניים: יש חוזקות לצד פערים":"נדרשת פעולה ממוקדת בנזילות ובכיסוי"); if(checking<0){setText("primary-risk","עו״ש שלילי","neg");setText("primary-risk-note",`יתרה נוכחית ${money(checking)}`);}else if(cashflow.coverage<1){setText("primary-risk","כיסוי תזרימי חלקי","warn");setText("primary-risk-note",`כיסוי של ${numberText(cashflow.coverage*100,0)}% בלבד`);}else{setText("primary-risk","אין סיכון מיידי","pos");setText("primary-risk-note","המדדים המרכזיים אינם מצביעים על חריגה מיידית");} setText("health-improvement",checking<10000?"לחזק יתרת עו״ש":salesScore<1?"להאיץ מכירות":"לשמור על הקצב",checking<10000?"warn":salesScore<1?"warn":"pos"); setText("health-improvement-note",checking<10000?"יעד עו״ש פעיל: ₪10,000":salesScore<1?`נותרו ${money(Math.max(target-sales,0))} ליעד`:"להמשיך לעקוב אחר גבייה והוצאות"); if(cashflow.endingBalance<0){setText("primary-insight","פער תזרימי צפוי","neg");setText("primary-insight-note",`היתרה החזויה בסוף התקופה היא ${money(cashflow.endingBalance)}`);}else if(salesScore<1){setText("primary-insight","יעד המכירות עדיין פעיל","warn");setText("primary-insight-note",`נותרו ${money(Math.max(target-sales,0))} ליעד`);}else{setText("primary-insight","יעד המכירות הושג","pos");setText("primary-insight-note",`המכירות מעל היעד ב־${money(sales-target)}`);} }

  function renderReport(report){
    const accounts=report.accounts||[],checkingAccount=accounts.find((x)=>x.name==="עו״ש עסק – הבינלאומי"),deposit=accounts.find((x)=>x.name==="פיקדון בבינלאומי"),fx=accounts.find((x)=>x.name==="יתרות מט״ח"),checking=Number(checkingAccount?.balance||0),future=(report.future_clearing||[]).filter((x)=>x.status==="expected").reduce((s,x)=>s+Number(x.net||0),0);
    setMetric("sales",report.sales?.income||0); setMetric("checking",checking,"balance"); setMetric("deposit-balance",deposit?.balance||0); setMetric("fx-balance",fx?.balance||0); setMetric("future-clearing",future); setMetric("output-vat",report.tax?.output_vat_exact||0); setMetric("input-vat",report.tax?.input_vat_estimate||0); setMetric("vat-payable",report.tax?.vat_payable_estimate||0); setMetric("income-tax",report.tax?.income_tax_estimate||0); setMetric("all-tax-reserve",Number(report.tax?.vat_payable_estimate||0)+Number(report.tax?.income_tax_estimate||0));
    const days=buildForecast(report); renderSalesInsights(report); renderBusinessKpis(report,checking); renderOpportunities(report); renderAssets(report); const cashflow=renderCashflowInsights(days,checking); renderManagementOverview(report,cashflow); renderDays(days);
    lastUpdated.textContent=`עודכן מהמסד: ${new Intl.DateTimeFormat("he-IL",{dateStyle:"short",timeStyle:"medium"}).format(new Date())}`;
  }

  async function loadReport(){ if(isLoading)return; isLoading=true; reportError.hidden=true; refreshBtn.disabled=true; refreshBtn.textContent="מרענן..."; try{ const {data,error}=await client.rpc(config.reportRpc,{_cache_bust:Date.now()}); if(error&&error.code==="PGRST202"){const fallback=await client.rpc(config.reportRpc); if(fallback.error) throw fallback.error; const report=normalizeReport(fallback.data); if(!report) throw new Error("לא התקבלו נתונים מהשרת"); renderReport(report);}else{if(error)throw error;const report=normalizeReport(data);if(!report)throw new Error("לא התקבלו נתונים מהשרת");renderReport(report);}}catch(error){console.error(error);reportError.textContent=`שגיאה בטעינת הדו״ח: ${error.message}`;reportError.hidden=false;}finally{refreshBtn.disabled=false;refreshBtn.textContent="רענון";isLoading=false;} }

  function stopRefresh(){ if(refreshTimer)clearInterval(refreshTimer); refreshTimer=null; }
  function showLogin(){ stopRefresh(); appView.hidden=true; loginView.hidden=false; reportView.hidden=false; loginSubmit.disabled=false; loginSubmit.textContent="כניסה"; activeUser.textContent="—"; }
  async function showReport(session){ loginView.hidden=true; appView.hidden=false; reportView.hidden=false; await updateActiveUser(session); await loadReport(); stopRefresh(); refreshTimer=setInterval(loadReport,config.refreshIntervalMs||30000); }
  function friendlyAuthError(error){ if(!error) return "לא ניתן להתחבר כרגע."; if(error.message?.toLowerCase().includes("invalid login credentials")) return "האימייל או הסיסמה אינם נכונים."; if(error.message?.toLowerCase().includes("email not confirmed")) return "כתובת האימייל עדיין לא אושרה."; return `ההתחברות נכשלה: ${error.message}`; }

  loginForm.addEventListener("submit",async(event)=>{
    event.preventDefault();
    loginError.hidden=true;
    loginSubmit.disabled=true;
    loginSubmit.textContent="מתחבר...";
    try{
      const email=document.getElementById("email").value.trim();
      const password=passwordInput.value;
      const remember=rememberDevice.checked;
      localStorage.setItem("beautix-remember-device",String(remember));
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error) throw error;
      if(!data.session) throw new Error("לא נוצרה התחברות פעילה");
      await showReport(data.session);
    }catch(error){
      console.error(error);
      loginError.textContent=friendlyAuthError(error);
      loginError.hidden=false;
      loginSubmit.disabled=false;
      loginSubmit.textContent="כניסה";
    }
  });

  togglePassword.addEventListener("click",()=>{const visible=passwordInput.type==="text";passwordInput.type=visible?"password":"text";togglePassword.textContent=visible?"הצג סיסמה":"הסתר סיסמה";togglePassword.setAttribute("aria-pressed",String(!visible));});
  authAction.addEventListener("click",async()=>{ await client.auth.signOut(); showLogin(); });
  refreshBtn.addEventListener("click",loadReport);
  expandAllBtn.addEventListener("click",()=>setAllCards(true));
  collapseAllBtn.addEventListener("click",()=>setAllCards(false));

  client.auth.getSession().then(({data,error})=>{
    if(error){ console.error(error); showLogin(); return; }
    data.session?showReport(data.session):showLogin();
  }).catch((error)=>{ console.error(error); showLogin(); });

  client.auth.onAuthStateChange((event,session)=>{
    if(event==="SIGNED_OUT"||!session) showLogin();
    else if(event==="SIGNED_IN"||event==="TOKEN_REFRESHED") updateActiveUser(session);
  });
})();