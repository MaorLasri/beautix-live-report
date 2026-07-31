(() => {
  if (window.__beautixLanguageV2) return;
  window.__beautixLanguageV2 = true;

  const KEY = 'beautix-language';
  let lang = localStorage.getItem(KEY) === 'en' ? 'en' : 'he';
  let applying = false;

  const dict = {
    'דשבורד':'Dashboard','ניתוחים מפורטים':'Detailed Analytics','שיווק והמרה':'Marketing & Conversion',
    'רענון':'Refresh','כניסה':'Sign in','יציאה':'Log out','התנתקות':'Log out','אימייל':'Email','סיסמה':'Password',
    'טוען נתונים...':'Loading data...','בודק הרשאת כניסה...':'Checking access...',
    'סקירה ניהולית':'Management Overview','מכירות':'Sales','מכירות החודש':'Sales This Month','יעד מכירות חודשי':'Monthly Sales Target','יעד חודשי':'Monthly Target',
    'קצב מכירות יומי':'Daily Sales Pace','תחזית סוף חודש':'Month-End Forecast','פער מהיעד':'Gap to Target','התקדמות ליעד':'Target Progress',
    'עו״ש עסקי':'Business Checking','זיכויים עתידיים':'Future Credits','מסים':'Taxes','מע״מ עסקאות מדויק':'Exact Output VAT','מע״מ תשומות משוער':'Estimated Input VAT','מע״מ לאחר קיזוז':'VAT After Deductions','רזרבת מס כוללת':'Total Tax Reserve',
    'תחזית 30 יום':'30-Day Forecast','30 הימים הבאים':'Next 30 Days','פתח הכל':'Expand All','הרחב הכל':'Expand All','סגור הכל':'Collapse All','כווץ הכל':'Collapse All',
    'הכנסות צפויות':'Expected Income','הוצאות צפויות':'Expected Expenses','נטו צפוי':'Expected Net','תזרים נטו':'Net Cash Flow','יתרה חזויה בסוף התקופה':'Forecast Ending Balance','יום שפל חזוי':'Forecast Low Day','היום עם ההוצאה הגבוהה ביותר':'Largest Expense Day','כיסוי התחייבויות':'Coverage',
    'הכנסות':'Income','הוצאות':'Expenses','אין תנועות':'No Transactions','תנועות':'Transactions','תנועה':'Transaction',
    'הוספת תנועה':'Add Transaction','הוספת תנועה חדשה':'Add New Transaction','עדכון תנועה':'Update Transaction','תאריך':'Date','סוג':'Type','הכנסה':'Income','הוצאה':'Expense','סכום':'Amount','תיאור':'Description','הערה':'Note','שמירה':'Save','סטטוס':'Status',
    'מתוכנן':'Planned','בוצע':'Completed','נדחה':'Deferred','באיחור':'Overdue','בוטל':'Cancelled','פעולות':'Actions','סמן בוצע':'Mark Completed','שכפול':'Duplicate','תנועה חוזרת':'Recurring Transaction','העבר תאריך':'Move Date','דחה למחר':'Defer to Tomorrow','צור תזכורת':'Create Reminder','בטל':'Cancel','עריכה מלאה':'Full Edit','אישור':'Confirm','ביטול':'Cancel','תדירות':'Frequency','יומית':'Daily','שבועית':'Weekly','חודשית':'Monthly','מספר מופעים':'Occurrences','תאריך יעד':'Target Date','מועד תזכורת':'Reminder Time',
    'הזדמנויות מכירה':'Sales Opportunities','חובות לקוחות':'Customer Debts','לקוחות עם פוטנציאל חזרה':'Customers with Return Potential','מוצרים / טיפולים מובילים':'Top Products / Treatments',
    'משפך שיווקי':'Marketing Funnel','לידים':'Leads','קמפיינים':'Campaigns','קמפיין':'Campaign','לקוחות':'Customers','משלמים':'Paying Customers','חוב':'Debt','טלפון':'Phone','ביקורים':'Visits','לקוח':'Customer','שם לקוח':'Customer Name','שם ליד':'Lead Name','תאריך ליד':'Lead Date','פגישה עתידית':'Future Appointment','אין נתונים':'No Data','רשומות':'Records','חיוג':'Call','פרטים':'Details','עדכון ליד':'Update Lead','נקבע תור חדש':'Appointment Set','נוצר קשר':'Contacted','אין מענה':'No Answer','לא רלוונטי':'Not Relevant','אבוד':'Lost','חדש':'New',
    'WhatsApp':'WhatsApp','פתיחה ב-WhatsApp':'Open in WhatsApp','העתקה':'Copy','הודעה מוכנה':'Prepared Message','חם ואישי':'Warm & Personal','קצר וישיר':'Short & Direct','רשמי':'Formal',
    'מאזן':'Balance Sheet','הלוואות ונכסים':'Loans & Assets','בריאות עסקית':'Business Health','הוצאות חודשיות':'Monthly Expenses','יעד':'Target'
  };

  const originals = new WeakMap();
  const attrs = new WeakMap();

  function translateValue(value) {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return value;
    if (dict[trimmed]) return dict[trimmed];
    return trimmed
      .replace(/^(\d+) תנועות$/, '$1 transactions')
      .replace(/^(\d+) תנועה$/, '$1 transaction')
      .replace(/^(\d+) רשומות$/, '$1 records');
  }

  function translateNode(node) {
    const parent = node.parentElement;
    if (!parent || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','INPUT','OPTION'].includes(parent.tagName)) return;
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    const source = originals.get(node);
    if (lang === 'he') node.nodeValue = source;
    else {
      const lead = source.match(/^\s*/)?.[0] || '';
      const trail = source.match(/\s*$/)?.[0] || '';
      node.nodeValue = lead + translateValue(source) + trail;
    }
  }

  function translateAttrs(el) {
    const names = ['placeholder','title','aria-label'];
    let saved = attrs.get(el);
    if (!saved) { saved = {}; attrs.set(el, saved); }
    for (const name of names) {
      if (!el.hasAttribute(name)) continue;
      if (!(name in saved)) saved[name] = el.getAttribute(name);
      el.setAttribute(name, lang === 'he' ? saved[name] : translateValue(saved[name]));
    }
  }

  function apply(root = document.body) {
    if (!root || applying) return;
    applying = true;
    try {
      if (root.nodeType === Node.TEXT_NODE) translateNode(root);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) translateNode(node);
      if (root.nodeType === Node.ELEMENT_NODE) translateAttrs(root);
      root.querySelectorAll?.('*').forEach(translateAttrs);
    } finally {
      applying = false;
    }
  }

  function setLanguage(next) {
    lang = next === 'en' ? 'en' : 'he';
    localStorage.setItem(KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    const select = document.getElementById('beautix-language-select-v2');
    if (select) select.value = lang;
    apply(document.body);
    window.dispatchEvent(new CustomEvent('beautix:language-changed', { detail: { language: lang } }));
  }

  function addControl() {
    if (document.getElementById('beautix-language-select-v2')) return;
    const host = document.querySelector('.nav-utilities') || document.querySelector('.topbar .actions') || document.querySelector('.site-header') || document.body;
    const wrap = document.createElement('label');
    wrap.className = 'beautix-language-control-v2';
    wrap.innerHTML = '<span aria-hidden="true">🌐</span><select id="beautix-language-select-v2" aria-label="שפה"><option value="he">עברית</option><option value="en">English</option></select>';
    host.prepend(wrap);
    const select = wrap.querySelector('select');
    select.value = lang;
    select.addEventListener('change', () => setLanguage(select.value));

    if (!document.getElementById('beautix-language-style-v2')) {
      const style = document.createElement('style');
      style.id = 'beautix-language-style-v2';
      style.textContent = '.beautix-language-control-v2{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 10px;border:1px solid rgba(111,66,168,.25);border-radius:12px;background:#fff;color:#4e2e6d;font-weight:800;white-space:nowrap}.beautix-language-control-v2 select{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;outline:none;max-width:95px}html[dir="ltr"] body{text-align:left}html[dir="ltr"] .cashflow-dialog,html[dir="ltr"] .lead-action-dialog,html[dir="ltr"] .profile-editor{text-align:left}@media(max-width:720px){.beautix-language-control-v2{padding:0 7px}.beautix-language-control-v2 span{display:none}.beautix-language-control-v2 select{max-width:78px;font-size:.82rem}}';
      document.head.appendChild(style);
    }
  }

  function init() {
    addControl();
    setLanguage(lang);
    const observer = new MutationObserver(mutations => {
      if (applying) return;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) apply(node);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('beautix:report-loaded', () => apply(document.body));
  }

  window.BEAUTIX_I18N = { setLanguage, getLanguage: () => lang, apply };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
