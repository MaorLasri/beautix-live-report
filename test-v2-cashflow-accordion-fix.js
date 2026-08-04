(() => {
  'use strict';

  const openDays = new Set();

  function setLegacyDayState(day, open) {
    const head = day.querySelector('.cashflow-day-head');
    const entries = day.querySelector('.cashflow-entries');
    if (!head || !entries) return;
    day.classList.toggle('open', open);
    entries.hidden = !open;
    entries.style.display = open ? '' : 'none';
    head.setAttribute('aria-expanded', String(open));
    const date = day.dataset.dayKey;
    if (date) open ? openDays.add(date) : openDays.delete(date);
  }

  function enhanceLegacyDays(root = document) {
    const days = [...root.querySelectorAll('.cashflow-day')];
    days.forEach((day, index) => {
      const head = day.querySelector('.cashflow-day-head');
      const entries = day.querySelector('.cashflow-entries');
      if (!head || !entries) return;

      const dateText = head.querySelector('strong')?.textContent?.trim() || `day-${index}`;
      day.dataset.dayKey = dateText;
      day.dataset.accordionReady = 'true';
      day.classList.add('cashflow-day-accordion-legacy');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');

      if (!head.querySelector('.cashflow-day-toggle')) {
        const toggle = document.createElement('span');
        toggle.className = 'cashflow-day-toggle';
        toggle.setAttribute('aria-hidden', 'true');
        toggle.textContent = '⌄';
        head.appendChild(toggle);
      }

      const shouldOpen = openDays.has(dateText) || (openDays.size === 0 && index === 0);
      setLegacyDayState(day, shouldOpen);
    });
  }

  function toggleLegacyDay(head) {
    const day = head.closest('.cashflow-day');
    if (!day) return;
    setLegacyDayState(day, !day.classList.contains('open'));
  }

  document.addEventListener('click', event => {
    const head = event.target.closest('.cashflow-day-head');
    if (!head || !head.closest('#cashflow-upcoming')) return;
    event.preventDefault();
    event.stopPropagation();
    toggleLegacyDay(head);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const head = event.target.closest('.cashflow-day-head');
    if (!head || !head.closest('#cashflow-upcoming')) return;
    event.preventDefault();
    event.stopPropagation();
    toggleLegacyDay(head);
  }, true);

  const observer = new MutationObserver(() => enhanceLegacyDays(document));

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