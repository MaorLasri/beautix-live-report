window.BEAUTIX_DISABLE_I18N = true;
window.BEAUTIX_DISABLE_WHATSAPP = false;
window.BEAUTIX_DISABLE_OPPORTUNITIES = false;
window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS = true;
window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING = false;
window.BEAUTIX_DISABLE_CASHFLOW_PAYMENT_EDITOR = true;

window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report_v9",
  refreshIntervalMs: 60000
};

(() => {
  if (window.supabase?.createClient && !window.__beautixSharedAuthCreateClient) {
    window.__beautixSharedAuthCreateClient = true;
    const originalCreateClient = window.supabase.createClient.bind(window.supabase);
    window.supabase.createClient = (url, key, options = {}) => {
      const remember = window.localStorage.getItem('beautix-remember-device') === 'true';
      const storage = remember ? window.localStorage : window.sessionStorage;
      return originalCreateClient(url, key, {
        ...options,
        auth: {
          persistSession: true,
          storage,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          ...(options.auth || {})
        }
      });
    };
  }

  const load = (selector, src, datasetKey) => {
    if (document.querySelector(selector)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[datasetKey] = "true";
    document.head.appendChild(script);
  };

  load('script[data-beautix-live-branding]', 'live-branding.js?v=20260802-live1', 'beautixLiveBranding');
  load('script[data-beautix-mobile-width-guard]', 'mobile-width-guard.js?v=20260731-width-guard1', 'beautixMobileWidthGuard');
  if (!window.BEAUTIX_DISABLE_OPPORTUNITIES) load('script[data-beautix-opportunities]', 'opportunities.js?v=20260730-actions1', 'beautixOpportunities');
  if (!window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS) load('script[data-beautix-cashflow-actions]', 'cashflow-actions.js?v=20260730-cashflow8', 'beautixCashflowActions');
  if (!window.BEAUTIX_DISABLE_CASHFLOW_PAYMENT_EDITOR) load('script[data-beautix-cashflow-payment-editor-v3]', 'cashflow-payment-editor-v3.js?v=20260802-auth1', 'beautixCashflowPaymentEditorV3');
  if (!window.BEAUTIX_DISABLE_WHATSAPP) load('script[data-beautix-whatsapp-messages-v2]', 'whatsapp-messages-v2.js?v=20260731-wa-overflow1', 'beautixWhatsappMessagesV2');
  load('script[data-beautix-mobile-topbar-cleanup]', 'mobile-topbar-cleanup.js?v=20260731-ipad-breakpoint1', 'beautixMobileTopbarCleanup');
  if (!window.BEAUTIX_DISABLE_EXPENSE_PAYMENT_REPORTING) load('script[data-beautix-expense-payment-reporting-v3]', 'expense-payment-reporting-v3.js?v=20260731-expense-v3a', 'beautixExpensePaymentReportingV3');
  load('script[data-beautix-cashflow-range-selector-v1]', 'cashflow-range-selector-v1.js?v=20260801-range-actions1', 'beautixCashflowRangeSelectorV1');
  load('script[data-beautix-cashflow-range-actions-bridge-v1]', 'cashflow-range-actions-bridge-v1.js?v=20260802-auth2', 'beautixCashflowRangeActionsBridgeV1');
  load('script[data-beautix-cashflow-entry-live-fixes-v1]', 'cashflow-entry-live-fixes-v1.js?v=20260802-auth2', 'beautixCashflowEntryLiveFixesV1');
  load('script[data-beautix-cashflow-entry-live-fixes-loader-v1]', 'cashflow-entry-live-fixes-loader-v1.js?v=20260802-payment-fields-loader1', 'beautixCashflowEntryLiveFixesLoaderV1');
  load('script[data-beautix-cashflow-live-auth-guard-v1]', 'cashflow-live-auth-guard-v1.js?v=20260802-auth3', 'beautixCashflowLiveAuthGuardV1');
  load('script[data-beautix-personal-cashflow-range-v1]', 'personal-cashflow-range-v1.js?v=20260801-personal1', 'beautixPersonalCashflowRangeV1');
  load('script[data-beautix-dashboard-management-metrics-v1]', 'dashboard-management-metrics-v1.js?v=20260801-management1', 'beautixDashboardManagementMetricsV1');
  load('script[data-beautix-collection-metrics-v1]', 'collection-metrics-v1.js?v=20260801-collection1', 'beautixCollectionMetricsV1');
  load('script[data-beautix-cashflow-confirmation-queue-v1]', 'cashflow-confirmation-queue-v1.js?v=20260801-confirmation-queue2', 'beautixCashflowConfirmationQueueV1');
})();