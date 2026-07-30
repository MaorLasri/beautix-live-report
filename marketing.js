(() => {
  const config = window.BEAUTIX_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const view = document.getElementById('marketing-view');
  const errorBox = document.getElementById('marketing-error');
  const refreshButton = document.getElementById('marketing-refresh');

  const money = (value) => new Intl.NumberFormat('he-IL', { style:'currency', currency:'ILS', maximumFractionDigits:0 }).format(Number(value || 0));
  const number = (value) => new Intl.NumberFormat('he-IL', { maximumFractionDigits:1 }).format(Number(value || 0));
  const dateText = (value) => value ? new Intl.DateTimeFormat('he-IL').format(new Date(`${String(value).slice(0,10)}T00:00:00`)) : '—';
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const escapeHtml = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function renderRows(targetId, rows, renderer, colspan) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = rows.length ? rows.map(renderer).join('') : `<tr><td class="empty-row" colspan="${colspan}">אין נתונים</td></tr>`;
  }

  function render(report) {
    const s = report.summary || {};
    set('m-total-leads', number(s.total_leads));
    set('m-phone-coverage', `${number(s.leads_with_phone)} עם מספר טלפון`);
    set('m-matched', number(s.matched_customers));
    set('m-match-rate', `${number(s.lead_to_customer_pct)}% מהלידים`);
    set('m-visitors', number(s.ever_visited));
    set('m-visit-rate', `${number(s.lead_to_visit_pct)}% מהלידים`);
    set('m-paying', number(s.paying_customers));
    set('m-paying-rate', `${number(s.lead_to_paying_pct)}% מהלידים`);
    set('m-attributed-sales', money(s.attributed_sales));
    set('m-never-visited', number(s.matched_never_visited));
    set('m-customers-total', number(s.customers_total));
    set('m-customers-never', number(s.customers_never_visited));
    set('m-future-meetings', number(s.customers_with_future_meeting));
    set('m-debtors-count', number(s.debtors_count));
    set('m-debt-total', `סה״כ ${money(s.customer_debt_total)}`);

    renderRows('campaign-table', report.campaigns || [], (row) => `<tr><td>${escapeHtml(row.campaign_name)}</td><td>${number(row.leads)}</td><td>${number(row.matched_customers)}</td><td>${number(row.paying_customers)}</td><td>${money(row.attributed_sales)}</td></tr>`, 5);
    renderRows('debtors-table', report.debtors || [], (row) => `<tr><td>${escapeHtml(row.customer_name)}</td><td dir="ltr">${escapeHtml(row.phone)}</td><td>${money(Math.abs(Number(row.balance || 0)))}</td><td>${number(row.history_meetings_count)}</td></tr>`, 4);
    renderRows('never-visited-table', report.never_visited || [], (row) => `<tr><td>${escapeHtml(row.lead_name)}</td><td dir="ltr">${escapeHtml(row.phone)}</td><td>${escapeHtml(row.campaign_name || '—')}</td><td>${dateText(row.lead_date)}</td><td>${escapeHtml(row.customer_name || '—')}</td><td>${row.has_future_meeting ? dateText(row.next_meeting_at) : 'אין'}</td></tr>`, 6);

    set('marketing-updated', `עודכן ${new Intl.DateTimeFormat('he-IL', { dateStyle:'short', timeStyle:'medium' }).format(new Date())}`);
  }

  async function load() {
    errorBox.hidden = true;
    refreshButton.disabled = true;
    refreshButton.textContent = 'מרענן...';
    try {
      const { data, error } = await client.rpc('get_marketing_conversion_report');
      if (error) throw error;
      render(data?.report || data);
    } catch (error) {
      console.error(error);
      errorBox.textContent = `שגיאה בטעינת דו״ח השיווק: ${error.message}`;
      errorBox.hidden = false;
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = 'רענון';
    }
  }

  refreshButton.addEventListener('click', load);
  client.auth.getSession().then(({ data }) => {
    if (!data.session) { window.location.href = 'index.html'; return; }
    view.hidden = false;
    load();
  });
})();
