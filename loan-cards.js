(() => {
  const money = value => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(Number(value || 0));
  const numberText = (value, digits = 1) => new Intl.NumberFormat("he-IL", { maximumFractionDigits: digits }).format(Number(value || 0));
  const dateText = value => value ? new Intl.DateTimeFormat("he-IL").format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : "—";
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function interestLabel(loan) {
    if (loan.interest_type === "interest_free" || Number(loan.annual_interest_rate || 0) === 0) return "ללא ריבית";
    const margin = loan.interest_margin_rate != null ? `פריים + ${numberText(loan.interest_margin_rate, 2)}%` : "ריבית";
    const current = loan.annual_interest_rate != null ? `${numberText(loan.annual_interest_rate, 2)}% נוכחית` : "שיעור לא זמין";
    return `${margin} · ${current} · ${loan.interest_type === "variable" ? "משתנה" : "קבועה"}`;
  }

  function cardHtml(loan) {
    const balance = Number(loan.current_balance ?? loan.balance ?? 0);
    const original = Number(loan.original_amount ?? loan.original_balance ?? 0);
    const repaid = Math.max(original - balance, 0);
    const repaidPct = original > 0 ? repaid / original * 100 : 0;
    const monthly = Number(loan.monthly_payment || 0);
    const monthlyInterest = Number(loan.monthly_interest_amount || 0);
    const monthlyPrincipal = Number(loan.monthly_principal_amount || Math.max(monthly - monthlyInterest, 0));
    const installment = loan.current_installment && loan.total_installments ? `${loan.current_installment} / ${loan.total_installments}` : "—";
    const remainingInstallments = loan.current_installment && loan.total_installments ? Math.max(Number(loan.total_installments) - Number(loan.current_installment), 0) : null;
    return `<article class="asset-card liability-card loan-profile-card">
      <div class="loan-profile-head">
        <div><h3>${escapeHtml(loan.name || loan.loan_name || loan.lender || "הלוואה")}</h3><p>${escapeHtml(loan.lender || loan.lender_name || "")}${loan.account_label ? ` · ${escapeHtml(loan.account_label)}` : ""}</p></div>
        <span class="loan-badge">${escapeHtml(loan.interest_type === "interest_free" ? "ללא ריבית" : loan.interest_type === "variable" ? "ריבית משתנה" : "הלוואה")}</span>
      </div>
      <div class="loan-balance"><span>יתרה נוכחית</span><strong class="neg">${money(balance)}</strong></div>
      <div class="loan-progress-wrap">
        <div class="loan-progress-head"><span>סכום מקורי ${original > 0 ? money(original) : "—"}</span><span>${numberText(repaidPct, 1)}% נפרע</span></div>
        <div class="loan-progress-track"><i style="width:${Math.max(0, Math.min(repaidPct, 100))}%"></i></div>
        <div class="loan-progress-meta"><span>${money(repaid)} נפרע</span><span>${money(balance)} נותר</span></div>
      </div>
      <div class="loan-payment-grid">
        <div><span>תשלום חודשי</span><strong>${money(monthly)}</strong></div>
        <div><span>ריבית חודשית</span><strong>${money(monthlyInterest)}</strong></div>
        <div><span>קרן חודשית</span><strong>${money(monthlyPrincipal)}</strong></div>
      </div>
      <dl class="loan-detail-grid">
        <div><dt>ריבית</dt><dd>${escapeHtml(interestLabel(loan))}</dd></div>
        <div><dt>תאריך התחלה</dt><dd>${dateText(loan.start_date)}</dd></div>
        <div><dt>סטטוס תשלומים</dt><dd>${installment}</dd></div>
        <div><dt>תשלומים שנותרו</dt><dd>${remainingInstallments ?? "—"}</dd></div>
        <div><dt>תשלום הבא</dt><dd>${dateText(loan.next_payment_date || loan.next_payment)}</dd></div>
        <div><dt>תאריך סיום</dt><dd>${dateText(loan.end_date)}</dd></div>
      </dl>
      ${loan.notes ? `<p class="loan-note">${escapeHtml(loan.notes)}</p>` : ""}
    </article>`;
  }

  function render(report) {
    const container = document.getElementById("loan-asset-cards");
    if (!container) return;
    const loans = Array.isArray(report?.loan_items) ? report.loan_items : Array.isArray(report?.loans?.items) ? report.loans.items : [];
    if (!loans.length) return;
    const totalBalance = loans.reduce((sum, loan) => sum + Number(loan.current_balance ?? loan.balance ?? 0), 0);
    const totalMonthly = loans.reduce((sum, loan) => sum + Number(loan.monthly_payment || 0), 0);
    const totalInterest = loans.reduce((sum, loan) => sum + Number(loan.monthly_interest_amount || 0), 0);
    const totalPrincipal = loans.reduce((sum, loan) => sum + Number(loan.monthly_principal_amount || 0), 0);
    container.innerHTML = `<article class="asset-card liability-card debt-total-card loan-summary-card"><span>סך החוב הכולל</span><strong class="neg">${money(totalBalance)}</strong><dl><div><dt>מספר הלוואות</dt><dd>${loans.length}</dd></div><div><dt>החזר חודשי כולל</dt><dd>${money(totalMonthly)}</dd></div><div><dt>ריבית חודשית כוללת</dt><dd>${money(totalInterest)}</dd></div><div><dt>קרן חודשית כוללת</dt><dd>${money(totalPrincipal)}</dd></div></dl></article>${loans.map(cardHtml).join("")}`;
  }

  window.addEventListener("beautix:report-loaded", event => render(event.detail));
})();