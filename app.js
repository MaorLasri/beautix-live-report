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
  const daysContainer = document.getElementById("days");
  const lastUpdated = document.getElementById("last-updated");

  let refreshTimer = null;

  const money = (value) => {
    const number = Number(value || 0);
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 2
    }).format(number);
  };

  const dateText = (value) => {
    if (!value) return "—";
    const normalized = String(value).slice(0, 10);
    const date = new Date(`${normalized}T00:00:00`);
    return new Intl.DateTimeFormat("he-IL").format(date);
  };

  function setMetric(id, value, polarity = null) {
    const element = document.getElementById(id);
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
      list.push({
        ...event,
        type: normalizeEntryType(event.type)
      });
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
      const income = entries
        .filter((entry) => entry.type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0);
      const expense = entries
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0);
      const net = income - expense;
      balance += net;

      days.push({
        date: key,
        entries,
        income,
        expense,
        net,
        projectedBalance: balance
      });
    }

    return days;
  }

  function renderEntries(entries, type) {
    const filtered = entries.filter((entry) => entry.type === type);
    if (!filtered.length) {
      return '<li class="empty">אין תנועות</li>';
    }

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

  function renderDays(days) {
    daysContainer.innerHTML = days.map((day, index) => `
      <article class="day-card" data-day-card>
        <button class="day-toggle" type="button" aria-expanded="false" aria-controls="day-panel-${index}">
          <div class="summary-date">
            <span class="chevron">⌄</span>
            <div>
              <h3>${dateText(day.date)}</h3>
              <small>${day.entries.length} תנועות</small>
            </div>
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
            <section>
              <h4>הכנסות</h4>
              <ul>${renderEntries(day.entries, "income")}</ul>
            </section>
            <section>
              <h4>הוצאות</h4>
              <ul>${renderEntries(day.entries, "expense")}</ul>
            </section>
          </div>
        </div>
      </article>
    `).join("");

    document.querySelectorAll("[data-day-card]").forEach((card) => {
      const button = card.querySelector(".day-toggle");
      const panel = card.querySelector("div[id^='day-panel-']");
      button.addEventListener("click", () => {
        const open = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!open));
        panel.hidden = open;
        card.classList.toggle("is-open", !open);
      });
    });
  }

  function renderReport(report) {
    const accounts = report.accounts || [];
    const checkingAccount = accounts.find((item) => item.name === "עו״ש עסק – הבינלאומי");
    const futureClearing = (report.future_clearing || [])
      .filter((item) => item.status === "expected")
      .reduce((sum, item) => sum + Number(item.net || 0), 0);

    setMetric("sales", report.sales?.income || 0);
    setMetric("sales-target", report.settings?.monthly_sales_target || 0);
    setMetric("checking", checkingAccount?.balance || 0, "balance");
    setMetric("future-clearing", futureClearing);
    setMetric("output-vat", report.tax?.output_vat_exact || 0);
    setMetric("input-vat", report.tax?.input_vat_estimate || 0);
    setMetric("vat-payable", report.tax?.vat_payable_estimate || 0);
    setMetric("tax-reserve", report.tax?.total_tax_reserve || 0);

    renderDays(buildForecast(report));
    lastUpdated.textContent = `עודכן: ${new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(new Date())}`;
  }

  async function loadReport() {
    reportError.hidden = true;
    refreshBtn.disabled = true;
    try {
      const { data, error } = await client.rpc(config.reportRpc);
      if (error) throw error;
      const report = normalizeReport(data);
      if (!report) throw new Error("לא התקבלו נתונים מהשרת");
      renderReport(report);
    } catch (error) {
      console.error(error);
      reportError.textContent = `שגיאה בטעינת הדו״ח: ${error.message}`;
      reportError.hidden = false;
    } finally {
      refreshBtn.disabled = false;
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
    refreshTimer = setInterval(loadReport, config.refreshIntervalMs);
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

  refreshBtn.addEventListener("click", loadReport);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !reportView.hidden) loadReport();
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