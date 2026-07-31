(() => {
  if (window.__beautixMobileTopbarCleanup) return;
  window.__beautixMobileTopbarCleanup = true;

  const style = document.createElement('style');
  style.id = 'beautix-mobile-topbar-cleanup-style';
  style.textContent = `
    .sidebar-test { display: none !important; }

    .beautix-language-control > span[aria-hidden="true"] {
      display: none !important;
    }

    .beautix-language-control {
      gap: 0 !important;
      min-width: 54px !important;
      padding: 0 8px !important;
      justify-content: center !important;
    }

    .beautix-language-control select {
      width: 40px !important;
      max-width: 40px !important;
      padding: 0 !important;
      text-align: center !important;
      text-align-last: center !important;
    }

    @media (max-width: 720px) {
      .site-sidebar {
        gap: 7px !important;
        padding: 7px 10px !important;
      }

      .profile-avatar-button {
        width: 42px !important;
        height: 42px !important;
      }

      .sidebar-nav {
        gap: 6px !important;
        min-width: 0 !important;
      }

      .sidebar-nav a {
        min-height: 40px !important;
        padding: 7px 11px !important;
        border-radius: 12px !important;
        font-size: 15px !important;
      }

      .sidebar-nav a:not(.active) {
        display: none !important;
      }

      .nav-utilities {
        gap: 6px !important;
      }

      .icon-control {
        width: 40px !important;
        height: 40px !important;
      }

      .beautix-language-control {
        min-width: 48px !important;
        min-height: 40px !important;
        padding: 0 5px !important;
        border-radius: 12px !important;
      }

      .beautix-language-control select {
        width: 36px !important;
        max-width: 36px !important;
        font-size: 15px !important;
      }
    }
  `;
  document.head.appendChild(style);

  const applyLabels = () => {
    const select = document.getElementById('beautix-language-select');
    if (!select) return;
    const he = select.querySelector('option[value="he"]');
    const en = select.querySelector('option[value="en"]');
    if (he) he.textContent = 'HE';
    if (en) en.textContent = 'EN';
    select.setAttribute('aria-label', 'HE / EN');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLabels, { once: true });
  } else {
    applyLabels();
  }
})();
