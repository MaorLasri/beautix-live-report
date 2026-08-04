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

  const addTab = (tab, label, beforeTab) => {
    const nav = document.querySelector('.nav');
    if (!nav || nav.querySelector(`[data-tab="${tab}"]`)) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.tab = tab;
    button.textContent = label;
    const before = nav.querySelector(`[data-tab="${beforeTab}"]`);
    before ? nav.insertBefore(button,before) : nav.appendChild(button);
  };

  const addPanel = (tab, loadingText, beforePanel) => {
    const main = document.querySelector('.main');
    if (!main || document.getElementById(`panel-${tab}`)) return;
    const panel = document.createElement('section');
    panel.id = `panel-${tab}`;
    panel.className = 'tab-panel';
    panel.hidden = true;
    panel.innerHTML = `<div class="empty-state"><p>${loadingText}</p></div>`;
    const before = document.getElementById(beforePanel);
    before ? main.insertBefore(panel,before) : main.appendChild(panel);
  };

  const load = () => {
    addAsset('css','test-v2-cashflow-ui.css?v=20260803-1','beautix-cashflow-ui');
    addAsset('js','test-v2-cashflow-ui.js?v=20260803-1','beautix-cashflow-ui-script');
    addAsset('js','test-v2-cashflow-submit-guard.js?v=20260804-guard1','beautix-cashflow-submit-guard');

    addTab('debts','חובות','reports');
    addPanel('debts','טוען חובות…','panel-reports');
    addAsset('css','test-v2-debts.css?v=20260804-debts1','beautix-debts-css');
    addAsset('js','test-v2-debts.js?v=20260804-debts1','beautix-debts-js');

    addTab('taxes','מיסים','reports');
    addPanel('taxes','טוען נתוני מס…','panel-reports');
    addAsset('css','test-v2-taxes.css?v=20260804-taxes1','beautix-taxes-css');
    addAsset('js','test-v2-taxes.js?v=20260804-taxes1','beautix-taxes-js');
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
