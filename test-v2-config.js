window.BEAUTIX_V2_CONFIG = Object.freeze({
  environment: "test-v2",
  supabaseUrl: "https://bkosuztxdgvfhykzuigx.supabase.co",
  supabasePublishableKey: "sb_publishable_wXoQC8djBvfiLYK1eX-h_Q_uFnGTAPB",
  defaultTab: "overview",
  defaultPeriodMode: "month",
  timezone: "Asia/Jerusalem"
});

(() => {
  const addAsset = (kind, src, marker) => {
    if (document.querySelector(`[data-${marker}]`)) return;
    const element = document.createElement(kind === 'css' ? 'link' : 'script');
    if (kind === 'css') {
      element.rel = 'stylesheet';
      element.href = src;
    } else {
      element.src = src;
      element.defer = true;
    }
    element.dataset[marker.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())] = 'true';
    document.head.appendChild(element);
  };

  const load = () => {
    addAsset('css','test-v2-cashflow-ui.css?v=20260803-1','beautix-cashflow-ui');
    addAsset('js','test-v2-cashflow-ui.js?v=20260803-1','beautix-cashflow-ui-script');

    const nav = document.querySelector('.nav');
    if (nav && !nav.querySelector('[data-tab="debts"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = 'debts';
      button.textContent = 'חובות';
      const reports = nav.querySelector('[data-tab="reports"]');
      reports ? nav.insertBefore(button,reports) : nav.appendChild(button);
    }

    const main = document.querySelector('.main');
    if (main && !document.getElementById('panel-debts')) {
      const panel = document.createElement('section');
      panel.id = 'panel-debts';
      panel.className = 'tab-panel';
      panel.hidden = true;
      panel.innerHTML = '<div class="empty-state"><p>טוען חובות…</p></div>';
      const reportsPanel = document.getElementById('panel-reports');
      reportsPanel ? main.insertBefore(panel,reportsPanel) : main.appendChild(panel);
    }

    addAsset('css','test-v2-debts.css?v=20260804-debts1','beautix-debts-css');
    addAsset('js','test-v2-debts.js?v=20260804-debts1','beautix-debts-js');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
