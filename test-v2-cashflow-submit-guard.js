(() => {
  'use strict';

  function bind(form) {
    if (!form || form.dataset.submitGuardBound === 'true') return;
    form.dataset.submitGuardBound = 'true';

    form.addEventListener('submit', event => {
      if (form.dataset.saving === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      form.dataset.saving = 'true';
      const submit = form.querySelector('button[type="submit"]');
      if (submit) {
        submit.dataset.originalText = submit.textContent || 'שמירה';
        submit.disabled = true;
        submit.textContent = 'שומר…';
      }

      const release = () => {
        form.dataset.saving = 'false';
        if (submit) {
          submit.disabled = false;
          submit.textContent = submit.dataset.originalText || 'שמירה';
        }
      };

      const dialog = form.closest('dialog');
      if (dialog) dialog.addEventListener('close', release, { once: true });
      window.setTimeout(release, 12000);
    }, true);
  }

  function scan() {
    bind(document.getElementById('cashflow-entry-form'));
  }

  function init() {
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
