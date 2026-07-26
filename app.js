(() => {
  const config = window.BEAUTIX_CONFIG;
  const client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey
  );

  const loginView = document.getElementById("login-view");
  const reportView = document.getElementById("report-view");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const reportError = document.getElementById("report-error");
  const refreshBtn = document.getElementById("refresh-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const expandAllBtn = document.getElementById("expand-all-btn");
  const collapseAllBtn = document.getElementById("collapse-all-btn");
  const daysContainer = document.getElementById("days");
  const lastUpdated = document.getElementById("last-updated");

  let refreshTimer = null;
  let isLoading = false;

  const money = (value) => new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

  const numberText = (value, digits = 1) => new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: digits
  }).format(Number(value || 0));

  const dateText = (value) => {
    if (!value) return "—";
    const normalized = String(value).slice(0, 10);
    const date = new Date(`${normalized}T00:00:00`);
    return new Intl.DateTimeFormat("he-IL").format(date);
  };

  const setText = (id, value, className = null) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = value;
    element.classList.remove("pos", "neg", "warn");
    if (className) element.classList.add(className);
  };

  function setMetric(id, value, polarity = null) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = money(value);
    element.classList.remove("pos", "neg");
    if (polarity === "balance") {
      element.classList.add(Number(value) >= 0 ? "pos" : "neg");
    }
  }

  function normalizeReport(payload) {
    if (Array.isArray(payload) && payload.length === 1 && payload[0]?.report) {
      return payload[0].report;
    }
    if (payload?.report) return payload.report;
    return payload;
  }

  function normalizeEntryType(type) {
    const normalized = String(type || "").toLowerCase();
    if (["income", "receipt", "credit"].includes(normalized)) return "income";
    if (["expense", "loan_payment", "debit"].includes(normalized)) return "expense";
    return normalized;
  }

  function buildForecast(report) {
    const accounts = report.accounts || [];
    const daily = report.daily || [];
    const clearing = report.future_clearing || [];
    const checkingAccount = accounts.find((item) => item.name === "עו״ש עסק – הבינלאומי");
    let balance = Number(checkingAccount?.balance || 0);
    const eventsByDate = new Map();

    const addEvent = (date, event) => {
      if (!date) return;
      const key = String(date).slice(0, 10);
      const list = eventsByDate.get(key) || [];
      list.push({ ...event, type: normalizeEntryType(event.type) });
      eventsByDate.set(key, list);
    };

    daily.forEach((day) => {
      (day.entries || []).forEach((entry) => addEvent(day.date, {
        type: entry.type,
        description: entry.description || "תנועה",
        amount: Math.abs(Number(entry.amount || 0)),
        source: entry.source || "Supabase"
      }));
    });

    clearing.forEach((item) => {
      if (item.status !== "expected") return;
      addEvent(item.date, {
        type: "income",
        description: "זיכוי סליקה עתידי",
        amount: Math.abs(Number(item.net || 0)),
        source: item.source_reference || "Supabase"
      });
    });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const days = [];

    for (let i = 0; i < 30; i += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      const key = current.toISOString().slice(0, 10);
      const entries = eventsByDate.get(key) || [];
      const income = entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
      const expense = entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
      const net = income - expense;
      balance += net;
      days.push({ date: key, entries, income, expense, net, projectedBalance: balance });
    }

    return days;
  }

  function renderEntries(entries, type) {
    const filtered = entries.filter((entry) => entry.type === type);
    if (!filtered.length) return '<li class="empty">אין תנועות</li>';
    return filtered.map((entry) => `
      <li>
        <span>${escapeHtml(entry.description)}</span>
        <strong>${money(entry.amount)}</strong>
        <small>${escapeHtml(entry.source || "Supabase")}</small>
      </li>
    `).join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setCardOpen(card, open) {
    const button = card.querySelector(".day-toggle");
    const panel = card.querySelector("div[id^='day-panel-']");
    button.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    card.classList.toggle("is-open", open);
  }

  function setAllCards(open) {
    document.querySelectorAll("[data-day-card]").forEach((card) => setCardOpen(card, open));
  }

  function renderDays(days) {
    daysContainer.innerHTML = days.map((day, index) => `
      <article class="day-card" data-day-card>
        <button class="day-toggle" type="button" aria-expanded="false" aria-controls="day-panel-${index}">
          <div class="summary-date">
            <span class="chevron">⌄</span>
            <div><h3>${dateText(day.date)}</h3><small>${day.entries.length} תנועות</small></div>
          </div>
          <div class="day-kpis">
            <div><span>הכנסות</span><strong class="pos">${money(day.income)}</strong></div>
            <div><span>הוצאות</span><strong class="neg">${money(day.expense)}</strong></div>
            <div><span>נטו</span><strong class="${day.net >= 0 ? "pos" : "neg"}">${money(day.net)}</strong></div>
            <div><span>יתרה חזויה</span><strong class="${day.projectedBalance >= 0 ? "pos" : "neg"}">${money(day.projectedBalance)}</strong></div>
          </div>
        </button>
        <div id="day-panel-${index}" hidden>
          <div class="day-body">
            <section><h4>הכנסות</h4><ul>${renderEntries(day.entries, "income")}</ul></section>
            <section><h4>הוצאות</h4><ul>${renderEntries(day.entries, "expense")}</ul></section>
          </div>
        </div>
      </article>
    `).join("");

    document.querySelectorAll("[data-day-card]").forEach((card) => {
      const button = card.querySelector(".day-toggle");
      button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") === "true";
        setCardOpen(card, !open);
      });
    });
  }

  function renderSalesInsights(report) {
    const sales = Number(report.sales?.income || 0);
    const target = Number(report.settings?.monthly_sales_target || report.sales?.target || 0);
    const latestDate = report.sales?.latest ? new Date(`${String(report.sales.latest).slice(0, 10)}T00:00:00`) : new Date();
    const dayOfMonth = Math.max(1, latestDate.getDate());
    const monthEnd = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0).getDate();
    const dailyRate = sales / dayOfMonth;
    const forecast = dailyRate * monthEnd;
    const progress = target > 0 ? (sales / target) * 100 : 0;
    const gap = target - sales;

    setText("sales-progress", `${numberText(progress, 1)}%`, progress >= 100 ? "pos" : progress >= 80 ? "warn" : null);
    setText("sales-progress-note", progress >= 100 ? "היעד החודשי הושג" : `נותרו ${money(Math.max(gap, 0))} ליעד`);
    setText("sales-daily-rate", money(dailyRate));
    setText("sales-daily-rate-note", `ממוצע לפי ${dayOfMonth} ימים בחודש`);
    setText("sales-forecast", money(forecast), forecast >= target ? "pos" : "warn");
    setText("sales-forecast-note", forecast >= target ? "בקצב הנוכחי היעד צפוי להישבר" : "בקצב הנוכחי צפוי חוסר מול היעד");
    setText("sales-gap", money(Math.abs(gap)), gap <= 0 ? "pos" : "neg");
    setText("sales-gap-note", gap <= 0 ? `מעל היעד ב־${money(Math.abs(gap))}` : `נדרש קצב של ${money(gap / Math.max(monthEnd - dayOfMonth, 1))} ליום עד סוף החודש`);
  }

  function renderBusinessKpis(report, checkingBalance) {
    const settings = report.settings || {};
    const monthly = report.monthly || {};
    const sales = Number(report.sales?.income || monthly.sales || 0);
    const immediateReceipts = Number(monthly.immediate_receipts || monthly.bank_receipts || 0);
    const immediateTarget = Number(settings.monthly_revenue_target || 57500);
    const dailyTarget = Number(settings.daily_immediate_receipts_target || 2500);
    const expenseTarget = Number(settings.monthly_expense_target || 20000);
    const checkingTarget = Number(settings.available_cash_target || 10000);
    const netMarginTarget = Number(settings.net_profit_margin_target || 0.3);
    const expenses = Number(monthly.business_expenses || 0);
    const totalTaxReserve = Number(report.tax?.total_tax_reserve || 0);

    const latestDate = report.sales?.latest ? new Date(`${String(report.sales.latest).slice(0, 10)}T00:00:00`) : new Date();
    const year = latestDate.getFullYear();
    const month = latestDate.getMonth();
    const totalWorkingDays = 23;
    let elapsedWorkingDays = 0;
    for (let day = 1; day <= latestDate.getDate(); day += 1) {
      const d = new Date(year, month, day);
      const weekday = d.getDay();
      if (weekday !== 5 && weekday !== 6) elapsedWorkingDays += 1;
    }
    const remainingWorkingDays = Math.max(totalWorkingDays - elapsedWorkingDays, 0);
    const immediateProgress = immediateTarget > 0 ? (immediateReceipts / immediateTarget) * 100 : 0;
    const immediateGap = Math.max(immediateTarget - immediateReceipts, 0);
    const requiredDaily = remainingWorkingDays > 0 ? immediateGap / remainingWorkingDays : immediateGap;

    const estimatedNetProfit = sales - expenses - totalTaxReserve;
    const estimatedNetMargin = sales > 0 ? estimatedNetProfit / sales : 0;
    const checkingGap = checkingBalance - checkingTarget;

    setText("immediate-receipts", money(immediateReceipts), immediateReceipts >= immediateTarget ? "pos" : null);
    setText("immediate-receipts-note", monthly.immediate_receipts_status === "confirmed" ? "נתון מאומת מהמערכת" : "מבוסס על הנתון החודשי הזמין");
    setText("immediate-receipts-target", money(immediateTarget));
    setText("immediate-receipts-target-note", `${money(dailyTarget)} × ${totalWorkingDays} ימי עבודה`);
    setText("immediate-receipts-progress", `${numberText(immediateProgress, 1)}%`, immediateProgress >= 100 ? "pos" : immediateProgress >= 75 ? "warn" : "neg");
    setText("immediate-receipts-progress-note", immediateGap <= 0 ? "היעד הושג" : `חסרים ${money(immediateGap)} ליעד החודשי`);
    setText("immediate-receipts-daily-needed", money(requiredDaily), requiredDaily <= dailyTarget ? "pos" : "warn");
    setText("immediate-receipts-daily-needed-note", `${remainingWorkingDays} ימי עבודה נותרו לפי מודל של 23 ימים`);

    setText("monthly-expenses", expenses > 0 ? money(expenses) : "אין נתון", expenses > expenseTarget ? "neg" : expenses > 0 ? "pos" : null);
    setText("monthly-expenses-note", expenses > 0 ? (expenses > expenseTarget ? `חריגה של ${money(expenses - expenseTarget)}` : `נותרה מסגרת של ${money(expenseTarget - expenses)}`) : "ה־RPC עדיין אינו מחזיר הוצאות חודשיות בפועל");
    setText("monthly-expense-target", money(expenseTarget));
    setText("monthly-expense-target-note", "יעד הוצאות חודשי קבוע");

    setText("checking-gap", money(Math.abs(checkingGap)), checkingGap >= 0 ? "pos" : "neg");
    setText("checking-gap-note", checkingGap >= 0 ? `העו״ש מעל היעד ב־${money(checkingGap)}` : `חסרים ${money(Math.abs(checkingGap))} ליעד עו״ש של ${money(checkingTarget)}`);

    setText("net-margin", `${numberText(estimatedNetMargin * 100, 1)}%`, estimatedNetMargin >= netMarginTarget ? "pos" : "warn");
    setText("net-margin-note", expenses > 0 ? `יעד: ${numberText(netMarginTarget * 100, 0)}% לאחר רזרבת מס` : "חישוב חלקי עד שיוחזרו הוצאות חודשיות בפועל");
  }

  function renderCashflowInsights(days, checkingBalance) {
    const totalIncome = days.reduce((sum, day) => sum + day.income, 0);
    const totalExpense = days.reduce((sum, day) => sum + day.expense, 0);
    const net = totalIncome - totalExpense;
    const endingBalance = days.at(-1)?.projectedBalance ?? checkingBalance;
    const lowDay = days.reduce((lowest, day) => !lowest || day.projectedBalance < lowest.projectedBalance ? day : lowest, null);
    const largestExpenseDay = days.reduce((largest, day) => !largest || day.expense > largest.expense ? day : largest, null);
    const coverage = totalExpense > 0 ? totalIncome / totalExpense : 0;

    setText("forecast-income", money(totalIncome), "pos");
    setText("forecast-expense", money(totalExpense), totalExpense > 0 ? "neg" : null);
    setText("forecast-net", money(net), net >= 0 ? "pos" : "neg");
    setText("forecast-ending-balance", money(endingBalance), endingBalance >= 0 ? "pos" : "neg");

    setText("forecast-low-day", lowDay ? dateText(lowDay.date) : "—", lowDay?.projectedBalance >= 0 ? "pos" : "neg");
    setText("forecast-low-note", lowDay ? `יתרה חזויה: ${money(lowDay.projectedBalance)}` : "אין נתונים");
    setText("forecast-largest-expense-day", largestExpenseDay && largestExpenseDay.expense > 0 ? dateText(largestExpenseDay.date) : "—");
    setText("forecast-largest-expense-note", largestExpenseDay && largestExpenseDay.expense > 0 ? `הוצאה צפויה: ${money(largestExpenseDay.expense)}` : "אין הוצאות מתוזמנות");
    setText("forecast-coverage", `${numberText(coverage * 100, 0)}%`, coverage >= 1 ? "pos" : "neg");
    setText("forecast-coverage-note", coverage >= 1 ? "ההכנסות הצפויות מכסות את ההוצאות" : `חסר כיסוי של ${money(Math.max(totalExpense - totalIncome, 0))}`);
  }

  function renderReport(report) {
    const accounts = report.accounts || [];
    const checkingAccount = accounts.find((item) => item.name === "עו״ש עסק – הבינלאומי");
    const checkingBalance = Number(checkingAccount?.balance || 0);
    const futureClearing = (report.future_clearing || []).filter((item) => item.status === "expected").reduce((sum, item) => sum + Number(item.net || 0), 0);

    setMetric("sales", report.sales?.income || 0);
    setMetric("sales-target", report.settings?.monthly_sales_target || 0);
    setMetric("checking", checkingBalance, "balance");
    setMetric("future-clearing", futureClearing);
    setMetric("output-vat", report.tax?.output_vat_exact || 0);
    setMetric("input-vat", report.tax?.input_vat_estimate || 0);
    setMetric("vat-payable", report.tax?.vat_payable_estimate || 0);
    setMetric("tax-reserve", report.tax?.total_tax_reserve || 0);

    const days = buildForecast(report);
    renderSalesInsights(report);
    renderBusinessKpis(report, checkingBalance);
    renderCashflowInsights(days, checkingBalance);
    renderDays(days);

    lastUpdated.textContent = `עודכן מהמסד: ${new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
      timeStyle: "medium"
    }).format(new Date())}`;
  }

  async function loadReport() {
    if (isLoading) return;
    isLoading = true;
    reportError.hidden = true;
    refreshBtn.disabled = true;
    refreshBtn.textContent = "מרענן...";

    try {
      const { data, error } = await client.rpc(config.reportRpc, {
        _cache_bust: Date.now()
      });
      if (error && error.code === "PGRST202") {
        const fallback = await client.rpc(config.reportRpc);
        if (fallback.error) throw fallback.error;
        const report = normalizeReport(fallback.data);
        if (!report) throw new Error("לא התקבלו נתונים מהשרת");
        renderReport(report);
      } else {
        if (error) throw error;
        const report = normalizeReport(data);
        if (!report) throw new Error("לא התקבלו נתונים מהשרת");
        renderReport(report);
      }
    } catch (error) {
      console.error(error);
      reportError.textContent = `שגיאה בטעינת הדו״ח: ${error.message}`;
      reportError.hidden = false;
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "רענון";
      isLoading = false;
    }
  }

  function showLogin() {
    reportView.hidden = true;
    loginView.hidden = false;
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = null;
  }

  async function showReport() {
    loginView.hidden = true;
    reportView.hidden = false;
    await loadReport();
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(loadReport, config.refreshIntervalMs || 30000);
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.hidden = true;
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
      return;
    }
    await showReport();
  });

  logoutBtn.addEventListener("click", async () => {
    await client.auth.signOut();
    showLogin();
  });

  refreshBtn.addEventListener("click", async () => {
    await loadReport();
  });

  expandAllBtn.addEventListener("click", () => setAllCards(true));
  collapseAllBtn.addEventListener("click", () => setAllCards(false));

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !reportView.hidden) loadReport();
  });

  window.addEventListener("focus", () => {
    if (!reportView.hidden) loadReport();
  });

  client.auth.onAuthStateChange((_event, session) => {
    if (!session) showLogin();
  });

  (async () => {
    const { data: { session } } = await client.auth.getSession();
    if (session) await showReport();
    else showLogin();
  })();
})();