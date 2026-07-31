(() => {
  if (window.__beautixCashflowRefreshSync) return;
  window.__beautixCashflowRefreshSync = true;
  const originalFetch = window.fetch.bind(window);
  const watched = [
    '/rpc/create_cashflow_entry',
    '/rpc/update_cashflow_entry_action',
    '/rpc/cashflow_quick_action'
  ];
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const input = args[0];
      const url = typeof input === 'string' ? input : input?.url || '';
      if (response.ok && watched.some(path => url.includes(path))) {
        setTimeout(() => window.location.reload(), 350);
      }
    } catch (_) {}
    return response;
  };
})();