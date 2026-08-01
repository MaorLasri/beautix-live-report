(() => {
  if (window.__beautixCashflowRangeSelectorV1Loaded) return;
  window.__beautixCashflowRangeSelectorV1Loaded = true;

  const cfg = window.BEAUTIX_CONFIG;
  if (!cfg || !window.supabase) return;

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const money = value => new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 2
  }).format(Number(value || 0));
  const dateText = value => value ? new Intl.DateTimeFormat('he-IL').format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : '—';
  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const iso = date => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  const addDays = (value, days) => {
    const d = new Date(`${value}T00:00:00`);
    d.setDate(d.getDate() + days);
    return iso(d);
  };
  const daysBetweenInclusive = (start, end) => {
    const a = new Date(`${start}T00:00:00`);
    const b = new Date(`${end}T00:00:00`);
    return Math.floor((b - a) / 86400000) + 1;
  };

  let state = {
    start: localStorage.getItem('beautix-cashflow-range-start') || iso(new Date()),
    end: localStorage.getItem('beautix-cashflow-range-end') || addDays(iso(new Date()), 29),
    loading: false
  };

  function ensureStyle() {
    if (document.getElementById('cashflow-range-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'cashflow-range-style-v1';
    style.textContent = `
      .cashflow-range-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 18px;padding:16px;border:1px solid #e2dceb;border-radius:18px;background:#fff;box-shadow:0 8px 26px rgba(70,45,100,.07);box-sizing:border-box;max-width:100%;overflow:hidden}
      .cashflow-range-controls>*{min-width:0;max-width:100%;box-sizing:border-box}
      .cashflow-range-controls label{display:grid;gap:6px;font-weight:800;color:#566176;min-width:0;max-width:100%}
      .cashflow-range-controls input{display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;min-height:44px;padding:9px 11px;border:1px solid #d8deea;border-radius:12px;background:#fff;font:inherit;color:#25384d;overflow:hidden}
      .cashflow-range-actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;min-width:0}.cashflow-range-actions button{min-height:42px;padding:8px 13px;border:1px solid #d9dcea;border-radius:12px;background:#fff;color:#573074;font:inherit;font-weight:800;cursor:pointer;box-sizing:border-box;max-width:100%}.cashflow-range-actions .primary{border:0;background:linear-gradient(90deg,#f22991,#8743b7);color:#fff}.cashflow-range-status{grid-column:1/-1;margin:0;color:#6f7a8b;font-weight:700;overflow-wrap:anywhere}.cashflow-range-status.error{color:#b53b48}
      @media(max-width:620px){.cashflow-range-controls{grid-template-columns:minmax(0,1fr);padding:14px}.cashflow-range-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.cashflow-range-actions .primary{grid-column:1/-1}.cashflow-range-controls input{font-size:16px}}
    `;
    document.head.appendChild(style);
  }

  function ensureControls() {
    const days = document.getElementById('days');
    if (!days || document.getElementById('cashflow-range-controls')) return;
    ensureStyle();
    const wrap = document.createElement('section');
    wrap.id = 'cashflow-range-controls';
    wrap.className = 'cashflow-range-controls';
    wrap.innerHTML = `
      <label>מתאריך<input id="cashflow-range-start" type="date" value="${state.start}"></label>
      <label>עד תאריך<input id="cashflow-range-end" type="date" value="${state.end}"></label>
      <div class="cashflow-range-actions">
        <button type="button" id="cashflow-range-prev">טווח קודם</button>
        <button type="button" id="cashflow-range-next">טווח הבא</button>
        <button type="button" id="cashflow-range-reset">30 ימים מהיום</button>
        <button type="button" id="cashflow-range-apply" class="primary">הצגת הטווח</button>
      </div>
      <p id="cashflow-range-status" class="cashflow-range-status">ניתן לבחור טווח של עד 366 ימים, בעבר או בעתיד.</p>`;
    days.insertAdjacentElement('beforebegin', wrap);

    const start = document.getElementById('cashflow-range-start');
    const end = document.getElementById('cashflow-range-end');
    document.getElementById('cashflow-range-apply').addEventListener('click', () => applyRange(start.value, end.value));
    document.getElementById('cashflow-range-reset').addEventListener('click', () => {
      const today = iso(new Date()); start.value = today; end.value = addDays(today, 29); applyRange(start.value, end.value);
    });
    document.getElementById('cashflow-range-prev').addEventListener('click', () => shiftRange(-1));
    document.getElementById('cashflow-range-next').addEventListener('click', () => shiftRange(1));
  }

  function shiftRange(direction) {
    const start = document.getElementById('cashflow-range-start');
    const end = document.getElementById('cashflow-range-end');
    if (!start?.value || !end?.value) return;
    const length = daysBetweenInclusive(start.value, end.value);
    start.value = addDays(start.value, direction * length);
    end.value = addDays(end.value, direction * length);
    applyRange(start.value, end.value);
  }

  function setStatus(text, isError = false) {
    const el = document.getElementById('cashflow-range-status');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('error', isError);
  }

  function renderEntries(entries, type) {
    const filtered = entries.filter(entry => entry.type === type);
    if (!filtered.length) return '<li class="empty">אין תנועות</li>';
    return filtered.map(entry => `<li><span>${escapeHtml(entry.description || 'תנועה')}</span><strong>${money(entry.amount)}</strong><small>${escapeHtml(entry.state === 'forecast' ? 'תחזית' : 'בפועל')}</small></li>`).join('');
  }

  function renderDays(report) {
    const container = document.getElementById('days');
    if (!container) return;
    let balance = Number((window.__beautixLastReport?.accounts || []).find(x => x.name === 'עו״ש עסק – הבינלאומי')?.balance || 0);
    const days = (report.daily || []).map(day => {
      balance += Number(day.net || 0);
      return { ...day, income: Number(day.inflows || 0), expense: Number(day.outflows || 0), projectedBalance: balance };
    });
    container.innerHTML = days.map((day, index) => `<article class="day-card" data-day-card><button class="day-toggle" type="button" aria-expanded="false" aria-controls="range-day-panel-${index}"><div class="summary-date"><span class="chevron">⌄</span><div><h3>${dateText(day.date)}</h3><small>${day.event_count || 0} תנועות</small></div></div><div class="day-kpis"><div><span>הכנסות</span><strong class="pos">${money(day.income)}</strong></div><div><span>הוצאות</span><strong class="neg">${money(day.expense)}</strong></div><div><span>נטו</span><strong class="${Number(day.net)>=0?'pos':'neg'}">${money(day.net)}</strong></div><div><span>יתרה חזויה</span><strong class="${day.projectedBalance>=0?'pos':'neg'}">${money(day.projectedBalance)}</strong></div></div></button><div id="range-day-panel-${index}" hidden><div class="day-body"><section><h4>הכנסות</h4><ul>${renderEntries(day.entries || [], 'income')}</ul></section><section><h4>הוצאות</h4><ul>${renderEntries(day.entries || [], 'expense')}</ul></section></div></div></article>`).join('');
    container.querySelectorAll('[data-day-card]').forEach(card => card.querySelector('.day-toggle').addEventListener('click', () => {
      const button = card.querySelector('.day-toggle');
      const panel = card.querySelector('[id^="range-day-panel-"]');
      const open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open)); panel.hidden = !open; card.classList.toggle('is-open', open);
    }));

    const totalIncome = Number(report.inflows || 0), totalExpense = Number(report.outflows || 0), net = Number(report.net || 0);
    const ending = days.at(-1)?.projectedBalance ?? balance;
    const low = days.reduce((a, d) => !a || d.projectedBalance < a.projectedBalance ? d : a, null);
    const largest = days.reduce((a, d) => !a || d.expense > a.expense ? d : a, null);
    const coverage = totalExpense > 0 ? totalIncome / totalExpense : 0;
    const set = (id, value, cls) => { const el = document.getElementById(id); if (!el) return; el.textContent = value; el.classList.remove('pos','neg','warn'); if (cls) el.classList.add(cls); };
    set('forecast-income', money(totalIncome), 'pos'); set('forecast-expense', money(totalExpense), totalExpense ? 'neg' : null);
    set('forecast-net', money(net), net >= 0 ? 'pos' : 'neg'); set('forecast-ending-balance', money(ending), ending >= 0 ? 'pos' : 'neg');
    set('forecast-low-day', low ? dateText(low.date) : '—', low?.projectedBalance >= 0 ? 'pos' : 'neg'); set('forecast-low-note', low ? `יתרה חזויה: ${money(low.projectedBalance)}` : 'אין נתונים');
    set('forecast-largest-expense-day', largest?.expense > 0 ? dateText(largest.date) : '—'); set('forecast-largest-expense-note', largest?.expense > 0 ? `הוצאה צפויה: ${money(largest.expense)}` : 'אין הוצאות בטווח');
    set('forecast-coverage', `${Math.round(coverage * 100)}%`, coverage >= 1 ? 'pos' : 'neg'); set('forecast-coverage-note', coverage >= 1 ? 'ההכנסות בטווח מכסות את ההוצאות' : 'חסר כיסוי מלא להוצאות בטווח');
    const progress = document.getElementById('coverage-progress-bar'); if (progress) progress.style.width = `${Math.max(0, Math.min(coverage * 100, 100))}%`;
  }

  async function applyRange(start, end) {
    if (state.loading) return;
    if (!start || !end || end < start) return setStatus('תאריך הסיום חייב להיות זהה לתאריך ההתחלה או מאוחר ממנו.', true);
    const days = daysBetweenInclusive(start, end);
    if (days < 1 || days > 366) return setStatus('ניתן להציג טווח של יום אחד עד 366 ימים.', true);
    state.loading = true; setStatus('טוען את התזרים לטווח שנבחר…');
    try {
      const { data, error } = await client.rpc('get_cashflow_horizon_v1', { p_as_of_date: start, p_days: days, p_scope: 'business' });
      if (error) throw error;
      state.start = start; state.end = end;
      localStorage.setItem('beautix-cashflow-range-start', start); localStorage.setItem('beautix-cashflow-range-end', end);
      renderDays(data);
      setStatus(`מוצג תזרים עסקי מ־${dateText(start)} עד ${dateText(end)} · ${days} ימים`);
    } catch (error) {
      console.error(error); setStatus(`לא ניתן לטעון את הטווח: ${error.message}`, true);
    } finally { state.loading = false; }
  }

  function boot() {
    ensureControls();
    if (document.getElementById('cashflow-range-controls')) applyRange(state.start, state.end);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
  window.addEventListener('beautix:report-loaded', () => {
    ensureControls();
    if (state.start && state.end) applyRange(state.start, state.end);
  });
})();