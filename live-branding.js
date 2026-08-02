(() => {
  if (window.__beautixLiveBrandingLoaded) return;
  window.__beautixLiveBrandingLoaded = true;

  const cleanTitle = () => {
    const current = document.title || '';
    const cleaned = current
      .replace(/\s*[-—|:]?\s*test\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    document.title = cleaned || 'BeautiX';
  };

  const cleanVisibleLabels = () => {
    document.querySelectorAll('.sidebar-test, [data-environment="test"], [data-env="test"]').forEach(el => el.remove());
    document.querySelectorAll('body *').forEach(el => {
      if (el.children.length === 0 && /^\s*test\s*$/i.test(el.textContent || '')) el.remove();
    });
  };

  cleanTitle();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanVisibleLabels, { once: true });
  } else {
    cleanVisibleLabels();
  }
})();
