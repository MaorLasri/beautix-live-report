(() => {
  if (window.__beautixCashflowPaymentEditorV3) return;
  window.__beautixCashflowPaymentEditorV3 = true;

  const config = window.BEAUTIX_CONFIG;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  let byId = new Map();

  const methods = [
    ['unknown', 'לא ידוע'],
    ['cash', 'מזומן'],
    ['check', 'צ׳ק'],
    ['debit_card', 'דביט'],
    ['credit_card', 'כרטיס אשראי'],
    ['bank_transfer', 'העברה בנקאית'],
    ['direct_debit', 'חיוב ישיר'],
    ['standing_order', 'הוראת קבע'],
    ['bit', 'Bit'],
    ['paybox', 'PayBox'],
    ['mixed', 'משולב'],
    ['other', 'אחר']
  ];

  async function refreshItems() {
    const { data, error } = await client.rpc('get_cashflow_entries_report');
    if (error) throw error;
    const report = data?.report || data || {};
    byId = new Map((report.items || []).map(item => [item.id, item]));
  }

  function ensurePaymentField() {
    const form = document.getElementById('cashflow-form');
    if (!form) return false;
    if (document.getElementById('cashflow-payment-method')) return true;
    const description = document.getElementById('cashflow-description')?.closest('label');
    if (!description) return false;
    const label = document.createElement('label');
    label.id = 'cashflow-payment-method-wrap';
    label.innerHTML = `אמצעי תשלום<select id="cashflow-payment-method">${methods.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}</select>`;
    description.insertAdjacentElement('afterend', label);
    return true;
  }

  function setEditable(enabled = true) {
    ['cashflow-type', 'cashflow-amount', 'cashflow-description', 'cashflow-payment-method'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !enabled;
    });
  }

  function showError(message) {
    const box = document.getElementById('cashflow-form-status');
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
  }

  async function save(event) {
    event.preventDefault();
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    const box = document.getElementById('cashflow-form-status');
    if (box) box.hidden = true;
    if (submit) submit.disabled = true;
    try {
      const id = document.getElementById('cashflow-entry-id').value;
      const payload = {
        date: document.getElementById('cashflow-date').value,
        type: document.getElementById('cashflow-type').value,
        amount: Number(document.getElementById('cashflow-amount').value),
        description: document.getElementById('cashflow-description').value.trim(),
        paymentMethod: document.getElementById('cashflow-payment-method')?.value || 'unknown',
        status: document.getElementById('cashflow-status').value || 'planned',
        note: document.getElementById('cashflow-note').value.trim() || null
      };
      if (!payload.amount || payload.amount <= 0) throw new Error('יש להזין סכום גדול מאפס');
      if (!payload.description) throw new Error('יש להזין תיאור');

      if (id) {
        const { error } = await client.rpc('update_cashflow_entry_full', {
          p_entry_id: id,
          p_date: payload.date,
          p_type: payload.type,
          p_amount: payload.amount,
          p_description: payload.description,
          p_payment_method: payload.paymentMethod,
          p_status: payload.status,
          p_note: payload.note
        });
        if (error) throw error;
      } else {
        const { error } = await client.rpc('create_cashflow_entry_v2', {
          p_date: payload.date,
          p_type: payload.type,
          p_amount: payload.amount,
          p_description: payload.description,
          p_payment_method: payload.paymentMethod,
          p_note: payload.note
        });
        if (error) throw error;
      }

      document.getElementById('cashflow-modal').hidden = true;
      await refreshItems();
      window.dispatchEvent(new CustomEvent('beautix:report-loaded', { detail: window.__beautixLastReport || {} }));
    } catch (error) {
      console.error(error);
      showError(error.message || 'השמירה נכשלה');
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function activateForm(editId = null) {
    let attempts = 0;
    const timer = setInterval(() => {
      const form = document.getElementById('cashflow-form');
      if (!form && ++attempts < 20) return;
      clearInterval(timer);
      if (!form || !ensurePaymentField()) return;
      setEditable(true);
      const select = document.getElementById('cashflow-payment-method');
      if (select) {
        const item = editId ? byId.get(editId) : null;
        select.value = item?.payment_method || item?.payment_method_normalized || 'unknown';
      }
      form.onsubmit = save;
    }, 50);
  }

  document.addEventListener('click', event => {
    const editButton = event.target.closest('[data-edit]');
    const addButton = event.target.closest('.cashflow-day-add');
    if (!editButton && !addButton) return;
    activateForm(editButton?.dataset.edit || null);
  }, true);

  refreshItems().catch(console.error);
  window.addEventListener('beautix:report-loaded', () => refreshItems().catch(console.error));
})();
