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

  const mountEasyBusyImporter = () => {
    const pane = document.getElementById('input-pane-easybusy');
    if (!pane || pane.dataset.isolatedImporterMounted === 'true') return;
    pane.dataset.isolatedImporterMounted = 'true';
    pane.innerHTML = '<iframe title="ייבוא EasyBusy" src="test-v2-easybusy-import.html?v=20260804-isolated1" style="width:100%;min-height:720px;border:0;border-radius:16px;background:#fff" loading="lazy"></iframe>';
  };

  const load = () => {
    addAsset('css','test-v2-cashflow-ui.css?v=20260803-1','beautix-cashflow-ui');
    addAsset('js','test-v2-cashflow-ui.js?v=20260803-1','beautix-cashflow-ui-script');
    addAsset('js','test-v2-cashflow-submit-guard.js?v=20260804-guard1','beautix-cashflow-submit-guard');

    addTab('debts','חובות','reports');
    addPanel('debts','טוען חובות…','panel-reports');
    addAsset('css','test-v2-debts.css?v=20260804-debts1','beautix-debts-css');
    addAsset('js','test-v2-debts.js?v=20260804-debts1','beautix-debts-js');
    addAsset('css','test-v2-debts-actions.css?v=20260806-actions1','beautix-debts-actions-css');
    addAsset('js','test-v2-debts-actions.js?v=20260806-actions1','beautix-debts-actions-js');

    addTab('taxes','מיסים','reports');
    addPanel('taxes','טוען נתוני מס…','panel-reports');
    addAsset('css','test-v2-taxes.css?v=20260804-taxes1','beautix-taxes-css');
    addAsset('js','test-v2-taxes.js?v=20260804-taxes1','beautix-taxes-js');
    addAsset('js','test-v2-taxes-range.js?v=20260805-range1','beautix-taxes-range-js');

    document.addEventListener('click', event => {
      if (event.target.closest('[data-input-tab="easybusy"]')) setTimeout(mountEasyBusyImporter, 0);
    });
    window.addEventListener('message', event => {
      if (event.origin !== location.origin || event.data?.type !== 'beautix-v2-data-updated') return;
      window.dispatchEvent(new CustomEvent('beautix-v2:data-updated',{detail:event.data}));
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once: true });
  else load();
})();
