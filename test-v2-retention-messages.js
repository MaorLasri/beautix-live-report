(() => {
  'use strict';

  const firstName = value => String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] || '';

  const customerMessage = name =>
    `היי ${name}, מה שלומך? כאן אור מביוטיקס 😊\nעבר קצת זמן מאז הביקור האחרון שלך, ורציתי לשאול איך את מרגישה ואם תרצי שנבדוק יחד איזה טיפול המשך הכי יתאים לך.\nמתי יהיה לך נוח לדבר?`;

  const leadMessage = (name, interest) => {
    const interestText = interest && interest !== 'ליד' ? ` לגבי ${interest}` : '';
    return `היי ${name}, מה שלומך? כאן אור מביוטיקס 😊\nראיתי שהתעניינת${interestText}, ואשמח להבין מה את מחפשת ולעזור לך לבחור את הטיפול שהכי יתאים לך.\nמתי יהיה לך נוח לדבר?`;
  };

  function updateWhatsAppHref(link, message) {
    if (!link?.href || link.getAttribute('aria-disabled') === 'true') return;
    try {
      const url = new URL(link.href);
      if (!url.hostname.includes('wa.me')) return;
      if (url.searchParams.get('text') === message) return;
      url.searchParams.set('text', message);
      link.href = url.toString();
    } catch (_) {}
  }

  function enhanceRows() {
    document.querySelectorAll('.retention-row').forEach(row => {
      const main = row.querySelector('.retention-main');
      const link = row.querySelector('.retention-whatsapp-action, .wa-inline');
      if (!main || !link) return;
      const name = firstName(main.querySelector('strong')?.textContent);
      if (!name) return;
      const type = main.dataset.type;
      const interest = main.querySelector('.retention-value b')?.textContent?.trim() || '';
      const message = type === 'lead' ? leadMessage(name, interest) : customerMessage(name);
      updateWhatsAppHref(link, message);
    });
  }

  function enhanceDialog() {
    const dialog = document.getElementById('retention-dialog');
    const link = document.getElementById('retention-whatsapp');
    if (!dialog || !link || link.style.display === 'none') return;
    const name = firstName(document.getElementById('retention-name')?.textContent);
    if (!name) return;
    const isLead = document.getElementById('retention-qualified-wrap')?.hidden === false;
    const profile = document.getElementById('retention-profile');
    const interestItem = [...(profile?.querySelectorAll('div') || [])].find(item =>
      item.querySelector('span')?.textContent?.trim() === 'עניין'
    );
    const interest = interestItem?.querySelector('b')?.textContent?.trim() || '';
    updateWhatsAppHref(link, isLead ? leadMessage(name, interest) : customerMessage(name));
  }

  function scan() {
    enhanceRows();
    enhanceDialog();
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
    new MutationObserver(queueScan).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'style', 'hidden']
    });
    scan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();