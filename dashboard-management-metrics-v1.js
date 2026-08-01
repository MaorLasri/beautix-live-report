(() => {
  if (window.__beautixDashboardManagementMetricsV1Loaded) return;
  window.__beautixDashboardManagementMetricsV1Loaded = true;

  const money = value => new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 2
  }).format(Number(value || 0));
  const number = (value, digits = 1) => new Intl.NumberFormat('he-IL', {
    maximumFractionDigits: digits
  }).format(Number(value || 0));
  const dateText = value => value
    ? new Intl.DateTimeFormat('he-IL').format(new Date(`${String(value).slice(0, 10)}T00:00:00`))
    : '—';

  function setText(id, value, tone = null) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.classList.remove('pos', 'neg', 'warn');
    if (tone) el.classList.add(tone);
  }

  function setProgress(id, value, tone = 'pink') {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = `${Math.max(0, Math.min(Number(value || 0), 100))}%`;
    el.dataset.tone = tone;
  }

  function render(report) {
    const metrics = report?.management_metrics;
    const sales = metrics?.sales;
    const profitability = metrics?.profitability;
    if (!sales || !profitability) return;

    const progress = Number(sales.progress_percent || 0);
    const gap = Number(sales.gap || 0);
    const target = Number(sales.target || 0);
    const forecast = Number(sales.forecast || 0);
    const dailyRate = Number(sales.daily_workday_rate || 0);
    const required = Number(sales.required_per_remaining_workday || 0);
    const remaining = Number(sales.remaining_workdays || 0);

    setText('sales-target', money(target));
    setText('sales-note', `${number(progress)}% מהיעד הפעיל`);
    setText('sales-progress', `${number(progress)}%`, progress >= 100 ? 'pos' : progress >= 80 ? 'warn' : null);
    setProgress('sales-progress-bar', progress, progress >= 100 ? 'green' : progress >= 80 ? 'amber' : 'pink');
    setText('sales-progress-note', progress >= 100
      ? `היעד הושג. היעד הבא יופעל לפי כלל 90% ו־30%`
      : `נותרו ${money(gap)} ליעד · היעד יעלה בהגעה ל־${money(sales.next_raise_at)}`);
    setText('sales-daily-rate', money(dailyRate));
    setText('sales-daily-rate-note', `${sales.elapsed_workdays} ימי עבודה חלפו בתקופה`);
    setText('sales-forecast', money(forecast), forecast >= target ? 'pos' : 'warn');
    setText('sales-forecast-note', forecast >= target
      ? `תחזית מעל היעד ב־${money(forecast - target)}`
      : `תחזית נמוכה מהיעד ב־${money(target - forecast)}`);
    setText('sales-gap', money(gap), gap <= 0 ? 'pos' : 'neg');
    setText('sales-gap-note', remaining > 0
      ? `נדרש ${money(required)} לכל אחד מ־${remaining} ימי העבודה שנותרו`
      : gap > 0 ? `התקופה הסתיימה עם פער של ${money(gap)}` : 'היעד הושג');
    setText('immediate-receipts-daily-needed', money(required), required <= 2500 ? 'pos' : 'warn');
    setText('immediate-receipts-daily-needed-note', `${remaining} ימי עבודה נותרו בתקופה`);

    const list = document.getElementById('sales-milestones');
    if (list) {
      list.innerHTML = (sales.milestones || []).map(item => {
        const achieved = item.status === 'achieved';
        return `<li class="${achieved ? 'achieved' : 'active'}"><span>${money(item.amount)}</span><small>${achieved ? `הושג ב־${dateText(item.achieved_date)}` : 'יעד פעיל'}</small></li>`;
      }).join('');
    }

    const profitValue = profitability.profit_after_tax == null
      ? Number(profitability.operating_profit || 0)
      : Number(profitability.profit_after_tax || 0);
    const profitCard = document.getElementById('gross-profit')?.closest('.card');
    const label = profitCard?.querySelector(':scope > span');
    if (label) label.textContent = profitability.profit_after_tax == null ? 'רווח תפעולי' : 'רווח לאחר מס';
    setText('gross-profit', money(profitValue), profitValue >= 0 ? 'pos' : 'neg');
    setText('gross-profit-margin', profitability.operating_margin_percent == null
      ? '—'
      : `${number(profitability.operating_margin_percent)}%`,
      Number(profitability.operating_margin_percent || 0) >= 0 ? 'pos' : 'neg');
    setText('gross-profit-note', profitability.profit_after_tax == null
      ? `מכירות פחות הוצאות מוכרות. נתוני המס לתקופה עדיין חסרים.`
      : `רווח תפעולי פחות רזרבת המס של התקופה.`);
  }

  window.addEventListener('beautix:report-loaded', event => render(event.detail));
})();