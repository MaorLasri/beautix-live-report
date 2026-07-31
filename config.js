window.BEAUTIX_DISABLE_I18N = true;
window.BEAUTIX_DISABLE_WHATSAPP = true;
window.BEAUTIX_DISABLE_OPPORTUNITIES = false;
window.BEAUTIX_DISABLE_CASHFLOW_ACTIONS = true;

window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report_v3",
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
})();
