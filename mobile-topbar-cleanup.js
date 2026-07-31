(() => {
  if (window.__beautixMobileTopbarCleanupV3) return;
  window.__beautixMobileTopbarCleanupV3 = true;

  const style = document.createElement('style');
  style.id = 'beautix-mobile-topbar-cleanup-style-v3';
  style.textContent = `
    .sidebar-test { display: none !important; }
    .beautix-language-control > span[aria-hidden="true"] { display: none !important; }
    .beautix-language-control { gap:0!important; min-width:54px!important; padding:0 8px!important; justify-content:center!important; }
    .beautix-language-control select { width:40px!important; max-width:40px!important; padding:0!important; text-align:center!important; text-align-last:center!important; }
    .mobile-nav-menu { display:none; position:relative; flex:1 1 auto; min-width:0; }
    .mobile-nav-menu summary { list-style:none; display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:42px; padding:8px 12px; border-radius:13px; background:linear-gradient(135deg,var(--pink),var(--purple)); color:#fff; font-weight:800; box-shadow:0 6px 16px rgba(123,75,183,.2); cursor:pointer; white-space:nowrap; }
    .mobile-nav-menu summary::-webkit-details-marker { display:none; }
    .mobile-nav-menu summary::after { content:'⌄'; font-size:18px; line-height:1; transition:transform .18s ease; }
    .mobile-nav-menu[open] summary::after { transform:rotate(180deg); }
    .mobile-nav-options { position:absolute; top:calc(100% + 8px); inset-inline-start:0; width:min(240px,calc(100vw - 28px)); padding:8px; border:1px solid rgba(123,75,183,.2); border-radius:16px; background:#fff; box-shadow:0 18px 40px rgba(49,38,66,.2); z-index:250; display:grid; gap:5px; }
    .mobile-nav-options a { display:block; padding:11px 12px; border-radius:11px; color:var(--navy); text-decoration:none; font-weight:800; white-space:nowrap; }
    .mobile-nav-options a:hover,.mobile-nav-options a.active { color:#fff; background:linear-gradient(135deg,var(--pink),var(--purple)); }

    @media (max-width:1024px) {
      .site-sidebar { gap:7px!important; padding:7px 10px!important; }
      .profile-avatar-button { width:42px!important; height:42px!important; }
      .sidebar-nav { display:none!important; }
      .mobile-nav-menu { display:block; }
      .nav-utilities { gap:6px!important; }
      .icon-control { width:40px!important; height:40px!important; }
      .beautix-language-control { min-width:48px!important; min-height:40px!important; padding:0 5px!important; border-radius:12px!important; }
      .beautix-language-control select { width:36px!important; max-width:36px!important; font-size:15px!important; }
    }
  `;
  document.head.appendChild(style);

  function applyLanguageLabels() {
    const select = document.getElementById('beautix-language-select');
    if (!select) return;
    const he = select.querySelector('option[value="he"]');
    const en = select.querySelector('option[value="en"]');
    if (he) he.textContent = 'HE';
    if (en) en.textContent = 'EN';
    select.setAttribute('aria-label', 'HE / EN');
  }

  function buildMobileMenu() {
    if (document.querySelector('.mobile-nav-menu')) return;
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;
    const links = [...nav.querySelectorAll('a')];
    if (!links.length) return;
    const active = links.find(link => link.classList.contains('active')) || links[0];
    const details = document.createElement('details');
    details.className = 'mobile-nav-menu';
    const summary = document.createElement('summary');
    summary.textContent = active.textContent.trim();
    const options = document.createElement('div');
    options.className = 'mobile-nav-options';
    links.forEach(link => {
      const copy = link.cloneNode(true);
      copy.addEventListener('click', () => details.removeAttribute('open'));
      options.appendChild(copy);
    });
    details.append(summary, options);
    nav.insertAdjacentElement('afterend', details);
    document.addEventListener('click', event => {
      if (!details.contains(event.target)) details.removeAttribute('open');
    });
  }

  function init() {
    buildMobileMenu();
    applyLanguageLabels();
    window.addEventListener('beautix:language-changed', () => {
      requestAnimationFrame(() => {
        applyLanguageLabels();
        const active = document.querySelector('.sidebar-nav a.active');
        const summary = document.querySelector('.mobile-nav-menu summary');
        if (active && summary) summary.textContent = active.textContent.trim();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
