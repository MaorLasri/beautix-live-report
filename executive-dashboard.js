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

  const parseMoney = value => {
    const normalized = String(value || "").replace(/[^0-9,.-]/g, "").replace(/,/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  };
  const parsePercent = value => {
    const number = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  };
  const money = value => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(value || 0));
  const text = id => document.getElementById(id)?.textContent?.trim() || "—";
  const numeric = id => parseMoney(text(id));
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function renderKpis() {
    const sales = numeric("sales");
    const target = numeric("sales-target");
    const forecast = numeric("sales-forecast");
    const ending = numeric("forecast-ending-balance");
    const monthlyLoan = [...document.querySelectorAll("#loan-asset-cards .debt-total-card dd")].map(el => parseMoney(el.textContent)).find(value => value > 0) || 0;
    const cards = [
      ["◎", "עמידה צפויה ביעד", target > 0 ? `${((forecast / target) * 100).toFixed(1)}%` : "—", target > 0 ? `${money(forecast)} תחזית / ${money(target)} יעד` : "ממתין ליעד מכירות"],
      ["₪", "מכירות החודש", money(sales), text("sales-note")],
      ["↗", "תחזית סוף חודש", money(forecast), text("sales-forecast-note")],
      ["◈", "יתרה חזויה ל־30 יום", money(ending), text("forecast-low-note")],
      ["⌁", "החזרי הלוואות חודשיים", monthlyLoan ? money(monthlyLoan) : "—", monthlyLoan ? "לפי פירוט ההלוואות הפעילות" : "אין נתון החזר חודשי זמין"]
    ];
    document.getElementById("executive-kpis").innerHTML = cards.map(([icon, label, value, note]) => `<article class="executive-kpi"><div class="executive-kpi-icon">${icon}</div><div class="executive-kpi-copy"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div></article>`).join("");
  }

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

  function renderSalesPanel() {
    const sales = numeric("sales"), target = numeric("sales-target"), forecast = numeric("sales-forecast"), daily = numeric("sales-daily-rate"), gap = numeric("sales-gap"), immediate = numeric("immediate-receipts");
    const progress = parsePercent(text("sales-progress"));
    const dayMatch = text("sales-daily-rate-note").match(/(\d+)/);
    const day = dayMatch ? Math.max(1, Number(dayMatch[1])) : Math.max(1, new Date().getDate());
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    document.getElementById("executive-sales-summary").innerHTML = [["בפועל", money(sales)], ["יעד", money(target)], ["תחזית", money(forecast)], ["קצב יומי", money(daily)], ["פער מהיעד", money(gap)], ["תקבולים מיידיים", money(immediate)]].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
    document.getElementById("executive-sales-chart").innerHTML = salesChartSvg(sales, target, forecast, day, monthEnd);
    document.getElementById("executive-sales-progress").innerHTML = `<div class="executive-progress-row"><span>התקדמות מול היעד</span><b>${progress.toFixed(1)}%</b></div><div class="executive-progress-track"><i style="width:${Math.max(0, Math.min(progress, 100))}%"></i></div><small>${escapeHtml(text("sales-progress-note"))}</small>`;
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
  }

  function renderLoans() {
    const source = document.getElementById("loan-asset-cards");
    const totalCard = source?.querySelector(".debt-total-card");
    const total = totalCard ? parseMoney(totalCard.querySelector("strong")?.textContent) : 0;
    const loanCards = [...(source?.querySelectorAll(".liability-card:not(.debt-total-card)") || [])];
    const max = Math.max(1, ...loanCards.map(card => parseMoney(card.querySelector("strong")?.textContent)));
    document.getElementById("executive-loans-total").textContent = total ? money(total) : "—";
    const list = document.getElementById("executive-loan-list");
    if (!loanCards.length) {
      list.innerHTML = `<div class="executive-loans-empty">אין כרגע פירוט הלוואות פעיל להצגה. הכרטיסים הקיימים נשארים ללא שינוי בהמשך הדוח.</div>`;
      return;
    }
    list.innerHTML = loanCards.map(card => {
      const name = card.querySelector("span")?.textContent?.trim() || "הלוואה";
      const balance = parseMoney(card.querySelector("strong")?.textContent);
      const details = [...card.querySelectorAll("dd")].map(el => el.textContent.trim());
      return `<div class="executive-loan-row"><span>${escapeHtml(name)}</span><strong>${money(balance)}</strong><div class="executive-loan-bar"><i style="width:${Math.max(4, balance / max * 100)}%"></i></div><small class="executive-loan-meta">${escapeHtml(details.slice(1, 3).join(" · ") || "הפירוט המלא נשמר בכרטיס המקורי")}</small></div>`;
    }).join("");
  }

  function renderAll() {
    if (text("sales") === "—") return;
    renderKpis();
    renderSalesPanel();
    renderLoans();
  }
  const observer = new MutationObserver(() => window.requestAnimationFrame(renderAll));
  ["sales", "sales-target", "sales-forecast", "sales-progress", "forecast-ending-balance", "loan-asset-cards"].forEach(id => {
    const element = document.getElementById(id);
    if (element) observer.observe(element, { childList: true, subtree: true, characterData: true });
  });
  renderAll();
})();