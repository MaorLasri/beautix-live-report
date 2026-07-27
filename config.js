window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report",
  refreshIntervalMs: 60000
};

(() => {
  if (document.querySelector('link[data-beautix-executive]')) return;
  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "executive-dashboard.css?v=20260727-executive1";
  style.dataset.beautixExecutive = "true";
  document.head.appendChild(style);
  const script = document.createElement("script");
  script.src = "executive-dashboard.js?v=20260727-executive1";
  script.defer = true;
  document.head.appendChild(script);
})();