(() => {
  if (window.__beautixWhatsappMessagesV2Loaded) return;
  window.__beautixWhatsappMessagesV2Loaded = true;

  const cleanPhone = value => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `972${digits.slice(1)}`;
    if (!digits.startsWith('972') && digits.length === 9) digits = `972${digits}`;
    return /^9725\d{8}$/.test(digits) ? digits : '';
  };
  const firstName = value => String(value || '').trim().split(/\s+/)[0] || 'יקרה';
  const phonePattern = /(?:\+?972[-\s]?5\d|05\d)(?:[-\s]?\d){7}/;

  function contextFor(element) {
    if (element.closest('#debtors-table') || /חוב|יתרה שלילית/.test(element.closest('section')?.textContent || '')) return 'debt';
    if (element.closest('#never-visited-table') || /ליד|טרם ביקר/.test(element.closest('section')?.textContent || '')) return 'lead';
    if (element.closest('[data-opportunity-row], .opportunity-row, #return-opportunities-list') || /פוטנציאל חזרה/.test(element.closest('section,article,div')?.textContent || '')) return 'return';
    return 'general';
  }

  function rowName(element) {
    const row = element.closest('tr, li, article, .mobile-customer-card, .customer-card, .opportunity-item') || element.parentElement;
    const candidates = [
      row?.querySelector('[data-customer-name]')?.textContent,
      row?.querySelector('.customer-name, .lead-name, .opportunity-name')?.textContent,
      row?.querySelector('strong')?.textContent,
      row?.querySelector('td')?.textContent
    ];
    return candidates.find(Boolean)?.trim() || 'לקוחה';
  }

  function amountFromRow(element) {
    const row = element.closest('tr, li, article, .mobile-customer-card, .customer-card, .opportunity-item') || element.parentElement;
    const match = (row?.textContent || '').match(/(?:₪|ש״ח|שח)\s*([\d,.]+)|([\d,.]+)\s*(?:₪|ש״ח|שח)/);
    return match ? (match[1] || match[2]) : '';
  }

  function draftMessage(context, name, element, tone = 'warm') {
    const n = firstName(name);
    const amount = amountFromRow(element);
    const openings = { warm: `היי ${n} ❤️`, concise: `היי ${n},`, formal: `שלום ${n},` };
    const closing = tone === 'formal' ? 'תודה, BeautiX' : 'אשמח לעזור ולתאם לך 💗';
    if (context === 'debt') {
      const debt = amount ? ` בסך ${amount} ₪` : '';
      return `${openings[tone]}\nרציתי להזכיר שנותרה יתרה פתוחה${debt}. אפשר להסדיר אותה בנוחות, ואם כבר שילמת אפשר להתעלם מההודעה ולעדכן אותי.\nתודה רבה 🙏`;
    }
    if (context === 'lead') return `${openings[tone]}\nראיתי שהתעניינת ב־BeautiX ורציתי לבדוק איך אפשר לעזור לך. אפשר לשאול אותי כאן כל שאלה, ואם מתאים לך נוכל גם למצוא מועד נוח לתור.\n${closing}`;
    if (context === 'return') return `${openings[tone]}\nעבר זמן מאז הביקור האחרון שלך ורציתי לשאול מה שלומך 😊\nאשמח להזמין אותך לחזור לטיפול ולהתאים לך מועד נוח.\n${closing}`;
    return `${openings[tone]}\nרציתי ליצור איתך קשר מ־BeautiX. איך אפשר לעזור לך היום?\n${closing}`;
  }

  function ensureModal() {
    if (document.getElementById('whatsapp-message-modal')) return;
    const style = document.createElement('style');
    style.id = 'whatsapp-message-style-v2';
    style.textContent = `
      html,body{max-width:100%;overflow-x:hidden}
      #app-view,#report-view,main,.dashboard-section,.card,.table-wrap{max-width:100%;min-width:0;box-sizing:border-box}
      .table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
      .whatsapp-inline-wrap{display:inline-flex;align-items:center;gap:6px;max-width:100%;flex-wrap:wrap}
      .whatsapp-message-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;max-width:100%;min-height:36px;padding:7px 11px;border:0;border-radius:11px;background:#25D366;color:#fff;font:inherit;font-weight:800;text-decoration:none;cursor:pointer;white-space:nowrap;box-sizing:border-box}
      .whatsapp-message-button::before{content:'◉';font-size:.9em}.whatsapp-message-button.compact{min-width:42px;padding:7px 9px;font-size:0}.whatsapp-message-button.compact::before{font-size:1rem}
      .whatsapp-message-backdrop{position:fixed;inset:0;z-index:1800;display:grid;place-items:center;padding:16px;background:rgba(20,18,30,.55);backdrop-filter:blur(5px)}.whatsapp-message-backdrop[hidden]{display:none}
      .whatsapp-message-dialog{position:relative;width:min(560px,100%);max-width:100%;max-height:calc(100dvh - 24px);overflow:auto;padding:24px;border-radius:22px;background:#fff;box-shadow:0 24px 80px rgba(30,20,50,.3);direction:rtl;box-sizing:border-box}
      .whatsapp-message-dialog h2{margin:0 0 6px;color:#4e2d70}.whatsapp-message-dialog p{margin:0 0 14px;color:#6f7a8b}.whatsapp-message-close{position:absolute;top:10px;left:12px;border:0;background:transparent;font-size:1.7rem;color:#7d8795}
      .whatsapp-tone-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.whatsapp-tone-row button{padding:7px 11px;border:1px solid #d9deea;border-radius:999px;background:#fff;color:#526074;font-weight:700}.whatsapp-tone-row button.active{background:#f2e9fa;border-color:#8e4ab5;color:#642b86}
      .whatsapp-message-dialog textarea{width:100%;min-height:190px;box-sizing:border-box;padding:14px;border:1px solid #d7ddea;border-radius:14px;font:inherit;line-height:1.55;resize:vertical}
      .whatsapp-message-actions{display:flex;gap:10px;margin-top:14px}.whatsapp-message-actions button,.whatsapp-message-actions a{flex:1;display:flex;align-items:center;justify-content:center;min-height:44px;border:0;border-radius:12px;font-weight:800;text-decoration:none;cursor:pointer}.whatsapp-copy{background:#f0e8f8;color:#642b86}.whatsapp-open{background:#25D366;color:#fff}
      @media(max-width:620px){
        .whatsapp-message-dialog{padding:22px 16px}.whatsapp-message-actions{flex-direction:column}
        .whatsapp-message-button{min-width:40px;width:40px;padding:7px;font-size:0;flex:0 0 40px}
        .whatsapp-message-button::before{content:'WA';font-size:.72rem}
        tr,td,th,article,.mobile-customer-card,.customer-card,.opportunity-item{min-width:0;max-width:100%}
      }
    `;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', `<div id="whatsapp-message-modal" class="whatsapp-message-backdrop" hidden><section class="whatsapp-message-dialog" role="dialog" aria-modal="true"><button id="whatsapp-message-close" class="whatsapp-message-close" type="button" aria-label="סגירה">×</button><h2>הודעת WhatsApp מוכנה</h2><p id="whatsapp-message-recipient">—</p><div class="whatsapp-tone-row"><button type="button" data-wa-tone="warm" class="active">חם ואישי</button><button type="button" data-wa-tone="concise">קצר וישיר</button><button type="button" data-wa-tone="formal">רשמי</button></div><textarea id="whatsapp-message-text"></textarea><div class="whatsapp-message-actions"><button id="whatsapp-copy-message" class="whatsapp-copy" type="button">העתקת הודעה</button><a id="whatsapp-open-message" class="whatsapp-open" target="_blank" rel="noopener">פתיחה ב־WhatsApp</a></div></section></div>`);
    const modal = document.getElementById('whatsapp-message-modal');
    const close = () => { modal.hidden = true; };
    document.getElementById('whatsapp-message-close').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.getElementById('whatsapp-copy-message').addEventListener('click', async event => {
      await navigator.clipboard.writeText(document.getElementById('whatsapp-message-text').value);
      const button = event.currentTarget;
      const old = button.textContent;
      button.textContent = 'הועתק ✓';
      setTimeout(() => { button.textContent = old; }, 1200);
    });
  }

  let active = null;
  function updateDraft(tone) {
    if (!active) return;
    document.querySelectorAll('[data-wa-tone]').forEach(button => button.classList.toggle('active', button.dataset.waTone === tone));
    const text = draftMessage(active.context, active.name, active.element, tone);
    document.getElementById('whatsapp-message-text').value = text;
    document.getElementById('whatsapp-open-message').href = `https://wa.me/${active.phone}?text=${encodeURIComponent(text)}`;
  }

  function openComposer(element, phone) {
    ensureModal();
    active = { element, phone, context: contextFor(element), name: rowName(element) };
    document.getElementById('whatsapp-message-recipient').textContent = `${active.name} · הודעה מותאמת לסיטואציה`;
    document.getElementById('whatsapp-message-modal').hidden = false;
    document.querySelectorAll('[data-wa-tone]').forEach(button => { button.onclick = () => updateDraft(button.dataset.waTone); });
    updateDraft('warm');
    document.getElementById('whatsapp-message-text').oninput = event => {
      document.getElementById('whatsapp-open-message').href = `https://wa.me/${active.phone}?text=${encodeURIComponent(event.target.value)}`;
    };
  }

  function addButton(anchor, phone) {
    if (!phone || anchor.dataset.beautixWhatsappEnhanced === 'true') return;
    anchor.dataset.beautixWhatsappEnhanced = 'true';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'whatsapp-message-button';
    button.textContent = 'WhatsApp';
    button.addEventListener('click', event => { event.preventDefault(); openComposer(anchor, phone); });

    if (anchor.matches('td,th')) {
      let wrap = anchor.querySelector(':scope > .whatsapp-inline-wrap');
      if (!wrap) {
        wrap = document.createElement('span');
        wrap.className = 'whatsapp-inline-wrap';
        while (anchor.firstChild) wrap.appendChild(anchor.firstChild);
        anchor.appendChild(wrap);
      }
      wrap.appendChild(button);
    } else {
      anchor.insertAdjacentElement('afterend', button);
    }
  }

  function enhance() {
    ensureModal();
    document.querySelectorAll('a[href^="tel:"]').forEach(link => addButton(link, cleanPhone(link.getAttribute('href').slice(4))));

    document.querySelectorAll('tr, li, article, .mobile-customer-card, .customer-card, .opportunity-item').forEach(row => {
      if (row.dataset.beautixWhatsappScanned === 'true') return;
      row.dataset.beautixWhatsappScanned = 'true';
      const match = (row.textContent || '').match(phonePattern);
      const phone = cleanPhone(match?.[0]);
      if (!phone) return;
      const phoneElement = Array.from(row.querySelectorAll('td, span, div, p, a')).find(el => phonePattern.test(el.textContent || '')) || row;
      addButton(phoneElement, phone);
    });
  }

  let scheduled = false;
  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleEnhance, { once: true });
  else scheduleEnhance();
  window.addEventListener('beautix:report-loaded', scheduleEnhance);
})();