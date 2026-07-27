(() => {
  const config = window.BEAUTIX_CONFIG;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  const money = value => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(Number(value || 0));
  const dateText = value => value ? new Intl.DateTimeFormat("he-IL").format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : "—";
  const cardByLabel = label => [...document.querySelectorAll(".opportunities-section .card")].find(card => card.querySelector("span")?.textContent?.trim() === label);
  const setCard = (label, value, note) => {
    const card = cardByLabel(label);
    if (!card) return;
    const strong = card.querySelector("strong");
    const p = card.querySelector("p");
    if (strong) strong.textContent = value;
    if (p) p.textContent = note;
  };
  async function load() {
    const { data, error } = await client.rpc("get_sales_opportunities");
    if (error || !data) {
      console.error("Sales opportunities load failed", error);
      return;
    }
    const products = Array.isArray(data.top_products) ? data.top_products : [];
    const candidates = Array.isArray(data.return_candidates) ? data.return_candidates : [];
    const top = products[0];
    const best = candidates[0];
    setCard("מוצרים / טיפולים מובילים", top ? top.name : "אין נתון", top ? `${money(top.sales)} · ${top.transaction_count} עסקאות` : "לא נמצאו עסקאות עם פירוט מוצר או טיפול");
    setCard("לקוחות עם פוטנציאל חזרה", Number(data.return_candidate_count || 0) > 0 ? `${data.return_candidate_count} לקוחות` : "אין נתון", best ? `מועמד מוביל: ${best.name} · ביקור אחרון ${dateText(best.last_visit)} · ${money(best.lifetime_sales)}` : "לא נמצאו לקוחות ללא ביקור ב־90 הימים האחרונים");
  }
  window.addEventListener("beautix:report-loaded", load);
  if (window.__beautixLastReport) load();
})();
