window.BEAUTIX_DISABLE_I18N = true;
window.BEAUTIX_DISABLE_WHATSAPP = true;
window.BEAUTIX_DISABLE_OPPORTUNITIES = false;
window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS = false;
window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING = false;

window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report_v4",
  refreshIntervalMs: 60000
};

(() => {
  if (!window.BEAUTIX_DISABLE_OPPORTUNITIES && !document.querySelector('script[data-beautix-opportunities]')) {
    const script = document.createElement("script");
    script.src = "opportunities.js?v=20260730-actions1";
    script.defer = true;
    script.dataset.beautixOpportunities = "true";
    document.head.appendChild(script);
  }
  if (!window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS && !document.querySelector('script[data-beautix-cashflow-actions]')) {
    const script = document.createElement("script");
    script.src = "cashflow-actions.js?v=20260730-cashflow8";
    script.defer = true;
    script.dataset.beautixCashflowActions = "true";
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[data-beautix-mobile-topbar-cleanup]')) {
    const script = document.createElement("script");
    script.src = "mobile-topbar-cleanup.js?v=20260731-ipad-breakpoint1";
    script.defer = true;
    script.dataset.beautixMobileTopbarCleanup = "true";
    document.head.appendChild(script);
  }
  if (!window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING && !document.querySelector('script[data-beautix-expense-payment-reporting]')) {
    const script = document.createElement("script");
    script.src = "expense-payment-reporting.js?v=20260731-expense-layout2";
    script.defer = true;
    script.dataset.beautixExpensePaymentReporting = "true";
    document.head.appendChild(script);
  }
})();
