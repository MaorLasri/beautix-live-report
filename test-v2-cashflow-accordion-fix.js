(() => {
  'use strict';

  const openDays = new Set();

  function keyFor(day, index) {
    return day.dataset.day || day.dataset.dayKey || day.querySelector('strong')?.textContent?.trim() || `day-${index}`;
  }

  function applyState(day, open) {
    const details = day.querySelector('.cashflow-entries, .cash-day-details');
    const trigger = day.querySelector('.cashflow-day-head, .cash-day-summary');
    if (!details || !trigger) return;
    day.classList.toggle('open', open);
    details.hidden = !open;
    details.style.setProperty('display', open ? '' : 'none', 'important');
    trigger.setAttribute('aria-expanded', String(open));
    const key = day.dataset.accordionKey;
    if (key) open ? openDays.add(key) : openDays.delete(key);
  }

  function attach(day, index) {
    const trigger = day.querySelector('.cashflow-day-head, .cash-day-summary');
    const details = day.querySelector('.cashflow-entries, .cash-day-details');
    if (!trigger || !details) return;

    const key = keyFor(day, index);
    day.dataset.accordionKey = key;
    day.classList.add('cashflow-day-accordion-ready');

    if (!trigger.querySelector('.cashflow-day-toggle-button')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cashflow-day-toggle-button';
      button.setAttribute('aria-label', 'פתיחה או סגירה של פירוט היום');
      button.innerHTML = '<span aria-hidden="true">⌄</span>';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        applyState(day, !day.classList.contains('open'));
      });
      trigger.appendChild(button);
    }

    if (trigger.dataset.directAccordionBound !== 'true') {
      trigger.dataset.directAccordionBound = 'true';
      trigger.addEventListener('click', event => {
        if (event.target.closest('.cashflow-day-toggle-button')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        applyState(day, !day.classList.contains('open'));
      });
      trigger.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        applyState(day, !day.classList.contains('open'));
      });
    }

    if (!trigger.matches('button')) {
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('tabindex', '0');
    }

    const shouldOpen = openDays.has(key) || (openDays.size === 0 && index === 0);
    applyState(day, shouldOpen);
  }

  function scan() {
    const host = document.getElementById('cashflow-upcoming');
    if (!host) return;
    const days = [...host.querySelectorAll('.cashflow-day, .cash-day-accordion')];
    days.forEach(attach);
  }

  let queued = false;
  function queueScan() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }

  function init() {
    const host = document.getElementById('cashflow-upcoming');
    if (!host) return;
    new MutationObserver(queueScan).observe(host, { childList: true, subtree: true });
    scan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();