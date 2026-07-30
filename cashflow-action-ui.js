(() => {
  const config = window.BEAUTIX_CONFIG;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  let active = null;

  const todayIso = () => new Date().toISOString().slice(0, 10);
  const tomorrowIso = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

  function ensureUi() {
    if (document.getElementById('cashflow-action-ui-modal')) return;
    const style = document.createElement('style');
    style.textContent = `
      .cashflow-action-ui-backdrop{position:fixed;inset:0;z-index:1400;display:grid;place-items:center;padding:18px;background:rgba(22,18,34,.5);backdrop-filter:blur(5px)}
      .cashflow-action-ui-backdrop[hidden]{display:none}.cashflow-action-ui-dialog{position:relative;width:min(430px,100%);padding:24px;border-radius:22px;background:#fff;box-shadow:0 24px 80px rgba(38,19,60,.28)}
      .cashflow-action-ui-dialog h2{margin:0 0 16px;color:#50306f}.cashflow-action-ui-dialog form{display:grid;gap:14px}.cashflow-action-ui-dialog label{display:grid;gap:7px;color:#4c596b;font-weight:700}
      .cashflow-action-ui-dialog input,.cashflow-action-ui-dialog select{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d9deea;border-radius:12px;background:#fff;font:inherit}
      .cashflow-action-ui-actions{display:flex;gap:10px}.cashflow-action-ui-actions button{flex:1;padding:12px;border:0;border-radius:12px;font:inherit;font-weight:800;cursor:pointer}
      .cashflow-action-ui-save{background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff}.cashflow-action-ui-cancel{background:#eef1f6;color:#536176}.cashflow-action-ui-close{position:absolute;top:10px;left:12px;border:0;background:transparent;font-size:1.7rem;color:#7b8798;cursor:pointer}.cashflow-action-ui-error{margin:0;color:#b33a45}
    `;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', `
      <div id="cashflow-action-ui-modal" class="cashflow-action-ui-backdrop" hidden>
        <section class="cashflow-action-ui-dialog" role="dialog" aria-modal="true" aria-labelledby="cashflow-action-ui-title">
          <button type="button" class="cashflow-action-ui-close" aria-label="סגירה">×</button>
          <h2 id="cashflow-action-ui-title">פעולה בתנועה</h2>
          <form id="cashflow-action-ui-form">
            <div id="cashflow-action-ui-fields"></div>
            <div class="cashflow-action-ui-actions"><button type="submit" class="cashflow-action-ui-save">אישור</button><button type="button" class="cashflow-action-ui-cancel">ביטול</button></div>
            <p id="cashflow-action-ui-error" class="cashflow-action-ui-error" hidden></p>
          </form>
        </section>
      </div>`);
    const modal = document.getElementById('cashflow-action-ui-modal');
    const close = () => { modal.hidden = true; active = null; };
    modal.querySelector('.cashflow-action-ui-close').onclick = close;
    modal.querySelector('.cashflow-action-ui-cancel').onclick = close;
    modal.onclick = e => { if (e.target === modal) close(); };
    document.getElementById('cashflow-action-ui-form').onsubmit = submit;
  }

  function open(action, entryId) {
    ensureUi(); active = { action, entryId };
    const title = document.getElementById('cashflow-action-ui-title');
    const fields = document.getElementById('cashflow-action-ui-fields');
    const error = document.getElementById('cashflow-action-ui-error');
    error.hidden = true;
    if (action === 'recurring') {
      title.textContent = 'הפיכה לתנועה חוזרת';
      fields.innerHTML = `<label>תדירות<select id="cashflow-action-recurrence"><option value="daily">יומית</option><option value="weekly">שבועית</option><option value="monthly" selected>חודשית</option></select></label><label>מספר מופעים<select id="cashflow-action-count">${Array.from({length:11},(_,i)=>`<option value="${i+2}"${i===1?' selected':''}>${i+2}</option>`).join('')}</select></label>`;
    } else if (action === 'move' || action === 'duplicate') {
      title.textContent = action === 'move' ? 'העברת התנועה לתאריך אחר' : 'שכפול התנועה';
      fields.innerHTML = `<label>תאריך יעד<input id="cashflow-action-date" type="date" min="${todayIso()}" value="${tomorrowIso()}" required></label>`;
    } else if (action === 'reminder') {
      title.textContent = 'יצירת תזכורת';
      fields.innerHTML = `<label>מועד תזכורת<input id="cashflow-action-reminder" type="datetime-local" required></label>`;
    }
    document.getElementById('cashflow-action-ui-modal').hidden = false;
  }

  async function submit(e) {
    e.preventDefault();
    if (!active) return;
    const errorBox = document.getElementById('cashflow-action-ui-error');
    const args = { p_entry_id: active.entryId, p_action: active.action, p_target_date: null, p_reminder_at: null, p_recurrence: null, p_occurrences: 3 };
    if (active.action === 'recurring') {
      args.p_recurrence = document.getElementById('cashflow-action-recurrence').value;
      args.p_occurrences = Number(document.getElementById('cashflow-action-count').value);
    } else if (active.action === 'move' || active.action === 'duplicate') {
      args.p_target_date = document.getElementById('cashflow-action-date').value;
    } else if (active.action === 'reminder') {
      const value = document.getElementById('cashflow-action-reminder').value;
      args.p_reminder_at = value ? new Date(value).toISOString() : null;
    }
    try {
      const { error } = await client.rpc('cashflow_quick_action', args);
      if (error) throw error;
      document.getElementById('cashflow-action-ui-modal').hidden = true;
      active = null;
      window.dispatchEvent(new CustomEvent('beautix:report-loaded'));
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    }
  }

  document.addEventListener('click', e => {
    const button = e.target.closest('[data-quick]');
    if (!button) return;
    const action = button.dataset.quick;
    if (!['recurring','move','duplicate','reminder'].includes(action)) return;
    const row = button.closest('[data-entry-id]');
    if (!row) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(action, row.dataset.entryId);
  }, true);
})();