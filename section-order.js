(() => {
  const applySalesTarget = report => {
    const target = Number(report?.settings?.monthly_sales_target ?? report?.sales?.target ?? 0);
    const element = document.getElementById("sales-target");
    if (!element || !Number.isFinite(target) || target <= 0) return;
    const formatted = new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0
    }).format(target);
    if (element.textContent !== formatted) element.textContent = formatted;
  };

  window.addEventListener("beautix:report-loaded", event => applySalesTarget(event.detail));
  if (window.__beautixLastReport) applySalesTarget(window.__beautixLastReport);
})();
