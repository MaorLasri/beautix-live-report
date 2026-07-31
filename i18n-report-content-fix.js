(() => {
  if (window.__beautixReportContentI18nFix) return;
  window.__beautixReportContentI18nFix = true;

  const MONTHS = {
    'ינו׳':'Jan','ינואר':'January','פבר׳':'Feb','פברואר':'February','מרץ':'March','אפר׳':'Apr','אפריל':'April',
    'מאי':'May','יוני':'Jun','יולי':'Jul','אוג׳':'Aug','אוגוסט':'August','ספט׳':'Sep','ספטמבר':'September',
    'אוק׳':'Oct','אוקטובר':'October','נוב׳':'Nov','נובמבר':'November','דצמ׳':'Dec','דצמבר':'December'
  };

  const PHRASES = [
    ['היתרה החזויה בסוף התקופה היא','The forecast ending balance is'],
    ['כיסוי של','Coverage of'],
    ['בלבד','only'],
    ['יתרת פתיחה','Opening balance'],
    ['קצב יומי','Daily pace'],
    ['חסרים','Missing'],
    ['נותרו ליעד','remaining to target'],
    ['פחות מע״מ עסקאות','less output VAT'],
    ['ופחות מס הכנסה','and less income tax'],
    ['ריבית נוכחית','Current interest rate'],
    ['ריבית משתנה','Variable interest'],
    ['ללא תאריך','No date'],
    ['דורש התאמה ברמת חשבונית','Requires invoice-level reconciliation'],
    ['מספר היסטורי שונה ממכירות','Historical figure differs from sales'],
    ['החלוקה מבוססת על','The distribution is based on'],
    ['אינו מחזור חדש','is not new revenue'],
    ['לפי','according to'],
    ['לא תואם ל־','Does not match '],
    ['שנשמר ב־','stored in '],
    ['מוצר','Product'],
    ['יחידות','Units'],
    ['עלות חסרה','Missing cost'],
    ['תשלומים שנותרו','Payments remaining'],
    ['טיפולים שנותרו','Treatments remaining'],
    ['טיפולים עדיין לא נוצלו','Treatments still unused'],
    ['חוב פתוח','Open debt'],
    ['עודכן','Updated']
  ];

  const SKIP = '[data-i18n-ignore],[data-user-content],[data-customer-data],.customer-name,.lead-name,.campaign-name,.transaction-description,.transaction-note,.loan-name,.contact-name,.whatsapp-message-text,input,textarea';
  const hasHebrew = s => /[\u0590-\u05FF]/.test(s || '');
  const isEnglish = () => (window.BEAUTIX_I18N?.getLanguage?.() || localStorage.getItem('beautix-language')) === 'en';

  function translateDateLike(text) {
    let out = text;
    for (const [he,en] of Object.entries(MONTHS)) {
      out = out.replace(new RegExp(`(^|\\s)${he}(?=\\s|$|[.,])`,'g'), `$1${en}`);
    }
    return out;
  }

  function translateResidual(text) {
    if (!isEnglish() || !hasHebrew(text)) return text;
    let out = translateDateLike(text);
    for (const [he,en] of PHRASES) out = out.split(he).join(en);
    out = out
      .replace(/([\d,.]+)\s*₪\s*לTarget/g, '₪$1 to target')
      .replace(/Targetו/g, 'Target and')
      .replace(/([\d,.]+)%\s*מהלידים/g, '$1% of leads')
      .replace(/([\d,.]+)%\s*מהתקבולים/g, '$1% of receipts')
      .replace(/(\d+(?:\.\d+)?)\s*ימים/g, '$1 days')
      .replace(/(\d+)\s*רשומות/g, '$1 records')
      .replace(/(\d+)\s*תנועות/g, '$1 transactions')
      .replace(/(\d+)\s*עסקאות/g, '$1 transactions');
    return out;
  }

  function process(root=document.body) {
    if (!root || !isEnglish()) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const el = node.parentElement;
      if (!el || el.closest(SKIP) || ['SCRIPT','STYLE','NOSCRIPT','CODE','PRE'].includes(el.tagName)) continue;
      const next = translateResidual(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    }
  }

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; process(document.body); });
  };

  const observer = new MutationObserver(mutations => {
    if (!isEnglish()) return;
    if (mutations.some(m => m.addedNodes?.length)) queue();
  });

  function init() {
    process(document.body);
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('beautix:language-changed', queue);
    ['beautix:report-loaded','beautix:marketing-loaded','beautix:cashflow-updated','beautix:opportunities-loaded'].forEach(e => window.addEventListener(e, queue));
    setTimeout(queue, 500);
    setTimeout(queue, 1600);
  }

  window.BEAUTIX_REPORT_I18N_FIX = { refresh: queue, translate: translateResidual };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
