(() => {
  const report = document.getElementById("report-view");
  const assets = document.getElementById("loan-asset-cards")?.closest("section.dashboard-section");
  const cashflow = document.getElementById("days")?.closest("section.dashboard-section");
  if (!report || !assets || !cashflow) return;
  report.insertBefore(assets, cashflow);
})();
