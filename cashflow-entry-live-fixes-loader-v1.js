(() => {
  if (window.__beautixCashflowEntryLiveFixesLoaderV1) return;
  window.__beautixCashflowEntryLiveFixesLoaderV1 = true;

  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;

    if (document.getElementById('range-payment-controls')) {
      window.clearInterval(timer);
      return;
    }

    if (!window.BEAUTIX_CONFIG || !window.supabase?.createClient) {
      if (attempts >= 100) window.clearInterval(timer);
      return;
    }

    window.clearInterval(timer);
    window.__beautixCashflowEntryLiveFixesV1 = false;

    document.querySelectorAll('script[data-beautix-cashflow-entry-live-fixes-retry]').forEach(el => el.remove());
    const script = document.createElement('script');
    script.src = `cashflow-entry-live-fixes-v1.js?v=20260802-payment-fields-retry1-${Date.now()}`;
    script.defer = true;
    script.dataset.beautixCashflowEntryLiveFixesRetry = 'true';
    document.head.appendChild(script);
  }, 100);
})();