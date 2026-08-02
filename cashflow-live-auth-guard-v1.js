(() => {
  if (window.__beautixCashflowLiveAuthGuardV1) return;
  window.__beautixCashflowLiveAuthGuardV1 = true;

  const cfg = window.BEAUTIX_CONFIG;
  if (!cfg || !window.supabase) return;

  const remember = localStorage.getItem('beautix-remember-device') === 'true';
  const storage = remember ? window.localStorage : window.sessionStorage;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, storage, autoRefreshToken: true, detectSessionInUrl: true }
  });

  function dedupeAddButtons() {
    document.querySelectorAll('[data-day-card][data-cashflow-date]').forEach(card => {
      const rows = [...card.querySelectorAll('.range-action-row, .cashflow-day-add-row')];
      rows.slice(1).forEach(row => row.remove());
    });
  }

  async function getItem(id) {
    const { data, error } = await client.rpc('get_cashflow_entries_report');
    if (error) throw error;
    const report = data?.report || data || {};
    return (report.items || []).find(item => item.id === id) || null;
  }

  async function confirmEntry(button) {
    const id = button.dataset.rangeConfirm;
    if (!id) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'מאשר…';
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('ההתחברות פגה. יש להתחבר מחדש.');
      const item = await getItem(id);
      if (!item) throw new Error('התנועה לא נמצאה');
      const { error } = await client.rpc('update_cashflow_entry_full_v2', {
        p_entry_id: item.id,
        p_date: item.date,
        p_type: item.type,
        p_amount: Number(item.amount),
        p_description: item.description || 'תנועה',
        p_payment_method: item.payment_method || item.payment_method_normalized || 'unknown',
        p_status: 'completed',
        p_note: item.action_note || item.note || null,
        p_financial_scope: item.financial_scope || 'business'
      });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('beautix:cashflow-scope-updated'));
      window.dispatchEvent(new CustomEvent('beautix:report-loaded', { detail: window.__beautixLastReport || {} }));
    } catch (error) {
      console.error(error);
      alert(`האישור נכשל: ${error.message || 'שגיאה לא ידועה'}`);
      button.disabled = false;
      button.textContent = original;
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-range-confirm]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    confirmEntry(button);
  }, true);

  ['beautix:cashflow-range-rendered','beautix:report-loaded','beautix:cashflow-scope-updated'].forEach(name => {
    window.addEventListener(name, () => setTimeout(dedupeAddButtons, 0));
  });
  setTimeout(dedupeAddButtons, 300);
})();
