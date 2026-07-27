window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report",
  refreshIntervalMs: 60000
};

(() => {
  if (document.querySelector('script[data-beautix-opportunities]')) return;
  const script = document.createElement("script");
  script.src = "opportunities.js?v=20260727-opportunities2";
  script.defer = true;
  script.dataset.beautixOpportunities = "true";
  document.head.appendChild(script);
})();
