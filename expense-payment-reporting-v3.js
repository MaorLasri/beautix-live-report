(() => {
  if (window.__beautixExpensePaymentReportingV3) return;
  window.__beautixExpensePaymentReportingV3 = true;

  const money = value => new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-IL' : 'he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 2
  }).format(Number(value || 0));

  const methodNames = {
    cash: 'מזומן', check: 'צ׳ק', debit_card: 'דביט', credit_card: 'אשראי',
    bank_transfer: 'העברה בנקאית', direct_debit: 'חיוב חשבון', standing_order: 'הוראת קבע',
    bit: 'Bit', paybox: 'PayBox', mixed: 'משולב', unknown: 'לא ידוע'
  };

  function ensureStyles() {
    if (document.getElementById('expense-payment-reporting-style-v3')) return;
    const style = document.createElement('style');
    style.id = 'expense-payment-reporting-style-v3';
    style.textContent = `
      .expense-payment-section{display:grid;gap:18px}
      .expense-payment-summary{display:grid;gap:12px}
      .expense-payment-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 14px;align-items:center;padding:17px 18px;border:1px solid #e3e7ef;border-radius:18px;background:#fff;box-shadow:0 8px 22px rgba(52,40,74,.06)}
      .expense-payment-card span{color:#6f7f91;font-size:.92rem}
      .expense-payment-card strong{grid-column:2;grid-row:1 / span 2;color:#20344b;font-size:1.45rem;white-space:nowrap}
      .expense-payment-card p{margin:0;color:#929dab;font-size:.78rem;line-height:1.45}
      .expense-payment-methods{padding:16px;border:1px solid #e3e7ef;border-radius:20px;background:#fff;box-shadow:0 8px 22px rgba(52,40,74,.06)}
      .expense-payment-methods>span{display:block;margin-bottom:12px;color:#20344b;font-size:1rem;font-weight:800}
      .expense-payment-method-list{display:grid;gap:9px}
      .expense-payment-method-item{display:grid;grid-template-columns:minmax(100px,1.2fr) repeat(3,minmax(78px,1fr));gap:8px;align-items:center;padding:11px 12px;border:1px solid #edf0f5;border-radius:14px;background:#fafbfe}
      .expense-payment-method-item>strong{color:#20344b}
      .expense-payment-method-value{display:grid;gap:2px;text-align:center}
      .expense-payment-method-value span{color:#8b96a5;font-size:.68rem}
      .expense-payment-method-value b{color:#20344b;font-size:.9rem}
      .expense-payment-build{margin-top:-4px;color:#a1a9b4;font-size:.66rem;text-align:left}
      @media(min-width:760px){.expense-payment-summary{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:720px){
        .expense-payment-section .section-title-block{margin-bottom:0}
        .expense-payment-section .section-title-block h2{font-size:1.65rem;line-height:1.2}
        .expense-payment-card{padding:15px 16px}
        .expense-payment-card strong{font-size:1.3rem}
        .expense-payment-methods{padding:13px}
        .expense-payment-method-item{grid-template-columns:1fr 1fr;gap:9px;padding:13px}
        .expense-payment-method-item>strong{grid-column:1/-1;padding-bottom:7px;border-bottom:1px solid #edf0f5}
        .expense-payment-method-value{text-align:right}
        .expense-payment-method-value:last-child{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding-top:7px;border-top:1px dashed #e3e7ef}
      }
    `;
    document.head.appendChild(style);
  }

  function card(label, value, note, cls = '') {
    return `<article class="expense-payment-card"><span>${label}</span><strong class="${cls}">${value}</strong><p>${note}</p></article>`;
  }

  function methodItem(item) {
    const name = methodNames[item.payment_method] || item.payment_method || 'לא ידוע';
    return `<article class="expense-payment-method-item"><strong>${name}</strong><div class="expense-payment-method-value"><span>הוצאות</span><b>${money(item.expense_amount)}</b></div><div class="expense-payment-method-value"><span>שולם</span><b>${money(item.paid_amount)}</b></div><div class="expense-payment-method-value"><span>טרם שולם</span><b>${money(item.unpaid_amount)}</b></div></article>`;
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
      const cashflow = document.querySelector('.cashflow-section');
      const health = document.querySelector('.health-section');
      const host = document.getElementById('report-view') || document.querySelector('main');
      if (cashflow?.parentNode) cashflow.parentNode.insertBefore(section, cashflow);
      else if (health?.parentNode) health.parentNode.insertBefore(section, health.nextSibling);
      else host?.appendChild(section);
    }

    const methods = Array.isArray(accounting.methods) ? accounting.methods : [];
    section.innerHTML = `<div class="section-title-block"><span class="section-kicker">הוצאות מול תשלומים</span><h2>הפרדה בין מועד העסקה למועד ירידת הכסף</h2><p>הוצאות לפי תאריך העסקה; תשלומים לפי מועד ירידת הכסף בפועל.</p></div><div class="expense-payment-summary">${card('הוצאות עסקיות החודש', money(businessExpenses), 'לפי מועד העסקה', businessExpenses > 0 ? 'neg' : '')}${card('תשלומים עסקיים החודש', money(businessPayments), 'לפי מועד הירידה בפועל', businessPayments > 0 ? 'neg' : '')}${card('אשראי שטרם ירד', money(pendingCredit), `${pendingCount} עסקאות דחויות`, pendingCredit > 0 ? 'warn' : 'pos')}${card('הוצאות אישיות החודש', money(monthly.personal_expenses || 0), 'לא נכללות בהוצאות העסקיות', '')}</div><div class="expense-payment-methods"><span>פירוט לפי אמצעי תשלום</span><div class="expense-payment-method-list">${methods.length ? methods.map(methodItem).join('') : '<div class="expense-payment-empty">אין נתונים</div>'}</div></div><div class="expense-payment-build">תצוגה חדשה · v3</div>`;
  }

  window.addEventListener('beautix:report-loaded', event => render(event.detail));
  if (window.__beautixLastReport) render(window.__beautixLastReport);
})();
