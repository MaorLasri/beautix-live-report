(() => {
  'use strict';

  const firstName = value => String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] || '';

  const numberFromText = value => {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : null;
  };

  function customerMessage(name, daysInactive) {
    if (daysInactive != null && daysInactive >= 180) {
      return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nעבר זמן מאז שנפגשנו ורציתי לשאול מה שלומך ואיך את מרגישה.\nאם יש משהו שמפריע לך כרגע, כתבי לי ואשמח לכוון אותך.`;
    }
    if (daysInactive != null && daysInactive >= 60) {
      return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nרציתי לבדוק איך את מרגישה מאז הביקור האחרון ואם יש משהו שהיית רוצה לשפר או לטפל בו עכשיו.\nכתבי לי מה הכי מפריע לך ואשמח לעזור.`;
    }
    return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nרציתי לבדוק איך את מרגישה מאז הביקור האחרון ואם יש משהו שתרצי להתייעץ עליו.\nאני כאן ואשמח לעזור.`;
  }

  function leadMessage(name, status, daysOpen) {
    const normalizedStatus = String(status || '').trim();

    if (normalizedStatus === 'נקבע תור') {
      return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nרציתי לוודא שהכול ברור לקראת התור ולבדוק אם יש משהו שתרצי לשאול לפני שניפגש.`;
    }

    if (normalizedStatus === 'נוצר קשר') {
      return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nרציתי להמשיך מהמקום שבו עצרנו ולבדוק אם עדיין רלוונטי לך לקבל הכוונה.\nכתבי לי מה הכי מפריע לך כרגע ואשמח לעזור.`;
    }

    if (normalizedStatus === 'אין מענה') {
      return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nרציתי לחזור אלייך ולבדוק אם עדיין רלוונטי לך לקבל הכוונה.\nספרי לי מה הכי מפריע לך כרגע ואשמח לכוון אותך בצורה אישית.`;
    }

    if (daysOpen != null && daysOpen > 30) {
      return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nפנית אליי בעבר ורציתי לבדוק אם עדיין תרצי לקבל ממני הכוונה אישית.\nספרי לי מה הכי מפריע לך כרגע ואשמח לעזור.`;
    }

    if (daysOpen != null && daysOpen > 7) {
      return `היי ${name}, מה שלומך? כאן אור מביוטיקס 🌸\nרציתי לחזור אלייך ולבדוק אם עדיין רלוונטי לך לשמוע על האפשרויות שיכולות להתאים לך.\nמה הכי מפריע לך כרגע?`;
    }

    return `היי ${name} יקירה 🌸\nשמחה שפנית אליי.\nלפני שאסביר על הטיפול, אשמח להבין מה הכי מפריע לך כרגע — קו הלסת, הצוואר, אזור העיניים או משהו אחר?`;
  }

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

  function rowContext(main) {
    const meta = main.querySelector('span')?.textContent?.trim() || '';
    const status = main.querySelector('.retention-value span')?.textContent?.trim() || '';
    return { meta, status, days: numberFromText(meta) };
  }

  function enhanceRows() {
    document.querySelectorAll('.retention-row').forEach(row => {
      const main = row.querySelector('.retention-main');
      const link = row.querySelector('.retention-whatsapp-action, .wa-inline');
      if (!main || !link) return;
      const name = firstName(main.querySelector('strong')?.textContent);
      if (!name) return;
      const { meta, status, days } = rowContext(main);
      const message = main.dataset.type === 'lead'
        ? leadMessage(name, status, days)
        : customerMessage(name, /אין תאריך/.test(meta) ? null : days);
      updateWhatsAppHref(link, message);
    });
  }

  function profileValue(label) {
    const profile = document.getElementById('retention-profile');
    const item = [...(profile?.querySelectorAll('div') || [])].find(node =>
      node.querySelector('span')?.textContent?.trim() === label
    );
    return item?.querySelector('b')?.textContent?.trim() || '';
  }

  function enhanceDialog() {
    const dialog = document.getElementById('retention-dialog');
    const link = document.getElementById('retention-whatsapp');
    if (!dialog || !link || link.style.display === 'none') return;
    const name = firstName(document.getElementById('retention-name')?.textContent);
    if (!name) return;

    const isLead = document.getElementById('retention-qualified-wrap')?.hidden === false;
    const meta = document.getElementById('retention-meta')?.textContent?.trim() || '';
    const statusSelect = document.getElementById('retention-status');
    const status = statusSelect?.selectedOptions?.[0]?.textContent?.trim() || '';
    const days = numberFromText(meta);

    const message = isLead
      ? leadMessage(name, status, days)
      : customerMessage(name, /אין תאריך/.test(meta) ? null : days);
    updateWhatsAppHref(link, message);
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
    document.addEventListener('change', event => {
      if (event.target?.id === 'retention-status') queueScan();
    });
    scan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();