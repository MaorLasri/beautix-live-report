window.BEAUTIX_DISABLE_I18N = true;
window.BEAUTIX_DISABLE_WHATSAPP = false;
window.BEAUTIX_DISABLE_OPPORTUNITIES = false;
window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS = false;
window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING = false;
window.BEAUTIX_DISABLE_CASHFLOW_PAYMENT_EDITOR = false;

window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report_v10",
  refreshIntervalMs: 60000
};

(() => {
  const load = (selector, src, datasetKey) => {
    if (document.querySelector(selector)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[datasetKey] = "true";
    document.head.appendChild(script);
  };

  load('script[data-beautix-mobile-width-guard]', 'mobile-width-guard.js?v=20260731-width-guard1', 'beautixMobileWidthGuard');
  if (!window.BEAUTIX_DISABLE_OPPORTUNITIES) load('script[data-beautix-opportunities]', 'opportunities.js?v=20260730-actions1', 'beautixOpportunities');
  if (!window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS) load('script[data-beautix-cashflow-actions]', 'cashflow-actions.js?v=20260730-cashflow8', 'beautixCashflowActions');
  if (!window.BEAUTIX_DISABLE_CASHFLOW_PAYMENT_EDITOR) load('script[data-beautix-cashflow-payment-editor-v3]', 'cashflow-payment-editor-v3.js?v=20260731-editor-v3a', 'beautixCashflowPaymentEditorV3');
  if (!window.BEAUTIX_DISABLE_WHATSAPP) load('script[data-beautix-whatsapp-messages-v2]', 'whatsapp-messages-v2.js?v=20260731-wa-overflow1', 'beautixWhatsappMessagesV2');
  load('script[data-beautix-mobile-topbar-cleanup]', 'mobile-topbar-cleanup.js?v=20260731-ipad-breakpoint1', 'beautixMobileTopbarCleanup');
  if (!window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING) load('script[data-beautix-expense-payment-reporting-v3]', 'expense-payment-reporting-v3.js?v=20260802-accounting1', 'beautixExpensePaymentReportingV3');
  load('script[data-beautix-cashflow-range-selector-v1]', 'cashflow-range-selector-v1.js?v=20260802-business-logic1', 'beautixCashflowRangeSelectorV1');
  load('script[data-beautix-cashflow-range-actions-bridge-v1]', 'cashflow-range-actions-bridge-v1.js?v=20260801-scope1', 'beautixCashflowRangeActionsBridgeV1');
  load('script[data-beautix-personal-cashflow-range-v1]', 'personal-cashflow-range-v1.js?v=20260801-personal1', 'beautixPersonalCashflowRangeV1');
  load('script[data-beautix-dashboard-management-metrics-v1]', 'dashboard-management-metrics-v1.js?v=20260801-management1', 'beautixDashboardManagementMetricsV1');
  load('script[data-beautix-collection-metrics-v1]', 'collection-metrics-v1.js?v=20260801-collection1', 'beautixCollectionMetricsV1');
  load('script[data-beautix-cashflow-confirmation-queue-v1]', 'cashflow-confirmation-queue-v1.js?v=20260802-count1', 'beautixCashflowConfirmationQueueV1');
  load('script[data-beautix-business-logic-ui-fixes-v1]', 'business-logic-ui-fixes-v1.js?v=20260802-ui-logic1', 'beautixBusinessLogicUiFixesV1');
})();