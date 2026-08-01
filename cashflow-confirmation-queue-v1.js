(() => {
  if (window.__beautixCashflowConfirmationQueueV1Loaded) return;
  window.__beautixCashflowConfirmationQueueV1Loaded = true;

  const cfg = window.BEAUTIX_CONFIG;
  if (!cfg || !window.supabase) return;
  const remember = localStorage.getItem('beautix-remember-device') === 'true';
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, storage: remember ? window.localStorage : window.sessionStorage, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const money = value => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(Number(value || 0));
  const dateText = value => value ? new Intl.DateTimeFormat('he-IL').format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : '—';
  const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const isoToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };

  function ensureStyles() {
    if (document.getElementById('cashflow-confirmation-queue-style')) return;
    const style = document.createElement('style');
    style.id = 'cashflow-confirmation-queue-style';
    style.textContent = `
      .cashflow-confirmation-queue{margin:22px 0;padding:20px;border:1px solid #e3dceb;border-radius:22px;background:#fff;box-shadow:0 10px 30px rgba(67,44,93,.08);box-sizing:border-box;max-width:100%}
      .cashflow-confirmation-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:16px}.cashflow-confirmation-head h3{margin:0;color:#5f2f86;font-size:1.22rem}.cashflow-confirmation-head p{margin:5px 0 0;color:#7a8495;font-size:.9rem}.cashflow-confirmation-count{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 10px;border-radius:999px;background:#f4eaf9;color:#7b3bb0;font-weight:900}
      .cashflow-confirmation-list{display:grid;gap:10px}.cashflow-confirmation-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px;border:1px solid #e6e9f0;border-radius:15px;background:#fbfcfe}.cashflow-confirmation-main{min-width:0}.cashflow-confirmation-main strong{display:block;color:#26384d;overflow-wrap:anywhere}.cashflow-confirmation-meta{display:flex;flex-wrap:wrap;gap:6px 10px;margin-top:6px;color:#7a8495;font-size:.82rem}.cashflow-confirmation-type{font-weight:800}.cashflow-confirmation-type.expense{color:#c6434b}.cashflow-confirmation-type.income{color:#268a59}.cashflow-confirmation-state.overdue{color:#b33a45;font-weight:800}.cashflow-confirmation-state.today{color:#8a6500;font-weight:800}.cashflow-confirmation-actions{display:flex;gap:8px}.cashflow-confirmation-btn{min-height:40px;padding:8px 14px;border:0;border-radius:11px;background:#22945f;color:#fff;font:inherit;font-weight:900;cursor:pointer}.cashflow-confirmation-btn:disabled{opacity:.55;cursor:wait}.cashflow-confirmation-empty{padding:16px;border:1px dashed #d9deea;border-radius:14px;text-align:center;color:#7a8495}.cashflow-confirmation-error{margin:10px 0 0;color:#b33a45;font-weight:700}
      @media(max-width:620px){.cashflow-confirmation-queue{padding:16px}.cashflow-confirmation-item{grid-template-columns:1fr}.cashflow-confirmation-actions{justify-content:stretch}.cashflow-confirmation-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureContainer() {
    if (document.getElementById('cashflow-confirmation-queue')) return document.getElementById('cashflow-confirmation-queue');
    ensureStyles();
    const section = document.createElement('section');
    section.id = 'cashflow-confirmation-queue';
    section.className = 'cashflow-confirmation-queue';
    section.innerHTML = `
      <div class="cashflow-confirmation-head">
        <div><h3>ממתין לאישור</h3><p>עד 5 תנועות מהישנות לחדשות, שהגיע מועדן ועדיין לא אושרו.</p></div>
        <span id="cashflow-confirmation-count" class="cashflow-confirmation-count">0</span>
      </div>
      <div id="cashflow-confirmation-list" class="cashflow-confirmation-list"><div class="cashflow-confirmation-empty">טוען תנועות…</div></div>
      <p id="cashflow-confirmation-error" class="cashflow-confirmation-error" hidden></p>`;
    const anchor = document.getElementById('cashflow-range-controls') || document.getElementById('days');
    if (anchor) anchor.insertAdjacentElement('beforebegin', section);
    return section;
  }

  function render(report) {
    ensureContainer();
    const items = Array.isArray(report?.items) ? report.items : [];
    const total = Number(report?.count || 0);
    const today = isoToday();
    const count = document.getElementById('cashflow-confirmation-count');
    const list = document.getElementById('cashflow-confirmation-list');
    if (count) count.textContent = String(total);
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="cashflow-confirmation-empty">אין כרגע תנועות שממתינות לאישור.</div>';
      return;
    }
    list.innerHTML = items.map(item => {
      const isPast = String(item.date || '').slice(0, 10) < today;
      const stateText = isPast ? 'המועד עבר — יש לאשר אם התנועה בוצעה' : 'מתרחש היום — יש לאשר אם התנועה בוצעה';
      const buttonText = isPast ? 'אישור שבוצע' : 'אישור להיום';
      return `
      <article class="cashflow-confirmation-item">
        <div class="cashflow-confirmation-main">
          <strong>${esc(item.description || 'תנועה')}</strong>
          <div class="cashflow-confirmation-meta">
            <span>${dateText(item.date)}</span>
            <span>${money(item.amount)}</span>
            <span class="cashflow-confirmation-type ${item.type === 'income' ? 'income' : 'expense'}">${item.type === 'income' ? 'הכנסה' : 'הוצאה'}</span>
            <span class="cashflow-confirmation-state ${isPast ? 'overdue' : 'today'}">${stateText}</span>
          </div>
        </div>
        <div class="cashflow-confirmation-actions"><button type="button" class="cashflow-confirmation-btn" data-confirm-entry="${esc(item.id)}" data-default-label="${buttonText}">${buttonText}</button></div>
      </article>`;
    }).join('');
    list.querySelectorAll('[data-confirm-entry]').forEach(button => button.addEventListener('click', () => confirmEntry(button.dataset.confirmEntry, button)));
  }

  async function confirmEntry(id, button) {
    const errorBox = document.getElementById('cashflow-confirmation-error');
    if (errorBox) errorBox.hidden = true;
    button.disabled = true;
    button.textContent = 'מאשר…';
    try {
      const { error } = await client.rpc('confirm_cashflow_entry_v1', { p_entry_id: id });
      if (error) throw error;
      await load();
      window.dispatchEvent(new CustomEvent('beautix:cashflow-confirmed', { detail: { id } }));
      window.dispatchEvent(new Event('beautix:report-loaded'));
    } catch (error) {
      button.disabled = false;
      button.textContent = button.dataset.defaultLabel || 'אישור';
      if (errorBox) { errorBox.textContent = `האישור נכשל: ${error.message}`; errorBox.hidden = false; }
    }
  }

  async function load() {
    ensureContainer();
    const { data, error } = await client.rpc('get_cashflow_confirmation_queue_v1', { p_limit: 5 });
    if (error) {
      const box = document.getElementById('cashflow-confirmation-error');
      if (box) { box.textContent = `לא ניתן לטעון את רשימת האישור: ${error.message}`; box.hidden = false; }
      return;
    }
    render(data || {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(load, 150), { once: true }); else setTimeout(load, 150);
  window.addEventListener('beautix:report-loaded', () => setTimeout(load, 100));
  window.addEventListener('beautix:cashflow-range-rendered', () => setTimeout(load, 100));
})();