(() => {
  'use strict';
  const cfg = window.BEAUTIX_V2_CONFIG;
  if (!cfg || !window.supabase) return;

  const FIBI_ACCOUNT_ID = '6b1595b9-923a-4f67-ae5d-1d01604c6c6a';

  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const money = value => new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS', maximumFractionDigits: 2
  }).format(Number(value || 0));
  const dateText = value => value
    ? new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(`${String(value).slice(0, 10)}T00:00:00`))
    : 'אין תאריך עדכון';
  const esc = v => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  let latest = null;
  let loading = false;
  let card = null;
  let formOpen = false;

  function periodArgs() {
    const mode = document.getElementById('period-mode')?.value || 'month';
    const label = document.getElementById('period-label')?.textContent || '';
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (mode === 'year') {
      const year = Number(label) || now.getFullYear();
      start = new Date(year, 0, 1); end = new Date(year, 11, 31);
    }
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { p_start: iso(start), p_end: iso(end) };
  }

  function buildCard() {
    if (card) return card;
    card = document.createElement('article');
    card.id = 'overview-fibi-balance';
    card.className = 'summary-card';
    card.innerHTML = `<div class="bank-card-main"></div>
      <div class="bank-balance-update">
        <button type="button" class="bank-update-toggle" aria-expanded="false">עדכון יתרה ידני</button>
        <form class="bank-update-form" hidden novalidate>
          <label>יתרה בפועל (₪)<input class="bank-update-balance" type="number" step="0.01" inputmode="decimal" required></label>
          <label>נכון לתאריך<input class="bank-update-date" type="date" required></label>
          <label class="wide">הערה (לא חובה)<input class="bank-update-note" type="text" maxlength="200" placeholder="למשל: יתרה מאפליקציית הבנק"></label>
          <p class="bank-update-hint"></p>
          <p class="bank-update-error" hidden role="alert"></p>
          <div class="bank-update-actions">
            <button type="submit" class="primary-btn bank-update-save">שמירת יתרה</button>
            <button type="button" class="secondary-btn bank-update-cancel">ביטול</button>
          </div>
        </form>
        <p class="bank-update-success" hidden role="status"></p>
      </div>`;
    card.querySelector('.bank-update-toggle').addEventListener('click', toggleForm);
    card.querySelector('.bank-update-cancel').addEventListener('click', () => closeForm());
    card.querySelector('.bank-update-form').addEventListener('submit', submitBalance);
    return card;
  }

  function toggleForm() {
    formOpen ? closeForm() : openForm();
  }

  function openForm() {
    if (!card) return;
    const bank = latest?.fibi_current_account || {};
    const form = card.querySelector('.bank-update-form');
    const asOf = bank.balance_as_of ? String(bank.balance_as_of).slice(0, 10) : null;
    card.querySelector('.bank-update-balance').value =
      bank.balance === null || bank.balance === undefined ? '' : Number(bank.balance);
    card.querySelector('.bank-update-date').value = today();
    card.querySelector('.bank-update-note').value = '';
    card.querySelector('.bank-update-hint').textContent = asOf
      ? `העדכון האחרון נרשם לתאריך ${dateText(asOf)}. תאריך מוקדם יותר יידחה על ידי המערכת.`
      : 'לחשבון אין עדיין תאריך עדכון שמור.';
    const errorBox = card.querySelector('.bank-update-error');
    errorBox.hidden = true; errorBox.textContent = '';
    card.querySelector('.bank-update-success').hidden = true;
    form.hidden = false;
    formOpen = true;
    card.querySelector('.bank-update-toggle').setAttribute('aria-expanded', 'true');
    card.querySelector('.bank-update-toggle').textContent = 'סגירת טופס העדכון';
    card.querySelector('.bank-update-balance').focus();
  }

  function closeForm() {
    if (!card) return;
    card.querySelector('.bank-update-form').hidden = true;
    formOpen = false;
    card.querySelector('.bank-update-toggle').setAttribute('aria-expanded', 'false');
    card.querySelector('.bank-update-toggle').textContent = 'עדכון יתרה ידני';
  }

  async function submitBalance(event) {
    event.preventDefault();
    if (!card) return;
    const errorBox = card.querySelector('.bank-update-error');
    const successBox = card.querySelector('.bank-update-success');
    errorBox.hidden = true; errorBox.textContent = '';
    successBox.hidden = true;

    const rawBalance = card.querySelector('.bank-update-balance').value;
    const balance = Number(rawBalance);
    const asOf = card.querySelector('.bank-update-date').value || today();
    const note = card.querySelector('.bank-update-note').value.trim();
    if (rawBalance === '' || !Number.isFinite(balance)) {
      errorBox.textContent = 'יש להזין יתרה מספרית.';
      errorBox.hidden = false;
      return;
    }

    const buttons = card.querySelectorAll('.bank-update-form button');
    buttons.forEach(b => { b.disabled = true; });
    const saveButton = card.querySelector('.bank-update-save');
    const saveLabel = saveButton.textContent;
    saveButton.textContent = 'שומר…';

    const { data, error } = await client.rpc('update_test_v2_bank_balance_v1', {
      p_account_id: latest?.fibi_current_account?.account_id || FIBI_ACCOUNT_ID,
      p_new_balance: balance,
      p_as_of: asOf,
      p_note: note || null
    });

    buttons.forEach(b => { b.disabled = false; });
    saveButton.textContent = saveLabel;

    if (error) {
      errorBox.textContent = error.message || 'העדכון נכשל.';
      errorBox.hidden = false;
      return;
    }

    const result = data || {};
    const oldText = result.old_balance === null || result.old_balance === undefined
      ? 'אין נתון' : money(result.old_balance);
    successBox.innerHTML = `היתרה עודכנה · <span dir="ltr">${esc(oldText)} → ${esc(money(result.new_balance))}</span> · נכון ל־${esc(dateText(result.new_balance_as_of || asOf))}`;
    successBox.hidden = false;
    closeForm();

    await load();
    window.BEAUTIX_V2?.refreshOverview?.();
    window.BEAUTIX_V2?.refreshCashflow?.();
    window.dispatchEvent(new CustomEvent('beautix-v2:data-updated', { detail: { source: 'overview-bank-balance' } }));
  }

  function render() {
    const grid = document.querySelector('#panel-overview .summary-grid');
    if (!grid || !latest) return;
    buildCard();
    if (card.parentNode !== grid) grid.appendChild(card);
    const bank = latest.fibi_current_account || {};
    const hasBalance = bank.balance !== null && bank.balance !== undefined;
    card.className = `summary-card bank-balance-card ${Number(bank.balance || 0) < 0 ? 'negative' : 'positive'}${bank.is_stale ? ' warning' : ''}`;
    card.querySelector('.bank-card-main').innerHTML = `<span>עו״ש עסקי · הבנק הבינלאומי</span><strong>${hasBalance ? money(bank.balance) : 'אין נתון'}</strong><p>${dateText(bank.balance_as_of)}${bank.is_estimated ? ' · נתון משוער' : ''}${bank.is_stale ? ` · לא עודכן ${bank.age_days || 0} ימים` : ' · נתון עדכני'}</p>`;
  }

  async function load() {
    if (loading) return;
    loading = true;
    try {
      const { data, error } = await client.rpc('get_test_v2_overview_period_v1', periodArgs());
      if (error) throw error;
      latest = data || {};
      render();
    } catch (error) {
      console.error('Failed to load FIBI overview balance', error);
    } finally {
      loading = false;
    }
  }

  const observer = new MutationObserver(() => render());
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('#panel-overview .summary-grid');
    if (grid) observer.observe(grid, { childList: true });
    load();
  });
  window.addEventListener('beautix-v2:period-change', load);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-tab="overview"]')) setTimeout(load, 0);
  });
})();
