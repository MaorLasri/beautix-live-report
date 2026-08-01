window.BEAUTIX_DISABLE_I18N = true;
window.BEAUTIX_DISABLE_WHATSAPP = false;
window.BEAUTIX_DISABLE_OPPORTUNITIES = false;
window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS = false;
window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING = false;
window.BEAUTIX_DISABLE_CASHFLOW_PAYMENT_EDITOR = false;

window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report_v5",
  refreshIntervalMs: 60000
};

(() => {
  if (!document.querySelector('script[data-beautix-mobile-width-guard]')) {
    const script = document.createElement("script");
    script.src = "mobile-width-guard.js?v=20260731-width-guard1";
    script.defer = true;
    script.dataset.beautixMobileWidthGuard = "true";
    document.head.appendChild(script);
  }
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
  if (!window.BEAUTIX_DISABLE_CASHFLOW_PAYMENT_EDITOR && !document.querySelector('script[data-beautix-cashflow-payment-editor-v3]')) {
    const script = document.createElement("script");
    script.src = "cashflow-payment-editor-v3.js?v=20260731-editor-v3a";
    script.defer = true;
    script.dataset.beautixCashflowPaymentEditorV3 = "true";
    document.head.appendChild(script);
  }
  if (!window.BEAUTIX_DISABLE_WHATSAPP && !document.querySelector('script[data-beautix-whatsapp-messages-v2]')) {
    const script = document.createElement("script");
    script.src = "whatsapp-messages-v2.js?v=20260731-wa-overflow1";
    script.defer = true;
    script.dataset.beautixWhatsappMessagesV2 = "true";
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[data-beautix-mobile-topbar-cleanup]')) {
    const script = document.createElement("script");
    script.src = "mobile-topbar-cleanup.js?v=20260731-ipad-breakpoint1";
    script.defer = true;
    script.dataset.beautixMobileTopbarCleanup = "true";
    document.head.appendChild(script);
  }
  if (!window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING && !document.querySelector('script[data-beautix-expense-payment-reporting-v3]')) {
    const script = document.createElement("script");
    script.src = "expense-payment-reporting-v3.js?v=20260731-expense-v3a";
    script.defer = true;
    script.dataset.beautixExpensePaymentReportingV3 = "true";
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[data-beautix-cashflow-range-selector-v1]')) {
    const script = document.createElement("script");
    script.src = "cashflow-range-selector-v1.js?v=20260731-range1";
    script.defer = true;
    script.dataset.beautixCashflowRangeSelectorV1 = "true";
    document.head.appendChild(script);
  }
})();
