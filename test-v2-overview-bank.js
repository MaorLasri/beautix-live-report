(() => {
  'use strict';
  const cfg = window.BEAUTIX_V2_CONFIG;
  if (!cfg || !window.supabase) return;

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

  let latest = null;
  let loading = false;

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

  function render() {
    const grid = document.querySelector('#panel-overview .summary-grid');
    if (!grid || !latest) return;
    let card = document.getElementById('overview-fibi-balance');
    if (!card) {
      card = document.createElement('article');
      card.id = 'overview-fibi-balance';
      card.className = 'summary-card';
      grid.appendChild(card);
    }
    const bank = latest.fibi_current_account || {};
    const hasBalance = bank.balance !== null && bank.balance !== undefined;
    card.className = `summary-card ${Number(bank.balance || 0) < 0 ? 'negative' : 'positive'}${bank.is_stale ? ' warning' : ''}`;
    card.innerHTML = `<span>עו״ש עסקי · הבנק הבינלאומי</span><strong>${hasBalance ? money(bank.balance) : 'אין נתון'}</strong><p>${dateText(bank.balance_as_of)}${bank.is_estimated ? ' · נתון משוער' : ''}${bank.is_stale ? ` · לא עודכן ${bank.age_days || 0} ימים` : ' · נתון עדכני'}</p>`;
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
