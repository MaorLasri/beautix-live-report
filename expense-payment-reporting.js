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

  function card(label, value, note, cls = '') {
    return `<article class="card expense-payment-card"><span>${label}</span><strong class="${cls}">${value}</strong><p>${note}</p></article>`;
  }

  function render(report) {
    if (!report?.monthly || !report?.payment_accounting) return;
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
    const rows = methods.map(item => `<tr><td>${methodNames[item.payment_method] || item.payment_method || 'לא ידוע'}</td><td>${money(item.expense_amount)}</td><td>${money(item.paid_amount)}</td><td>${money(item.unpaid_amount)}</td></tr>`).join('');

    section.innerHTML = `
      <div class="section-title-block">
        <span class="section-kicker">הוצאות מול תשלומים</span>
        <h2>הפרדה בין מועד העסקה למועד ירידת הכסף</h2>
        <p>הוצאות מוצגות לפי תאריך העסקה; תשלומים מוצגים לפי היום שבו הכסף יצא בפועל.</p>
      </div>
      <div class="grid health-grid expense-payment-grid">
        ${card('הוצאות עסקיות החודש', money(businessExpenses), 'לפי תאריך העסקה או יצירת ההתחייבות', businessExpenses > 0 ? 'neg' : '')}
        ${card('תשלומים עסקיים החודש', money(businessPayments), 'לפי תאריך הירידה בפועל מהבנק או מהקופה', businessPayments > 0 ? 'neg' : '')}
        ${card('הוצאות אשראי שטרם נקשרו לתשלום', money(pendingCredit), `${pendingCount} עסקאות אשראי דחויות`, pendingCredit > 0 ? 'warn' : 'pos')}
        ${card('הוצאות אישיות החודש', money(monthly.personal_expenses || 0), 'אינן נכללות בהוצאות העסקיות', '')}
      </div>
      <div class="card expense-payment-methods">
        <span>פירוט לפי אמצעי תשלום</span>
        <div class="table-wrap"><table><thead><tr><th>אמצעי תשלום</th><th>הוצאות</th><th>שולם</th><th>טרם שולם</th></tr></thead><tbody>${rows || '<tr><td colspan="4">אין נתונים</td></tr>'}</tbody></table></div>
      </div>`;

    const monthlyExpenses = document.getElementById('monthly-expenses');
    if (monthlyExpenses) {
      const label = monthlyExpenses.closest('.card')?.querySelector('span');
      if (label) label.textContent = 'הוצאות החודש לפי תאריך עסקה';
      const note = document.getElementById('monthly-expenses-note');
      if (note) note.textContent = `${note.textContent} · תשלומים בפועל: ${money(businessPayments)}`;
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
