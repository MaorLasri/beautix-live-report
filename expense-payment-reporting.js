(() => {
  if (window.__beautixExpensePaymentReporting) return;
  window.__beautixExpensePaymentReporting = true;

  const money = value => new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-IL' : 'he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 2
  }).format(Number(value || 0));

  const methodNames = {
    cash: 'מזומן', check: 'צ׳ק', debit_card: 'דביט', credit_card: 'אשראי',
    bank_transfer: 'העברה בנקאית', direct_debit: 'חיוב חשבון', standing_order: 'הוראת קבע',
    bit: 'Bit', paybox: 'PayBox', mixed: 'משולב', unknown: 'לא ידוע'
  };

  function ensureStyles() {
    if (document.getElementById('expense-payment-reporting-style-v2')) return;
    const style = document.createElement('style');
    style.id = 'expense-payment-reporting-style-v2';
    style.textContent = `
      .expense-payment-section{display:grid;gap:18px}
      .expense-payment-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .expense-payment-card{display:grid;align-content:start;gap:8px;min-height:145px;padding:20px;border:1px solid #e4e8f0;border-radius:22px;background:#fff;box-shadow:0 10px 30px rgba(52,40,74,.06)}
      .expense-payment-card span{color:#7b8798;font-size:.95rem}
      .expense-payment-card strong{color:#20344b;font-size:clamp(1.55rem,4vw,2.2rem);line-height:1.1}
      .expense-payment-card p{margin:0;color:#8b96a5;font-size:.86rem;line-height:1.55}
      .expense-payment-methods{padding:18px;border:1px solid #e4e8f0;border-radius:22px;background:#fff;box-shadow:0 10px 30px rgba(52,40,74,.06)}
      .expense-payment-methods>span{display:block;margin-bottom:14px;color:#20344b;font-size:1.05rem;font-weight:800}
      .expense-payment-method-list{display:grid;gap:10px}
      .expense-payment-method-item{display:grid;grid-template-columns:minmax(120px,1.2fr) repeat(3,minmax(90px,1fr));gap:10px;align-items:center;padding:12px 14px;border:1px solid #edf0f5;border-radius:15px;background:#fafbfe}
      .expense-payment-method-item strong{color:#20344b}
      .expense-payment-method-value{display:grid;gap:2px;text-align:center}
      .expense-payment-method-value span{color:#8b96a5;font-size:.72rem}
      .expense-payment-method-value b{color:#20344b;font-size:.95rem}
      .expense-payment-empty{padding:18px;text-align:center;color:#8b96a5}
      @media(max-width:720px){
        .expense-payment-section .section-title-block{margin-bottom:0}
        .expense-payment-section .section-title-block h2{font-size:1.8rem;line-height:1.15}
        .expense-payment-grid{grid-template-columns:1fr;gap:12px}
        .expense-payment-card{min-height:0;padding:18px}
        .expense-payment-card strong{font-size:1.85rem}
        .expense-payment-methods{padding:14px}
        .expense-payment-method-item{grid-template-columns:1fr 1fr;gap:10px;padding:14px}
        .expense-payment-method-item>strong{grid-column:1/-1;padding-bottom:8px;border-bottom:1px solid #edf0f5}
        .expense-payment-method-value{text-align:right}
        .expense-payment-method-value:last-child{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px dashed #e3e7ef}
      }
    `;
    document.head.appendChild(style);
  }

  function card(label, value, note, cls = '') {
    return `<article class="expense-payment-card"><span>${label}</span><strong class="${cls}">${value}</strong><p>${note}</p></article>`;
  }

  function methodItem(item) {
    const name = methodNames[item.payment_method] || item.payment_method || 'לא ידוע';
    return `<article class="expense-payment-method-item">
      <strong>${name}</strong>
      <div class="expense-payment-method-value"><span>הוצאות</span><b>${money(item.expense_amount)}</b></div>
      <div class="expense-payment-method-value"><span>שולם</span><b>${money(item.paid_amount)}</b></div>
      <div class="expense-payment-method-value"><span>טרם שולם</span><b>${money(item.unpaid_amount)}</b></div>
    </article>`;
  }

  function render(report) {
    if (!report?.monthly || !report?.payment_accounting) return;
    ensureStyles();
    const monthly = report.monthly;
    const accounting = report.payment_accounting;
    const businessExpenses = Number(monthly.business_expenses || 0);
    const businessPayments = Number(monthly.business_payments || 0);
    const pendingCredit = Number(accounting.pending_credit_amount || 0);
    const pendingCount = Number(accounting.pending_credit_count || 0);

    let section = document.getElementById('expense-payment-accounting-section');
    if (!section) {
      section = document.createElement('section');
      section.id = 'expense-payment-accounting-section';
      section.className = 'dashboard-section expense-payment-section';
      const health = document.querySelector('.health-section');
      const cashflow = document.querySelector('.cashflow-section');
      const host = document.getElementById('report-view') || document.querySelector('main');
      if (cashflow?.parentNode) cashflow.parentNode.insertBefore(section, cashflow);
      else if (health?.parentNode) health.parentNode.insertBefore(section, health.nextSibling);
      else host?.appendChild(section);
    }

    const methods = Array.isArray(accounting.methods) ? accounting.methods : [];

    section.innerHTML = `
      <div class="section-title-block">
        <span class="section-kicker">הוצאות מול תשלומים</span>
        <h2>הפרדה בין מועד העסקה למועד ירידת הכסף</h2>
        <p>הוצאות מוצגות לפי תאריך העסקה; תשלומים מוצגים לפי היום שבו הכסף יצא בפועל.</p>
      </div>
      <div class="expense-payment-grid">
        ${card('הוצאות עסקיות החודש', money(businessExpenses), 'לפי תאריך העסקה או יצירת ההתחייבות', businessExpenses > 0 ? 'neg' : '')}
        ${card('תשלומים עסקיים החודש', money(businessPayments), 'לפי תאריך הירידה בפועל מהבנק או מהקופה', businessPayments > 0 ? 'neg' : '')}
        ${card('הוצאות אשראי שטרם נקשרו לתשלום', money(pendingCredit), `${pendingCount} עסקאות אשראי דחויות`, pendingCredit > 0 ? 'warn' : 'pos')}
        ${card('הוצאות אישיות החודש', money(monthly.personal_expenses || 0), 'אינן נכללות בהוצאות העסקיות', '')}
      </div>
      <div class="expense-payment-methods">
        <span>פירוט לפי אמצעי תשלום</span>
        <div class="expense-payment-method-list">${methods.length ? methods.map(methodItem).join('') : '<div class="expense-payment-empty">אין נתונים</div>'}</div>
      </div>`;

    const monthlyExpenses = document.getElementById('monthly-expenses');
    if (monthlyExpenses) {
      const label = monthlyExpenses.closest('.card')?.querySelector('span');
      if (label) label.textContent = 'הוצאות החודש לפי תאריך עסקה';
      const note = document.getElementById('monthly-expenses-note');
      if (note && !note.textContent.includes('תשלומים בפועל')) note.textContent = `${note.textContent} · תשלומים בפועל: ${money(businessPayments)}`;
    }

    const forecastExpense = document.getElementById('forecast-expense');
    if (forecastExpense) {
      const label = forecastExpense.closest('.card')?.querySelector('span');
      if (label) label.textContent = 'תשלומים צפויים ב־30 יום';
    }

    setTimeout(() => {
      document.querySelectorAll('.day-kpis span').forEach(el => {
        if (el.textContent.trim() === 'הוצאות') el.textContent = 'תשלומים';
      });
      document.querySelectorAll('.day-body h4').forEach(el => {
        if (el.textContent.trim() === 'הוצאות') el.textContent = 'תשלומים';
      });
    }, 0);
  }

  window.addEventListener('beautix:report-loaded', event => render(event.detail));
  window.addEventListener('beautix:language-changed', () => {
    if (window.__beautixLastReport) render(window.__beautixLastReport);
  });
  if (window.__beautixLastReport) render(window.__beautixLastReport);
})();
