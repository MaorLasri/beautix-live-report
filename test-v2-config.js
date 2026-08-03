window.BEAUTIX_V2_CONFIG = Object.freeze({
  environment: "test-v2",
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  defaultTab: "overview",
  defaultPeriodMode: "month",
  timezone: "Asia/Jerusalem"
});

(() => {
  const load = () => {
    if (!document.querySelector('link[data-beautix-cashflow-ui]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'test-v2-cashflow-ui.css?v=20260803-1';
      css.dataset.beautixCashflowUi = 'true';
      document.head.appendChild(css);
    }
    if (!document.querySelector('script[data-beautix-cashflow-ui]')) {
      const script = document.createElement('script');
      script.src = 'test-v2-cashflow-ui.js?v=20260803-1';
      script.defer = true;
      script.dataset.beautixCashflowUi = 'true';
      document.head.appendChild(script);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
