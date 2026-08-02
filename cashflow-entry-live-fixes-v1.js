(() => {
  if (window.__beautixCashflowEntryLiveFixesV1) return;
  window.__beautixCashflowEntryLiveFixesV1 = true;

  const cfg = window.BEAUTIX_CONFIG;
  if (!cfg || !window.supabase) return;
  const remember = localStorage.getItem('beautix-remember-device') === 'true';
  const storage = remember ? window.localStorage : window.sessionStorage;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, storage, autoRefreshToken: true, detectSessionInUrl: true }
  });
  let items = new Map();

  const paymentMethods = [
    ['unknown','לא ידוע'],['cash','מזומן'],['check','צ׳ק'],['debit_card','דביט'],
    ['credit_card','כרטיס אשראי'],['bank_transfer','העברה בנקאית'],
    ['direct_debit','חיוב ישיר'],['standing_order','הוראת קבע'],
    ['bit','Bit'],['paybox','PayBox'],['mixed','משולב'],['other','אחר']
  ];

  function removeDuplicateButtons() {
    document.querySelectorAll('.cashflow-day-add-row').forEach(el => el.remove());
  }

  async function refreshItems() {
    const { data, error } = await client.rpc('get_cashflow_entries_report');
    if (error) return console.error(error);
    const report = data?.report || data || {};
    items = new Map((report.items || []).map(item => [item.id, item]));
  }

  function syncTimingFields() {
    const timing = document.getElementById('range-payment-timing');
    const date = document.getElementById('range-payment-date');
    const transactionDate = document.getElementById('range-bridge-date');
    const type = document.getElementById('range-bridge-type')?.value;
    const wrap = document.getElementById('range-payment-controls');
    if (!timing || !date || !transactionDate || !wrap) return;
    wrap.hidden = type !== 'expense';
    if (type !== 'expense') return;
    const future = timing.value === 'future';
    date.closest('label').hidden = !future;
    if (!future) date.value = transactionDate.value;
  }

  function enhanceModal() {
    removeDuplicateButtons();
    const form = document.getElementById('range-bridge-form');
    if (!form) return false;
    if (!document.getElementById('range-payment-controls')) {
      const description = document.getElementById('range-bridge-description')?.closest('label');
      if (!description) return false;
      const box = document.createElement('div');
      box.id = 'range-payment-controls';
      box.innerHTML = `
        <label>אמצעי תשלום<select id="range-payment-method">${paymentMethods.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>
        <label>מועד ירידת הכסף<select id="range-payment-timing"><option value="immediate">ירידה מיידית</option><option value="future">ירידה עתידית</option></select></label>
        <label>תאריך ירידת הכסף<input id="range-payment-date" type="date"></label>`;
      box.style.display = 'grid';
      box.style.gap = '13px';
      description.insertAdjacentElement('afterend', box);
      document.getElementById('range-payment-timing').addEventListener('change', syncTimingFields);
      document.getElementById('range-bridge-type').addEventListener('change', syncTimingFields);
      document.getElementById('range-bridge-date').addEventListener('change', syncTimingFields);
    }
    form.onsubmit = save;
    syncTimingFields();
    return true;
  }

  async function save(event) {
    event.preventDefault();
    const statusBox = document.getElementById('range-bridge-status');
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    if (statusBox) statusBox.hidden = true;
    if (submit) submit.disabled = true;
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) throw new Error('ההתחברות פגה. יש להתחבר מחדש.');

      const id = document.getElementById('range-bridge-id').value;
      const type = document.getElementById('range-bridge-type').value;
      const transactionDate = document.getElementById('range-bridge-date').value;
      const timing = document.getElementById('range-payment-timing')?.value || 'immediate';
      const paymentDate = type === 'expense' && timing === 'future'
        ? document.getElementById('range-payment-date').value
        : transactionDate;
      if (type === 'expense' && timing === 'future' && !paymentDate) throw new Error('יש לבחור תאריך ירידת כסף עתידי');

      const scope = document.querySelector('input[name="range-financial-scope"]:checked')?.value || 'business';
      const method = document.getElementById('range-payment-method')?.value || 'unknown';
      const noteBase = document.getElementById('range-bridge-note').value.trim();
      const dateNote = type === 'expense' && timing === 'future' && paymentDate !== transactionDate
        ? `תאריך עסקה: ${transactionDate}` : '';
      const note = [noteBase, dateNote].filter(Boolean).join(' · ') || null;
      const payload = {
        p_date: paymentDate,
        p_type: type,
        p_amount: Number(document.getElementById('range-bridge-amount').value),
        p_description: document.getElementById('range-bridge-description').value.trim(),
        p_note: note,
        p_financial_scope: scope,
        p_payment_method: method
      };
      if (!payload.p_amount || payload.p_amount <= 0) throw new Error('יש להזין סכום גדול מאפס');
      if (!payload.p_description) throw new Error('יש להזין תיאור');

      if (id) {
        const selectedStatus = document.getElementById('range-bridge-status-select').value;
        const nextStatus = type === 'expense' ? (timing === 'future' ? 'planned' : selectedStatus) : selectedStatus;
        const { error } = await client.rpc('update_cashflow_entry_full_v2', {
          p_entry_id: id, ...payload, p_status: nextStatus
        });
        if (error) throw error;
      } else {
        const { error } = await client.rpc('create_cashflow_entry_v3', payload);
        if (error) throw error;
        if (type === 'expense' && timing === 'immediate') {
          await refreshItems();
          const newest = [...items.values()]
            .filter(x => x.type === 'expense' && x.date === paymentDate && Number(x.amount) === payload.p_amount && x.description === payload.p_description)
            .sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
          if (newest) {
            const { error: updateError } = await client.rpc('update_cashflow_entry_full_v2', {
              p_entry_id: newest.id, ...payload, p_status: 'completed'
            });
            if (updateError) throw updateError;
          }
        }
      }

      document.getElementById('range-bridge-modal').hidden = true;
      await refreshItems();
      window.dispatchEvent(new CustomEvent('beautix:cashflow-scope-updated'));
      window.dispatchEvent(new CustomEvent('beautix:report-loaded', { detail: window.__beautixLastReport || {} }));
    } catch (error) {
      console.error(error);
      if (statusBox) { statusBox.textContent = error.message || 'השמירה נכשלה'; statusBox.hidden = false; }
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  document.addEventListener('click', event => {
    const add = event.target.closest('.range-action-add');
    const edit = event.target.closest('[data-range-edit]');
    if (!add && !edit) return;
    setTimeout(() => {
      enhanceModal();
      const id = edit?.dataset.rangeEdit;
      const item = id ? items.get(id) : null;
      const method = document.getElementById('range-payment-method');
      const timing = document.getElementById('range-payment-timing');
      const paymentDate = document.getElementById('range-payment-date');
      if (method) method.value = item?.payment_method || item?.payment_method_normalized || 'unknown';
      if (timing) timing.value = item && ['planned','forecast','deferred'].includes(item.status || item.state) ? 'future' : 'immediate';
      if (paymentDate) paymentDate.value = item?.date || document.getElementById('range-bridge-date')?.value || '';
      syncTimingFields();
    }, 0);
  }, true);

  ['beautix:cashflow-range-rendered','beautix:report-loaded','beautix:cashflow-scope-updated'].forEach(name => {
    window.addEventListener(name, () => setTimeout(() => { removeDuplicateButtons(); enhanceModal(); refreshItems(); }, 50));
  });
  setTimeout(() => { removeDuplicateButtons(); enhanceModal(); refreshItems(); }, 300);
})();