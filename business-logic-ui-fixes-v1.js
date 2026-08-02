(() => {
  if (window.__beautixBusinessLogicUiFixesV1) return;
  window.__beautixBusinessLogicUiFixesV1 = true;

  const cfg = window.BEAUTIX_CONFIG;
  if (!cfg || !window.supabase) return;

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const money = value => new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 2
  }).format(Number(value || 0));

  function replaceLeafText(root, from, to) {
    if (!root) return;
    root.querySelectorAll('*').forEach(el => {
      if (el.children.length === 0 && el.textContent.trim() === from) el.textContent = to;
    });
  }

  function applyStaticCopy() {
    const cashflow = document.querySelector('.cashflow-section');
    replaceLeafText(cashflow, 'תחזית 30 יום', 'תזרים לתקופה');
    replaceLeafText(cashflow, 'תנועות צפויות לפי המידע הקיים במערכת', 'תנועות עסקיות בפועל ומתוכננות לפי הטווח שנבחר');
    replaceLeafText(cashflow, 'הכנסות צפויות', 'הכנסות בטווח');
    replaceLeafText(cashflow, 'הוצאות צפויות', 'הוצאות בטווח');
    replaceLeafText(cashflow, 'נטו צפוי', 'נטו בטווח');

    document.querySelectorAll('p').forEach(p => {
      const text = p.textContent.trim();
      if (text.includes('ה־RPC עדיין אינו מחזיר הוצאות חודשיות בפועל')) {
        p.textContent = 'הוצאות עסקיות מאושרות בפועל בחודש הפעיל';
      } else if (text === 'מכירות פחות הוצאות מוכרות. נתוני המס לתקופה עדיין חסרים.') {
        p.textContent = 'מכירות עסקיות פחות הוצאות תפעוליות עסקיות שאושרו בפועל. נתוני המס מוצגים בנפרד.';
      }
    });
  }

  function applyQueueCopy() {
    const badge = document.getElementById('cashflow-confirmation-count');
    const list = document.getElementById('cashflow-confirmation-list');
    if (!badge || !list) return;

    const total = Number.parseInt(badge.textContent, 10) || 0;
    const shown = list.querySelectorAll('.cashflow-confirmation-item').length;
    badge.textContent = total > shown ? `${total} ממתינות · מוצגות ${shown}` : `${total} ממתינות`;
    badge.style.minWidth = 'auto';
    badge.style.whiteSpace = 'nowrap';

    const subtitle = document.querySelector('.cashflow-confirmation-head p');
    if (subtitle) subtitle.textContent = 'התנועות שהגיע מועדן ועדיין לא אושרו, מהישנות לחדשות.';
  }

  function setMetricNote(id, text) {
    const value = document.getElementById(id);
    const card = value?.closest('article, .card');
    const note = card?.querySelector('p');
    if (note) note.textContent = text;
  }

  async function applyRangeBreakdown(detail) {
    const start = detail?.start || localStorage.getItem('beautix-cashflow-range-start');
    const end = detail?.end || localStorage.getItem('beautix-cashflow-range-end');
    if (!start || !end) return;

    const days = Math.floor((new Date(`${end}T00:00:00`) - new Date(`${start}T00:00:00`)) / 86400000) + 1;
    if (days < 1 || days > 366) return;

    const { data, error } = await client.rpc('get_cashflow_horizon_v1', {
      p_as_of_date: start,
      p_days: days,
      p_scope: 'business'
    });
    if (error) {
      console.error('business logic range breakdown', error);
      return;
    }

    const totals = (data?.daily || []).flatMap(day => day.entries || []).reduce((acc, entry) => {
      const bucket = entry.state === 'actual' ? 'actual' : 'forecast';
      const type = entry.type === 'income' ? 'income' : 'expense';
      acc[bucket][type] += Number(entry.amount || 0);
      return acc;
    }, {
      actual: { income: 0, expense: 0 },
      forecast: { income: 0, expense: 0 }
    });

    setMetricNote('forecast-income', `בוצע בפועל: ${money(totals.actual.income)} · מתוכנן: ${money(totals.forecast.income)}`);
    setMetricNote('forecast-expense', `בוצע בפועל: ${money(totals.actual.expense)} · מתוכנן: ${money(totals.forecast.expense)}`);

    const largestNote = document.getElementById('forecast-largest-expense-note');
    if (largestNote?.textContent.includes('הוצאה צפויה')) {
      largestNote.textContent = largestNote.textContent.replace('הוצאה צפויה', 'הוצאה בטווח');
    }
  }

  function run(detail) {
    applyStaticCopy();
    applyQueueCopy();
    applyRangeBreakdown(detail);
  }

  window.addEventListener('beautix:cashflow-range-rendered', event => run(event.detail));
  window.addEventListener('beautix:report-loaded', () => setTimeout(() => run(), 50));
  window.addEventListener('beautix:cashflow-confirmed', () => setTimeout(() => applyQueueCopy(), 100));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => run(), 150), { once: true });
  } else {
    setTimeout(() => run(), 150);
  }
})();
