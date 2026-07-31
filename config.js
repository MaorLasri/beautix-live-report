window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report_v3",
  refreshIntervalMs: 60000
};

(() => {
  const loadScript = (src, datasetKey, onload) => {
    const selector = `script[data-${datasetKey}]`;
    if (document.querySelector(selector)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.setAttribute(`data-${datasetKey}`, "true");
    if (onload) script.onload = onload;
    document.head.appendChild(script);
  };

  loadScript("i18n-map.js?v=20260730-map1", "beautix-i18n-map", () => {
    loadScript("i18n-map-extra.js?v=20260730-map2", "beautix-i18n-map-extra", () => {
      loadScript("language-switcher-v4.js?v=20260730-i18n4", "beautix-language-switcher-v4");
    });
  });

  loadScript("opportunities.js?v=20260730-actions1", "beautix-opportunities");
  loadScript("cashflow-actions.js?v=20260730-cashflow8", "beautix-cashflow-actions");
  loadScript("whatsapp-messages.js?v=20260730-wa1", "beautix-whatsapp-messages");
})();
