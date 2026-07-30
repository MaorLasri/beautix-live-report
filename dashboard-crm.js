(() => {
  const config = window.BEAUTIX_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const money = (value) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(Number(value || 0));
  const number = (value) => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(Number(value || 0));
  const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };

  function render(report) {
    const crm = report.crm || {};
    const services = report.top_services || [];
    const returns = report.return_opportunities || {};

    set('customer-debts', money(crm.customer_debt_total));
    set('customer-debts-note', `${number(crm.debtors_count)} לקוחות עם יתרה שלילית`);
    set('top-services', services.length ? money(services[0].sales) : 'אין נתון');
    set('top-services-note', services.length ? `${services[0].name} · ${number(services[0].transactions)} עסקאות` : 'לא נמצאו עסקאות עם פירוט טיפול');
    set('return-customers', number(returns.count));
    set('return-customers-note', returns.count ? `לקוחות שביקרו בעבר, ללא פגישה עתידית וללא ביקור 90+ יום` : 'לא נמצאו לקוחות בקבוצה זו');
    set('marketing-match-rate', `${number(crm.lead_to_customer_pct)}%`);
    set('marketing-paying-rate', `${number(crm.lead_to_paying_pct)}%`);
    set('marketing-attributed-sales', money(crm.attributed_sales));
  }

  async function load() {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return;
    const { data, error } = await client.rpc(config.reportRpc);
    if (error) { console.error('CRM dashboard load failed', error); return; }
    render(data?.report || data || {});
  }

  client.auth.onAuthStateChange((event, session) => {
    if (session) setTimeout(load, 0);
  });
  load();
})();
