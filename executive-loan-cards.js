(() => {
  const source = document.getElementById("loan-asset-cards");
  const target = document.getElementById("executive-loan-list");
  const totalTarget = document.getElementById("executive-loans-total");
  if (!source || !target) return;

  const parseMoney = value => {
    const normalized = String(value || "").replace(/[^0-9,.-]/g, "").replace(/,/g, "");
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  };
  const money = value => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(Number(value || 0));
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function render() {
    const totalCard = source.querySelector(".debt-total-card");
    const cards = [...source.querySelectorAll(".liability-card:not(.debt-total-card)")];
    const total = totalCard ? parseMoney(totalCard.querySelector("strong")?.textContent) : cards.reduce((sum, card) => sum + parseMoney(card.querySelector("strong")?.textContent), 0);
    if (totalTarget) totalTarget.textContent = total ? money(total) : "—";

    target.classList.add("executive-loan-card-grid");
    if (!cards.length) {
      target.innerHTML = '<div class="executive-loans-empty">אין פירוט הלוואות זמין כרגע.</div>';
      return;
    }

    const maxBalance = Math.max(1, ...cards.map(card => parseMoney(card.querySelector("strong")?.textContent)));
    target.innerHTML = cards.map((card, index) => {
      const name = card.querySelector("span")?.textContent?.trim() || `הלוואה ${index + 1}`;
      const balance = parseMoney(card.querySelector("strong")?.textContent);
      const details = [...card.querySelectorAll("dl div")].map(row => ({
        label: row.querySelector("dt")?.textContent?.trim() || "פרט",
        value: row.querySelector("dd")?.textContent?.trim() || "לא זמין"
      }));
      const rows = details.length ? details.map(item => `<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd></div>`).join("") : '<div><dt>פירוט נוסף</dt><dd>לא זמין במקור הנתונים</dd></div>';
      return `<article class="executive-loan-card"><div class="executive-loan-card-head"><div><span>הלוואה פעילה</span><h4>${escapeHtml(name)}</h4></div><strong>${money(balance)}</strong></div><div class="executive-loan-bar"><i style="width:${Math.max(4, balance / maxBalance * 100)}%"></i></div><dl>${rows}</dl></article>`;
    }).join("");
  }

  const style = document.createElement("style");
  style.textContent = `.executive-loan-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.executive-loan-card{background:linear-gradient(145deg,#fff,#faf7fd);border:1px solid rgba(123,75,183,.2);border-radius:18px;padding:18px;box-shadow:0 7px 20px rgba(49,38,66,.07)}.executive-loan-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.executive-loan-card-head span{display:block;color:var(--muted);font-size:12px;margin-bottom:4px}.executive-loan-card-head h4{margin:0;color:var(--purple);font-size:20px}.executive-loan-card-head strong{font-size:22px;color:var(--red);direction:ltr;unicode-bidi:isolate}.executive-loan-card dl{display:grid;gap:8px;margin:16px 0 0}.executive-loan-card dl div{display:flex;justify-content:space-between;gap:12px;border-top:1px dashed var(--border);padding-top:8px}.executive-loan-card dt{color:var(--muted)}.executive-loan-card dd{margin:0;font-weight:800;text-align:left;direction:ltr;unicode-bidi:isolate}@media(max-width:760px){.executive-loan-card-grid{grid-template-columns:1fr}.executive-loan-card-head{flex-direction:column}.executive-loan-card-head strong{font-size:24px}}`;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => window.requestAnimationFrame(render));
  observer.observe(source, { childList: true, subtree: true, characterData: true });
  render();
})();