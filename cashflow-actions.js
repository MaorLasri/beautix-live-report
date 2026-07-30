(() => {
  const config = window.BEAUTIX_CONFIG;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const money = v => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(Number(v || 0));
  const escapeHtml = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const labels = { planned: 'מתוכנן', completed: 'בוצע', deferred: 'נדחה', overdue: 'באיחור', cancelled: 'בוטל' };
  let items = [];

  function ensureStyles() {
    let s = document.getElementById('cashflow-actions-style');
    if (!s) { s = document.createElement('style'); s.id = 'cashflow-actions-style'; document.head.appendChild(s); }
    s.textContent = `
      .cashflow-day-add-row{display:flex;align-items:center;justify-content:flex-end;margin:0 0 14px}
      .cashflow-day-add{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;padding:0 15px;border:0;border-radius:12px;background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff;font:inherit;font-weight:800;cursor:pointer;box-shadow:0 7px 18px rgba(121,54,155,.18)}
      .cashflow-day-add .plus{font-size:1.35rem;line-height:1}.cashflow-day-add .label{font-size:.86rem}
      .day-body{gap:18px}.day-body section{min-width:0;padding:16px;border:1px solid #e3e7ef;border-radius:16px;background:#fff}
      .day-body section h4{margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #edf0f5;color:#7b3bb0;font-size:1rem}
      .day-body section ul{display:grid;gap:10px;margin:0;padding:0;list-style:none}
      .cashflow-entry-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px;border:1px solid #e4e8f0;border-radius:14px;background:#fafbfe}
      .cashflow-entry-main{min-width:0}.cashflow-entry-main strong{display:block;color:#26364a;font-size:.98rem;line-height:1.35}.cashflow-entry-meta{display:flex;flex-wrap:wrap;gap:6px 10px;margin-top:5px;color:#7f8b9d;font-size:.79rem}.cashflow-entry-amount{font-weight:800;color:#26364a}.cashflow-entry-note{overflow-wrap:anywhere}
      .cashflow-entry-side{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.cashflow-status{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eef1f6;color:#536176;font-size:.74rem;font-weight:800;white-space:nowrap}
      .cashflow-status-completed{background:#e8f7ef;color:#168455}.cashflow-status-overdue{background:#fdecec;color:#b33a45}.cashflow-status-deferred{background:#fff3d9;color:#9b6a00}
      .cashflow-action-btn{padding:8px 12px;border:0;border-radius:10px;background:#fff;color:#7837a9;font:inherit;font-size:.82rem;font-weight:800;cursor:pointer;box-shadow:inset 0 0 0 1px #d8c8e6}
      .cashflow-modal{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:18px;background:rgba(22,18,34,.48);backdrop-filter:blur(5px)}.cashflow-modal[hidden]{display:none}
      .cashflow-dialog{position:relative;width:min(500px,100%);max-height:calc(100dvh - 24px);overflow:auto;padding:24px;border-radius:22px;background:#fff;box-shadow:0 24px 80px rgba(38,19,60,.28)}.cashflow-dialog h2{margin:0 0 16px;color:#50306f}.cashflow-dialog form{display:grid;gap:13px}.cashflow-dialog label{display:grid;gap:6px;color:#4c596b;font-weight:700}.cashflow-dialog input,.cashflow-dialog select,.cashflow-dialog textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d9deea;border-radius:12px;background:#fff;font:inherit}.cashflow-dialog button[type=submit]{padding:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff;font-weight:800}.cashflow-close{position:absolute;top:10px;left:12px;border:0;background:transparent;font-size:1.7rem;color:#7b8798}.cashflow-form-status{margin:0;color:#b33a45}
      @media(min-width:760px){.day-body{grid-template-columns:1fr 1fr}.cashflow-day-add-row{grid-column:1/-1}}
      @media(max-width:620px){.day-body section{padding:12px}.cashflow-entry-item{grid-template-columns:1fr}.cashflow-entry-side{justify-content:space-between}.cashflow-dialog{padding:22px 16px}.cashflow-day-add{width:100%;justify-content:center}}
    `;
  }

  function ensureModal() {
    if (document.getElementById('cashflow-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="cashflow-modal" class="cashflow-modal" hidden><section class="cashflow-dialog" role="dialog" aria-modal="true"><button id="cashflow-close" class="cashflow-close" type="button" aria-label="סגירה">×</button><h2 id="cashflow-modal-title">הוספת תנועה</h2><form id="cashflow-form"><input id="cashflow-entry-id" type="hidden"><label>תאריך<input id="cashflow-date" type="date" required></label><label>סוג<select id="cashflow-type"><option value="income">הכנסה</option><option value="expense">הוצאה</option></select></label><label>סכום<input id="cashflow-amount" type="number" min="0.01" step="0.01" required></label><label>תיאור<input id="cashflow-description" type="text" maxlength="160" required></label><label id="cashflow-status-wrap">סטטוס<select id="cashflow-status"><option value="planned">מתוכנן</option><option value="completed">בוצע</option><option value="deferred">נדחה</option><option value="overdue">באיחור</option><option value="cancelled">בוטל</option></select></label><label>הערה<textarea id="cashflow-note" rows="3"></textarea></label><button type="submit">שמירה</button><p id="cashflow-form-status" class="cashflow-form-status" hidden></p></form></section></div>`);
    const modal = document.getElementById('cashflow-modal');
    const close = () => modal.hidden = true;
    document.getElementById('cashflow-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.getElementById('cashflow-form').addEventListener('submit', saveForm);
  }

  function openCreate(date, type = 'income') {
    ensureModal();
    document.getElementById('cashflow-modal-title').textContent = 'הוספת תנועה חדשה';
    document.getElementById('cashflow-entry-id').value = '';
    document.getElementById('cashflow-date').value = date;
    document.getElementById('cashflow-type').value = type;
    document.getElementById('cashflow-type').disabled = false;
    document.getElementById('cashflow-amount').value = '';
    document.getElementById('cashflow-amount').disabled = false;
    document.getElementById('cashflow-description').value = '';
    document.getElementById('cashflow-description').disabled = false;
    document.getElementById('cashflow-status-wrap').hidden = true;
    document.getElementById('cashflow-note').value = '';
    document.getElementById('cashflow-form-status').hidden = true;
    document.getElementById('cashflow-modal').hidden = false;
  }

  function openAction(id) {
    const item = items.find(x => x.id === id); if (!item) return;
    ensureModal();
    document.getElementById('cashflow-modal-title').textContent = 'עדכון תנועה';
    document.getElementById('cashflow-entry-id').value = item.id;
    document.getElementById('cashflow-date').value = item.date;
    document.getElementById('cashflow-type').value = item.type;
    document.getElementById('cashflow-type').disabled = true;
    document.getElementById('cashflow-amount').value = item.amount;
    document.getElementById('cashflow-amount').disabled = true;
    document.getElementById('cashflow-description').value = item.description;
    document.getElementById('cashflow-description').disabled = true;
    document.getElementById('cashflow-status-wrap').hidden = false;
    document.getElementById('cashflow-status').value = item.status || 'planned';
    document.getElementById('cashflow-note').value = item.action_note || '';
    document.getElementById('cashflow-form-status').hidden = true;
    document.getElementById('cashflow-modal').hidden = false;
  }

  async function saveForm(e) {
    e.preventDefault(); const statusBox = document.getElementById('cashflow-form-status'); statusBox.hidden = true;
    const id = document.getElementById('cashflow-entry-id').value;
    try {
      if (id) {
        const { error } = await client.rpc('update_cashflow_entry_action', { p_entry_id: id, p_status: document.getElementById('cashflow-status').value, p_note: document.getElementById('cashflow-note').value || null, p_new_date: document.getElementById('cashflow-date').value });
        if (error) throw error;
      } else {
        const { error } = await client.rpc('create_cashflow_entry', { p_date: document.getElementById('cashflow-date').value, p_type: document.getElementById('cashflow-type').value, p_amount: Number(document.getElementById('cashflow-amount').value), p_description: document.getElementById('cashflow-description').value, p_note: document.getElementById('cashflow-note').value || null });
        if (error) throw error;
      }
      document.getElementById('cashflow-modal').hidden = true; await load();
    } catch (err) { statusBox.textContent = err.message; statusBox.hidden = false; }
  }

  function entryHtml(item) {
    const note = item.action_note ? `<span class="cashflow-entry-note">${escapeHtml(item.action_note)}</span>` : '';
    return `<li class="cashflow-entry-item"><div class="cashflow-entry-main"><strong>${escapeHtml(item.description)}</strong><div class="cashflow-entry-meta"><span class="cashflow-entry-amount">${money(item.amount)}</span>${note}</div></div><div class="cashflow-entry-side"><span class="cashflow-status cashflow-status-${escapeHtml(item.status)}">${escapeHtml(labels[item.status] || 'מתוכנן')}</span><button class="cashflow-action-btn" type="button" data-cashflow-action="${escapeHtml(item.id)}">פעולות</button></div></li>`;
  }

  function render() {
    const cards = [...document.querySelectorAll('[data-day-card]')]; if (!cards.length) return false;
    const start = new Date(); start.setHours(0,0,0,0);
    cards.forEach((card, index) => {
      const d = new Date(start); d.setDate(start.getDate() + index); const date = d.toISOString().slice(0,10);
      const dayItems = items.filter(x => x.date === date);
      const panel = card.querySelector("div[id^='day-panel-']"); if (!panel) return;
      const body = panel.querySelector('.day-body'); if (!body) return;
      body.querySelectorAll('.cashflow-day-add,.cashflow-day-add-row').forEach(el => el.remove());
      const row = document.createElement('div'); row.className = 'cashflow-day-add-row';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cashflow-day-add'; b.innerHTML = '<span class="plus">+</span><span class="label">הוספת תנועה</span>'; b.addEventListener('click', () => openCreate(date)); row.appendChild(b); body.prepend(row);
      const sections = body.querySelectorAll('section');
      ['income','expense'].forEach((type,i) => { const section = sections[i]; if (!section) return; const ul = section.querySelector('ul'); const rows = dayItems.filter(x => x.type === type); if (ul) ul.innerHTML = rows.length ? rows.map(entryHtml).join('') : '<li class="empty">אין תנועות</li>'; });
      const small = card.querySelector('.summary-date small'); if (small) small.textContent = `${dayItems.length} תנועות`;
    });
    document.querySelectorAll('[data-cashflow-action]').forEach(b => b.addEventListener('click', () => openAction(b.dataset.cashflowAction)));
    return true;
  }

  async function load() {
    ensureStyles(); ensureModal();
    const { data, error } = await client.rpc('get_cashflow_entries_report');
    if (error) { console.error('cashflow actions load failed', error); return; }
    const report = data?.report || data || {}; items = Array.isArray(report.items) ? report.items : [];
    if (!render()) { let attempts = 0; const timer = setInterval(() => { attempts += 1; if (render() || attempts >= 20) clearInterval(timer); }, 250); }
  }
  window.addEventListener('load', () => setTimeout(load,100));
  window.addEventListener('beautix:report-loaded', () => setTimeout(load,50));
  setTimeout(load,150);
})();