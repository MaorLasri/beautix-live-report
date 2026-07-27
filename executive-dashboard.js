(() => {
  const reportView = document.getElementById("report-view");
  if (!reportView) return;

  const executive = document.createElement("section");
  executive.id = "executive-overview";
  executive.className = "executive-overview";
  executive.setAttribute("aria-label", "סקירה ניהולית מורחבת");
  executive.innerHTML = `<div id="executive-kpis" class="executive-kpis"></div><div class="executive-report-grid"><article class="executive-panel"><div class="executive-panel-head"><div><span class="executive-eyebrow">מכירות ויעדים</span><h3>מגמת מכירות חודשית</h3></div><div class="executive-legend"><span><i class="executive-dot actual"></i>בפועל</span><span><i class="executive-dot target"></i>יעד</span><span><i class="executive-dot forecast"></i>תחזית</span></div></div><div id="executive-sales-summary" class="executive-sales-summary"></div><div id="executive-sales-chart" class="executive-chart"></div><div id="executive-sales-progress" class="executive-progress"></div></article><article class="executive-panel"><div class="executive-panel-head"><div><span class="executive-eyebrow">קצב שבועי</span><h3>שבוע מול שבוע</h3></div></div><div id="executive-weekly-bars" class="weekly-bars"></div><p id="executive-weekly-note" class="weekly-note"></p></article></div><article class="executive-panel executive-loans-panel"><div class="executive-panel-head"><div><span class="executive-eyebrow">התחייבויות</span><h3>הלוואות פעילות</h3></div><p class="executive-source-note">סיכום חזותי נוסף; כל הכרטיסים והפירוט הקיימים נשמרים בהמשך הדוח.</p></div><div class="executive-loans-summary"><span>סך החוב הכולל</span><strong id="executive-loans-total">—</strong></div><div id="executive-loan-list" class="executive-loan-list"></div></article>`;
  const legend = reportView.querySelector(".status-legend");
  legend ? legend.insertAdjacentElement("afterend", executive) : reportView.prepend(executive);

  const money = value => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(value || 0));
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const dateOnly = value => value ? new Date(`${String(value).slice(0,10)}T00:00:00`) : new Date();

  function salesChartSvg(sales, target, forecast, day, monthEnd) {
    const width = 760, height = 290, left = 48, right = 730, top = 24, bottom = 250;
    const max = Math.max(target, forecast, sales, 1) * 1.12;
    const x = d => left + ((Math.max(1, d) - 1) / Math.max(monthEnd - 1, 1)) * (right - left);
    const y = v => bottom - (Math.max(0, v) / max) * (bottom - top);
    const actualPoints = [];
    const samples = Math.max(2, Math.min(day, 8));
    for (let i = 0; i < samples; i += 1) {
      const d = 1 + ((day - 1) * i / (samples - 1));
      actualPoints.push(`${x(d)},${y(sales * i / (samples - 1))}`);
    }
    const forecastPoints = `${x(day)},${y(sales)} ${x(monthEnd)},${y(forecast)}`;
    const area = `${left},${bottom} ${actualPoints.join(" ")} ${x(day)},${bottom}`;
    const grid = [0, .25, .5, .75, 1].map(p => `<line class="grid-line" x1="${left}" x2="${right}" y1="${top + (bottom - top) * p}" y2="${top + (bottom - top) * p}"/>`).join("");
    const labels = [1, 7, 14, 21, monthEnd].filter((v, i, a) => a.indexOf(v) === i && v <= monthEnd).map(v => `<text x="${x(v)}" y="278" text-anchor="middle">${v}</text>`).join("");
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="מגמת מכירות חודשית, יעד ותחזית">${grid}<polygon class="chart-area" points="${area}"/><line class="target-line" x1="${left}" y1="${bottom}" x2="${right}" y2="${y(target)}"/><polyline class="actual-line" points="${actualPoints.join(" ")}"/><polyline class="forecast-line" points="${forecastPoints}"/><circle cx="${x(day)}" cy="${y(sales)}" r="6" fill="#fff" stroke="currentColor" stroke-width="4"/>${labels}</svg>`;
  }

  function render(report) {
    const sales = Number(report?.sales?.income || 0);
    const target = Number(report?.settings?.monthly_sales_target ?? report?.sales?.target ?? 0);
    const latest = dateOnly(report?.sales?.latest);
    const day = Math.max(1, latest.getDate());
    const monthEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 0).getDate();
    const daily = sales / day;
    const forecast = daily * monthEnd;
    const gap = target - sales;
    const progress = target > 0 ? sales / target * 100 : 0;
    const immediate = Number(report?.monthly?.immediate_receipts || report?.monthly?.bank_receipts || 0);
    const checking = Number((report?.accounts || []).find(x => x.name === "עו״ש עסק – הבינלאומי")?.balance || 0);
    const forecastEntries = Array.isArray(report?.daily) ? report.daily : [];
    const forecastEnding = forecastEntries.length ? checking + forecastEntries.reduce((sum, d) => sum + Number(d.net || 0), 0) : checking;
    const loans = Array.isArray(report?.loan_items) ? report.loan_items : Array.isArray(report?.loans?.items) ? report.loans.items : [];
    const loanTotal = Number(report?.loans?.balance || loans.reduce((s, l) => s + Number(l.current_balance || l.balance || 0), 0));
    const loanMonthly = Number(report?.loans?.monthly || loans.reduce((s, l) => s + Number(l.monthly_payment || 0), 0));

    const cards = [
      ["◎", "עמידה צפויה ביעד", target > 0 ? `${((forecast / target) * 100).toFixed(1)}%` : "—", target > 0 ? `${money(forecast)} תחזית / ${money(target)} יעד` : "ממתין ליעד מכירות"],
      ["₪", "מכירות החודש", money(sales), target > 0 ? `${progress.toFixed(1)}% מהיעד הפעיל` : "יעד לא זמין"],
      ["↗", "תחזית סוף חודש", money(forecast), target > 0 ? (forecast >= target ? `מעל היעד ב־${money(forecast-target)}` : `מתחת ליעד ב־${money(target-forecast)}`) : ""],
      ["◈", "יתרה חזויה ל־30 יום", money(forecastEnding), `יתרת פתיחה ${money(checking)}`],
      ["⌁", "החזרי הלוואות חודשיים", money(loanMonthly), `${loans.length} הלוואות פעילות`]
    ];
    document.getElementById("executive-kpis").innerHTML = cards.map(([icon, label, value, note]) => `<article class="executive-kpi"><div class="executive-kpi-icon">${icon}</div><div class="executive-kpi-copy"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div></article>`).join("");

    document.getElementById("executive-sales-summary").innerHTML = [["בפועל", money(sales)], ["יעד", money(target)], ["תחזית", money(forecast)], ["קצב יומי", money(daily)], ["פער מהיעד", money(Math.abs(gap))], ["תקבולים מיידיים", money(immediate)]].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    document.getElementById("executive-sales-chart").innerHTML = salesChartSvg(sales, target, forecast, day, monthEnd);
    document.getElementById("executive-sales-progress").innerHTML = `<div class="executive-progress-row"><span>התקדמות מול היעד</span><b>${progress.toFixed(1)}%</b></div><div class="executive-progress-track"><i style="width:${Math.max(0, Math.min(progress, 100))}%"></i></div><small>${target > 0 ? (gap <= 0 ? `היעד הושג ונחצה ב־${money(Math.abs(gap))}` : `נותרו ${money(gap)} ליעד`) : "יעד מכירות לא זמין"}</small>`;

    const actualRate = day > 0 ? sales / day : 0;
    const targetRate = monthEnd > 0 ? target / monthEnd : 0;
    const currentWeek = Math.min(4, Math.max(1, Math.ceil(day / 7)));
    const rows = Array.from({ length: 4 }, (_, index) => {
      const start = index * 7 + 1, end = Math.min(monthEnd, start + 6), daysInWeek = Math.max(1, end - start + 1), elapsed = Math.max(0, Math.min(day, end) - start + 1);
      return { label: `שבוע ${index + 1}`, actual: actualRate * elapsed, target: targetRate * daysInWeek, active: index + 1 === currentWeek };
    });
    const max = Math.max(1, ...rows.flatMap(row => [row.actual, row.target]));
    document.getElementById("executive-weekly-bars").innerHTML = rows.map(row => `<div class="week-col"><div class="week-bar actual" style="height:${Math.max(2, row.actual / max * 88)}%"><span class="week-value">${money(row.actual)}</span></div><div class="week-bar target" style="height:${Math.max(2, row.target / max * 88)}%"></div><span class="week-label">${row.label}${row.active ? " · נוכחי" : ""}</span></div>`).join("");
    document.getElementById("executive-weekly-note").textContent = "ההשוואה השבועית משתמשת בקצב המכירות היומי וביעד החודשי הקיימים; היא אינה מחליפה נתוני עסקאות שבועיים מפורטים.";

    document.getElementById("executive-loans-total").textContent = loanTotal ? money(loanTotal) : "—";
    const maxLoan = Math.max(1, ...loans.map(l => Number(l.current_balance || l.balance || 0)));
    document.getElementById("executive-loan-list").innerHTML = loans.length ? loans.map(loan => {
      const balance = Number(loan.current_balance || loan.balance || 0);
      const installment = loan.current_installment && loan.total_installments ? `${loan.current_installment} / ${loan.total_installments}` : "—";
      const type = loan.interest_type === "interest_free" ? "ללא ריבית" : loan.interest_type === "variable" ? "ריבית משתנה" : "הלוואה";
      return `<div class="executive-loan-row"><span>${escapeHtml(type)}</span><strong>${money(balance)}</strong><div class="executive-loan-bar"><i style="width:${Math.max(4, balance / maxLoan * 100)}%"></i></div><small class="executive-loan-meta">${escapeHtml(`${loan.name || loan.lender || "הלוואה"} · ${installment} · ${loan.start_date ? new Intl.DateTimeFormat("he-IL").format(dateOnly(loan.start_date)) : "ללא תאריך"}`)}</small></div>`;
    }).join("") : `<div class="executive-loans-empty">אין כרגע פירוט הלוואות פעיל להצגה.</div>`;
  }

  window.addEventListener("beautix:report-loaded", event => render(event.detail));
  if (window.__beautixLastReport) render(window.__beautixLastReport);
})();