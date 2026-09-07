(() => {
  'use strict';

  const whatsappIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12.04 2a9.84 9.84 0 0 0-8.52 14.77L2 22l5.38-1.41A9.9 9.9 0 1 0 12.04 2Zm0 17.98a8.07 8.07 0 0 1-4.12-1.13l-.3-.18-3.19.84.85-3.11-.2-.32A8.1 8.1 0 1 1 12.04 19.98Zm4.44-6.06c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.03-.38-1.96-1.21-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.58.18 1.1.16 1.51.1.46-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z"/>
    </svg>`;

  const phoneIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M6.62 10.79a15.46 15.46 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z"/>
    </svg>`;

  function phoneFromWhatsAppHref(href) {
    const match = String(href || '').match(/wa\.me\/(\d+)/);
    if (!match) return '';
    const international = match[1];
    return international.startsWith('972') ? `0${international.slice(3)}` : international;
  }

  function enhanceRow(row) {
    const whatsapp = row.querySelector('.wa-inline');
    if (!whatsapp || row.querySelector('.retention-contact-actions')) return;

    const disabled = whatsapp.getAttribute('aria-disabled') === 'true';
    const rawPhone = phoneFromWhatsAppHref(whatsapp.href);
    const actions = document.createElement('div');
    actions.className = 'retention-contact-actions';

    whatsapp.classList.add('retention-icon-action', 'retention-whatsapp-action');
    whatsapp.innerHTML = whatsappIcon;
    whatsapp.setAttribute('aria-label', 'שליחת הודעה ב-WhatsApp');
    whatsapp.setAttribute('title', 'WhatsApp');

    const call = document.createElement('a');
    call.className = 'retention-icon-action retention-call-action';
    call.innerHTML = phoneIcon;
    call.setAttribute('aria-label', 'חיוג ללקוחה');
    call.setAttribute('title', 'חיוג');
    if (!disabled && rawPhone) {
      call.href = `tel:${rawPhone}`;
    } else {
      call.setAttribute('aria-disabled', 'true');
    }

    whatsapp.replaceWith(actions);
    actions.append(whatsapp, call);
  }

  function enhanceDialog() {
    const whatsapp = document.getElementById('retention-whatsapp');
    if (!whatsapp) return;
    whatsapp.innerHTML = whatsappIcon;
    whatsapp.setAttribute('aria-label', 'שליחת הודעה ב-WhatsApp');
    whatsapp.setAttribute('title', 'WhatsApp');
    whatsapp.classList.add('retention-icon-action', 'retention-whatsapp-action');

    let call = document.getElementById('retention-call');
    if (!call) {
      call = document.createElement('a');
      call.id = 'retention-call';
      call.className = 'retention-icon-action retention-call-action';
      call.innerHTML = phoneIcon;
      call.setAttribute('aria-label', 'חיוג ללקוחה');
      call.setAttribute('title', 'חיוג');
      whatsapp.insertAdjacentElement('afterend', call);
    }

    const syncCall = () => {
      const rawPhone = phoneFromWhatsAppHref(whatsapp.href);
      if (whatsapp.style.display === 'none' || !rawPhone) {
        call.removeAttribute('href');
        call.setAttribute('aria-disabled', 'true');
        call.style.display = whatsapp.style.display;
      } else {
        call.href = `tel:${rawPhone}`;
        call.removeAttribute('aria-disabled');
        call.style.display = 'inline-flex';
      }
    };

    new MutationObserver(syncCall).observe(whatsapp, { attributes: true, attributeFilter: ['href', 'style'] });
    syncCall();
  }

  function scan() {
    document.querySelectorAll('.retention-row').forEach(enhanceRow);
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
    const panel = document.getElementById('panel-retention');
    if (!panel) return;
    new MutationObserver(queueScan).observe(panel, { childList: true, subtree: true });
    scan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();