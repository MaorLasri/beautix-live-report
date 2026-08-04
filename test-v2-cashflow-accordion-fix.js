(() => {
  'use strict';

  function enhanceLegacyDays(root = document) {
    root.querySelectorAll('.cashflow-day').forEach((day, index) => {
      if (day.dataset.accordionReady === 'true') return;
      const head = day.querySelector('.cashflow-day-head');
      const entries = day.querySelector('.cashflow-entries');
      if (!head || !entries) return;

      day.dataset.accordionReady = 'true';
      day.classList.add('cashflow-day-accordion-legacy');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');

      const open = index === 0;
      day.classList.toggle('open', open);
      entries.hidden = !open;
      head.setAttribute('aria-expanded', String(open));

      if (!head.querySelector('.cashflow-day-toggle')) {
        const toggle = document.createElement('span');
        toggle.className = 'cashflow-day-toggle';
        toggle.setAttribute('aria-hidden', 'true');
        toggle.textContent = '⌄';
        head.appendChild(toggle);
      }
    });
  }

  function toggleLegacyDay(head) {
    const day = head.closest('.cashflow-day');
    const entries = day?.querySelector('.cashflow-entries');
    if (!day || !entries) return;
    const open = !day.classList.contains('open');
    day.classList.toggle('open', open);
    entries.hidden = !open;
    head.setAttribute('aria-expanded', String(open));
  }

  document.addEventListener('click', event => {
    const head = event.target.closest('.cashflow-day-head');
    if (!head || !head.closest('#cashflow-upcoming')) return;
    toggleLegacyDay(head);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const head = event.target.closest('.cashflow-day-head');
    if (!head || !head.closest('#cashflow-upcoming')) return;
    event.preventDefault();
    toggleLegacyDay(head);
  });

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        enhanceLegacyDays(document);
        break;
      }
    }
  });

  function init() {
    const host = document.getElementById('cashflow-upcoming');
    if (!host) return;
    observer.observe(host, { childList: true, subtree: true });
    enhanceLegacyDays(host);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();