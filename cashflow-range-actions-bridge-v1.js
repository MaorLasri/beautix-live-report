(() => {
  if (window.__beautixCashflowRangeActionsBridgeV1) return;
  window.__beautixCashflowRangeActionsBridgeV1 = true;

  const cfg = window.BEAUTIX_CONFIG;
  if (!cfg || !window.supabase) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
  const money = value => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(Number(value || 0));
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const statusLabels = {
    planned: 'מתוכנן',
    forecast: 'צפוי',
    completed: 'בוצע',
    actual: 'בוצע',
    paid: 'שולם',
    settled: 'נסלק',
    deferred: 'נדחה',
    overdue: 'באיחור',
    cancelled: 'בוטל',
    unconfirmed: 'לא מאומת'
  };
  let items = [];

  function ensureStyles() {
    if (document.getElementById('cashflow-range-actions-bridge-style')) return;
    const style = document.createElement('style');
    style.id = 'cashflow-range-actions-bridge-style';
    style.textContent = `
      .range-action-row{display:flex;justify-content:flex-end;margin:0 0 14px;grid-column:1/-1}.range-action-add{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 16px;border:0;border-radius:12px;background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff;font:inherit;font-weight:800;cursor:pointer}.range-entry-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.range-entry-btn{padding:7px 10px;border:1px solid #d8c8e6;border-radius:9px;background:#fff;color:#7837a9;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}.range-entry-btn.confirm{border-color:#b9e2cc;background:#eaf8f0;color:#18794e}.range-entry-btn[disabled]{opacity:.6;cursor:wait}.range-entry-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid #e4e8f0;border-radius:12px;background:#fafbfe}.range-entry-row strong{display:block}.range-entry-row small{color:#7f8b9d}.range-entry-status{display:inline-flex;align-items:center;margin-inline-start:4px}.range-bridge-modal{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;padding:18px;background:rgba(22,18,34,.48);backdrop-filter:blur(5px)}.range-bridge-modal[hidden]{display:none}.range-bridge-dialog{position:relative;width:min(500px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:24px;border-radius:22px;background:#fff}.range-bridge-dialog h2{margin:0 0 16px;color:#50306f}.range-bridge-dialog form{display:grid;gap:13px}.range-bridge-dialog label{display:grid;gap:6px;color:#4c596b;font-weight:700}.range-bridge-dialog input,.range-bridge-dialog select,.range-bridge-dialog textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d9deea;border-radius:12px;font:inherit}.range-bridge-dialog button[type=submit]{padding:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff;font-weight:800}.range-bridge-close{position:absolute;top:10px;left:12px;border:0;background:transparent;font-size:1.7rem;color:#7b8798}.range-bridge-status{margin:0;color:#b33a45}.range-bridge-status[hidden]{display:none}@media(max-width:620px){.range-action-add{width:100%}.range-entry-row{grid-template-columns:1fr}.range-entry-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (document.getElementById('range-bridge-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="range-bridge-modal" class="range-bridge-modal" hidden>
        <section class="range-bridge-dialog">
          <button id="range-bridge-close" class="range-bridge-close" type="button">×</button>
          <h2 id="range-bridge-title">הוספת תנועה</h2>
          <form id="range-bridge-form">
            <input id="range-bridge-id" type="hidden">
            <label>תאריך<input id="range-bridge-date" type="date" required></label>
            <label>סוג<select id="range-bridge-type"><option value="income">הכנסה</option><option value="expense">הוצאה</option></select></label>
            <label>סכום<input id="range-bridge-amount" type="number" min="0.01" step="0.01" required></label>
            <label>תיאור<input id="range-bridge-description" maxlength="160" required></label>
            <label>סטטוס<select id="range-bridge-status-select"><option value="planned">מתוכנן</option><option value="completed">בוצע</option><option value="deferred">נדחה</option><option value="overdue">באיחור</option><option value="cancelled">בוטל</option></select></label>
            <label>הערה<textarea id="range-bridge-note" rows="3"></textarea></label>
            <button type="submit">שמירה</button>
            <p id="range-bridge-status" class="range-bridge-status" hidden></p>
          </form>
        </section>
      </div>`);
    const modal = document.getElementById('range-bridge-modal');
    document.getElementById('range-bridge-close').onclick = () => modal.hidden = true;
    modal.onclick = event => { if (event.target === modal) modal.hidden = true; };
    document.getElementById('range-bridge-form').onsubmit = save;
  }

  function openCreate(date) {
    ensureModal();
    document.getElementById('range-bridge-title').textContent = 'הוספת תנועה חדשה';
    document.getElementById('range-bridge-id').value = '';
    document.getElementById('range-bridge-date').value = date;
    document.getElementById('range-bridge-type').value = 'expense';
    document.getElementById('range-bridge-amount').value = '';
    document.getElementById('range-bridge-description').value = '';
    document.getElementById('range-bridge-status-select').value = 'planned';
    document.getElementById('range-bridge-note').value = '';
    document.getElementById('range-bridge-status').hidden = true;
    document.getElementById('range-bridge-modal').hidden = false;
  }

  function openEdit(id) {
    const item = items.find(row => row.id === id);
    if (!item) return;
    ensureModal();
    document.getElementById('range-bridge-title').textContent = 'עריכת תנועה';
    document.getElementById('range-bridge-id').value = item.id;
    document.getElementById('range-bridge-date').value = item.date;
    document.getElementById('range-bridge-type').value = item.type;
    document.getElementById('range-bridge-amount').value = item.amount;
    document.getElementById('range-bridge-description').value = item.description || '';
    document.getElementById('range-bridge-status-select').value = item.status || 'planned';
    document.getElementById('range-bridge-note').value = item.action_note || '';
    document.getElementById('range-bridge-status').hidden = true;
    document.getElementById('range-bridge-modal').hidden = false;
  }

  async function updateItem(item, nextStatus) {
    const { error } = await client.rpc('update_cashflow_entry_full', {
      p_entry_id: item.id,
      p_date: item.date,
      p_type: item.type,
      p_amount: Number(item.amount),
      p_description: item.description || 'תנועה',
      p_status: nextStatus,
      p_note: item.action_note || null,
      p_payment_method: item.payment_method || null
    });
    if (error) throw error;
  }

  async function quickConfirm(id, button) {
    const item = items.find(row => row.id === id);
    if (!item) return;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'מאשר…';
    try {
      await updateItem(item, 'completed');
      await loadAndRender();
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.textContent = original;
      alert(`האישור נכשל: ${error.message}`);
    }
  }

  async function save(event) {
    event.preventDefault();
    const status = document.getElementById('range-bridge-status');
    status.hidden = true;
    try {
      const id = document.getElementById('range-bridge-id').value;
      if (id) {
        const item = items.find(row => row.id === id);
        const { error } = await client.rpc('update_cashflow_entry_full', {
          p_entry_id: id,
          p_date: document.getElementById('range-bridge-date').value,
          p_type: document.getElementById('range-bridge-type').value,
          p_amount: Number(document.getElementById('range-bridge-amount').value),
          p_description: document.getElementById('range-bridge-description').value,
          p_status: document.getElementById('range-bridge-status-select').value,
          p_note: document.getElementById('range-bridge-note').value || null,
          p_payment_method: item?.payment_method || null
        });
        if (error) throw error;
      } else {
        const { error } = await client.rpc('create_cashflow_entry_v2', {
          p_date: document.getElementById('range-bridge-date').value,
          p_type: document.getElementById('range-bridge-type').value,
          p_amount: Number(document.getElementById('range-bridge-amount').value),
          p_description: document.getElementById('range-bridge-description').value,
          p_note: document.getElementById('range-bridge-note').value || null,
          p_payment_method: null
        });
        if (error) throw error;
      }
      document.getElementById('range-bridge-modal').hidden = true;
      await loadAndRender();
    } catch (error) {
      status.textContent = error.message;
      status.hidden = false;
    }
  }

  function render() {
    document.querySelectorAll('[data-day-card][data-cashflow-date]').forEach(card => {
      const date = card.dataset.cashflowDate;
      const body = card.querySelector('.day-body');
      if (!body) return;
      body.querySelectorAll('.range-action-row').forEach(el => el.remove());
      const row = document.createElement('div');
      row.className = 'range-action-row';
      row.innerHTML = '<button type="button" class="range-action-add">＋ הוספת תנועה</button>';
      row.querySelector('button').onclick = () => openCreate(date);
      body.prepend(row);

      const sections = body.querySelectorAll('section');
      ['income', 'expense'].forEach((type, index) => {
        const list = sections[index]?.querySelector('ul');
        if (!list) return;
        const rows = items.filter(item => item.date === date && item.type === type);
        list.innerHTML = rows.length ? rows.map(item => {
          const rawStatus = item.status || item.state || 'planned';
          const statusText = statusLabels[rawStatus] || 'מתוכנן';
          const isConfirmed = ['completed','actual','paid','settled'].includes(rawStatus);
          return `<li class="range-entry-row"><div><strong>${esc(item.description || 'תנועה')}</strong><small>${money(item.amount)} · <span class="range-entry-status">${esc(statusText)}</span></small></div><div class="range-entry-actions">${isConfirmed ? '' : `<button type="button" class="range-entry-btn confirm" data-range-confirm="${esc(item.id)}">אישור</button>`}<button type="button" class="range-entry-btn" data-range-edit="${esc(item.id)}">עריכה</button></div></li>`;
        }).join('') : '<li class="empty">אין תנועות</li>';
      });
      const small = card.querySelector('.summary-date small');
      const count = items.filter(item => item.date === date).length;
      if (small) small.textContent = `${count} תנועות`;
    });
    document.querySelectorAll('[data-range-edit]').forEach(button => button.onclick = () => openEdit(button.dataset.rangeEdit));
    document.querySelectorAll('[data-range-confirm]').forEach(button => button.onclick = () => quickConfirm(button.dataset.rangeConfirm, button));
  }

  async function loadAndRender() {
    ensureStyles();
    ensureModal();
    const { data, error } = await client.rpc('get_cashflow_entries_report');
    if (error) { console.error(error); return; }
    const report = data?.report || data || {};
    items = Array.isArray(report.items) ? report.items : [];
    render();
  }

  window.addEventListener('beautix:cashflow-range-rendered', () => setTimeout(loadAndRender, 0));
  window.addEventListener('beautix:report-loaded', () => setTimeout(loadAndRender, 100));
  setTimeout(loadAndRender, 250);
})();