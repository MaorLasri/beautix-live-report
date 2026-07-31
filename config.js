window.BEAUTIX_CONFIG = {
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  reportRpc: "get_business_status_report_v3",
  refreshIntervalMs: 60000
};

(() => {
  if (!document.querySelector('script[data-beautix-i18n-map]')) {
    const map = document.createElement("script");
    map.src = "i18n-map.js?v=20260730-map1";
    map.defer = true;
    map.dataset.beautixI18nMap = "true";
    map.onload = () => {
      if (!document.querySelector('script[data-beautix-language-switcher-v3]')) {
        const engine = document.createElement("script");
        engine.src = "language-switcher-v3.js?v=20260730-i18n3";
        engine.defer = true;
        engine.dataset.beautixLanguageSwitcherV3 = "true";
        document.head.appendChild(engine);
      }
    };
    document.head.appendChild(map);
  }
  if (!document.querySelector('script[data-beautix-opportunities]')) {
    const script = document.createElement("script");
    script.src = "opportunities.js?v=20260730-actions1";
    script.defer = true;
    script.dataset.beautixOpportunities = "true";
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[data-beautix-cashflow-actions]')) {
    const script = document.createElement("script");
    script.src = "cashflow-actions.js?v=20260730-cashflow8";
    script.defer = true;
    script.dataset.beautixCashflowActions = "true";
    document.head.appendChild(script);
  }
  if (!document.querySelector('script[data-beautix-whatsapp-messages]')) {
    const script = document.createElement("script");
    script.src = "whatsapp-messages.js?v=20260730-wa1";
    script.defer = true;
    script.dataset.beautixWhatsappMessages = "true";
    document.head.appendChild(script);
  }
})();
