(() => {
  const STORAGE_KEY = 'beautix-language';
  const textOriginal = new WeakMap();
  const attrOriginal = new WeakMap();
  let language = localStorage.getItem(STORAGE_KEY) || 'he';
  let applying = false;

  const dictionary = {
    'דשבורד':'Dashboard','ניתוחים מפורטים':'Detailed Analytics','שיווק והמרה':'Marketing & Conversion','TEST':'TEST',
    'רענון':'Refresh','תפריט משתמש':'User menu','עריכת פרופיל':'Edit profile','שינוי סיסמה':'Change password','רענון התחברות':'Refresh session','התנתקות':'Log out',
    'כניסה למערכת BeautiX':'Sign in to BeautiX','יש להתחבר לפני הצגת נתוני העסק.':'Please sign in to view business data.','אימייל':'Email','סיסמה':'Password','הצג סיסמה':'Show password','שכחתי סיסמה':'Forgot password','זכור אותי במכשיר הזה':'Remember me on this device','כניסה':'Sign in','איפוס סיסמה':'Reset password','נשלח קישור מאובטח לכתובת האימייל שלך.':'A secure link will be sent to your email.','שליחת קישור איפוס':'Send reset link','חזרה לכניסה':'Back to sign in','בחירת סיסמה חדשה':'Choose a new password','הזן סיסמה חדשה לחשבון שלך.':'Enter a new password for your account.','סיסמה חדשה':'New password','אימות סיסמה':'Confirm password','עדכון סיסמה':'Update password',
    'סקירה ניהולית':'Management Overview','תמונת מצב מיידית':'Immediate Snapshot','מדדים מרכזיים, תובנה מובילה ויעדי בריאות עסקית':'Key metrics, leading insight and business health targets','ציון בריאות עסקית':'Business Health Score','תובנה מרכזית':'Primary Insight','סיכון מרכזי':'Primary Risk','איך לשפר את הציון':'How to Improve the Score',
    'מכירות':'Sales','ביצועים, יעדים ותחזית':'Performance, Targets & Forecast','מצב המכירות החודשי, קצב ההתקדמות והיעד הפעיל':'Monthly sales status, pace and active target','מכירות החודש':'Sales This Month','יעד מכירות חודשי':'Monthly Sales Target','יעד פעיל':'Active target','קצב מכירות יומי':'Daily Sales Pace','תחזית סוף חודש':'Month-End Forecast','פער מהיעד':'Gap to Target','תקבולים מיידיים':'Immediate Receipts','נדרש לכל יום עבודה שנותר':'Required per Remaining Workday',
    'הזדמנויות מכירה':'Sales Opportunities','מוצרים, לקוחות ופוטנציאל':'Products, Customers & Potential','מוצג רק מידע שהמערכת תומכת בו בפועל':'Only data currently supported by the system is shown','חובות לקוחות':'Customer Debts','פוטנציאל גבייה מיידי לפי הנתון החודשי':'Immediate collection potential based on monthly data','מכירות שטרם הפכו לתקבול מיידי':'Sales Not Yet Collected','מוצרים / טיפולים מובילים':'Top Products / Treatments','אין נתון':'No data','נדרש חיבור פירוט עסקאות לפי מוצר או טיפול':'Transaction details by product or treatment must be connected','לקוחות עם פוטנציאל חזרה':'Customers with Return Potential','נדרש חיבור ביקורים והיסטוריית לקוחות':'Visit and customer history connection required',
    'הכנסה ורווחיות':'Income & Profitability','תחזית הכנסה, יתרות בנק ורווחיות':'Income Forecast, Bank Balances & Profitability','נזילות, גבייה, רזרבות ויעדי רווח':'Liquidity, collections, reserves and profit targets','עו״ש עסקי':'Business Checking','פיקדון עסקי':'Business Deposit','נכס חיובי, לא נכלל במזומן התפעולי':'Positive asset, excluded from operating cash','יתרות מט״ח':'Foreign Currency Balances','נכס עסקי נוסף':'Additional business asset','זיכויים עתידיים':'Future Credits','כל הזיכויים הצפויים במערכת':'All expected credits in the system','יעד עו״ש':'Checking Target','רווח גולמי לאחר מסים':'Gross Profit After Taxes','שיעור מהמכירות':'Share of sales','מכירות פחות מע״מ עסקאות ופחות מס הכנסה משוער':'Sales less output VAT and estimated income tax','סה״כ לשמור לכל המסים החודש':'Total Tax Reserve This Month','מע״מ לאחר קיזוז + מס הכנסה משוער':'VAT after deductions + estimated income tax',
    'בריאות עסקית':'Business Health','הוצאות, מסים ותובנות תזרים':'Expenses, Taxes & Cash-Flow Insights','מדדים שמסבירים את איכות הפעילות ולא רק את המחזור':'Metrics that explain operating quality, not only revenue','הוצאות חודשיות':'Monthly Expenses','יעד':'Target','מע״מ עסקאות מדויק':'Exact Output VAT','מע״מ תשומות משוער':'Estimated Input VAT','מע״מ לאחר קיזוז':'VAT After Deductions','מס הכנסה משוער':'Estimated Income Tax',
    'תזרים':'Cash Flow','תחזית 30 יום':'30-Day Forecast','תנועות צפויות לפי המידע הקיים במערכת':'Expected transactions based on current system data','פתח הכל':'Expand All','סגור הכל':'Collapse All','הכנסות צפויות':'Expected Income','הוצאות צפויות':'Expected Expenses','נטו צפוי':'Expected Net','יתרה חזויה בסוף התקופה':'Forecast Ending Balance','יום שפל חזוי':'Forecast Low Day','יום ההוצאה הגדול ביותר':'Largest Expense Day','כיסוי הכנסות מול הוצאות':'Income-to-Expense Coverage','הכנסות':'Income','הוצאות':'Expenses','אין תנועות':'No transactions','הוספת תנועה':'Add Transaction','הוספת תנועה חדשה':'Add New Transaction','עדכון תנועה':'Update Transaction','תאריך':'Date','סוג':'Type','הכנסה':'Income','הוצאה':'Expense','סכום':'Amount','תיאור':'Description','סטטוס':'Status','הערה':'Note','שמירה':'Save','מתוכנן':'Planned','בוצע':'Completed','נדחה':'Deferred','באיחור':'Overdue','בוטל':'Cancelled','פעולות':'Actions','סמן בוצע':'Mark Completed','שכפול':'Duplicate','תנועה חוזרת':'Recurring Transaction','העבר תאריך':'Move Date','דחה למחר':'Defer to Tomorrow','צור תזכורת':'Create Reminder','בטל':'Cancel','עריכה מלאה':'Full Edit','תדירות':'Frequency','יומית':'Daily','שבועית':'Weekly','חודשית':'Monthly','מספר מופעים':'Number of Occurrences','תאריך יעד':'Target Date','מועד תזכורת':'Reminder Time','אישור':'Confirm','ביטול':'Cancel','לבטל ולהסתיר את התנועה?':'Cancel and hide this transaction?',
    'מאזן':'Balance Sheet','הלוואות ונכסים':'Loans & Assets','התחייבויות ונכסים עסקיים לפי הנתונים הזמינים':'Business liabilities and assets based on available data','טוען נתונים...':'Loading data...','בודק הרשאת כניסה...':'Checking access permission...',
    'משפך שיווקי':'Marketing Funnel','מליד ללקוח משלם':'From Lead to Paying Customer','התאמה לפי מספר טלפון בין Meta, מאגר הלקוחות והיסטוריית המכירות.':'Phone-based matching between Meta, the customer database and sales history.','לידים':'Leads','עם מספר טלפון':'with phone number','לידים שנמצאו כלקוחות':'Leads Matched to Customers','מהלידים':'of leads','הגיעו לביקור':'Visited','הפכו ללקוחות משלמים':'Became Paying Customers','הכנסה מיוחסת ללידים':'Lead-Attributed Revenue','לפי לקוחות תואמים והיסטוריית המכירות':'Based on matched customers and sales history','נמצאו כלקוחות אך לא ביקרו':'Matched Customers Who Never Visited','קבוצה לבדיקה ממוקדת, לא הוכחה לביטול או No-show':'A group for focused review; not proof of cancellation or no-show',
    'לקוחות וגבייה':'Customers & Collections','חובות, ביקורים ופגישות עתידיות':'Debts, Visits & Future Appointments','לקוחות במאגר':'Customers in Database','לקוחות שמעולם לא ביקרו':'Customers Who Never Visited','לקוחות עם פגישה עתידית':'Customers with Future Appointment','לקוחות בחוב':'Customers in Debt','קמפיינים':'Campaigns','ביצועים לפי קמפיין':'Performance by Campaign','קמפיין':'Campaign','לקוחות':'Customers','משלמים':'Paying','חוב':'Debt','לקוחות עם יתרה שלילית':'Customers with Negative Balance','לקוח':'Customer','טלפון':'Phone','ביקורים':'Visits','מעקב מכירות':'Sales Follow-up','לידים שנמצאו כלקוחות אך מספר הביקורים שלהם אפס':'Leads Matched to Customers with Zero Visits','הנתון מסמן קבוצה לבדיקה; הוא אינו מוכיח ביטול או אי-הגעה.':'This identifies a group for review; it does not prove cancellation or no-show.','שם ליד':'Lead Name','שם לקוח':'Customer Name','תאריך ליד':'Lead Date','פגישה עתידית':'Future Appointment','אין נתונים':'No data','רשומות':'records','חיוג':'Call','אין טלפון':'No phone','פרטים':'Details','סגירת פרטים':'Close Details','עדכון ליד':'Update Lead','נקבע תור חדש':'New Appointment Set','הלקוחה כבר ביקרה':'Customer Already Visited','נוצר קשר':'Contacted','אין מענה':'No Answer','לא רלוונטי':'Not Relevant','אבוד':'Lost','החזרה לחדש':'Return to New','מועד התור':'Appointment Time','הערה אופציונלית':'Optional note','שמירת פעולה':'Save Action','הפעולה נשמרה בהצלחה':'Action saved successfully',
    'מגמה חודשית':'Monthly Trend','ביצועי לידים והמרה לפי חודש':'Monthly Lead & Conversion Performance','לידים והמרות לפי חודש יצירת הליד; הכנסות לפי חודש ביצוע העסקה בפועל.':'Leads and conversions by lead creation month; revenue by actual transaction month.','לידים לפי חודש':'Leads by Month','כמות לידים חדשים':'Number of new leads','שיעורי המרה':'Conversion Rates','ללקוח':'To Customer','למשלם':'To Paying','הכנסה מלקוחות שהגיעו מלידים':'Revenue from Lead-Sourced Customers','לפי חודש ביצוע העסקה':'By transaction month','זמן ממוצע להמרה':'Average Conversion Time','מתאריך הליד לעסקה הראשונה':'From lead date to first transaction',
    'פתיחה ב־WhatsApp':'Open in WhatsApp','העתקה':'Copy','הודעה מוכנה':'Prepared Message','יצירת הודעה':'Create Message','חם ואישי':'Warm & Personal','קצר וישיר':'Short & Direct','רשמי':'Formal','סגירה':'Close','שפה':'Language','עברית':'עברית','English':'English'
  };

  const exact = value => dictionary[value] || value;
  const translateDynamic = value => {
    if (!value) return value;
    if (dictionary[value]) return dictionary[value];
    return value
      .replace(/^(\d+) תנועות$/, '$1 transactions')
      .replace(/^(\d+) רשומות$/, '$1 records')
      .replace(/^סה״כ\s+/, 'Total ')
      .replace(/^(\d+(?:\.\d+)?)% מהלידים$/, '$1% of leads')
      .replace(/^(\d+) עם מספר טלפון$/, '$1 with phone number')
      .replace(/^(\d+(?:\.\d+)?) ימים$/, '$1 days');
  };

  function translateTextNode(node) {
    const current = node.nodeValue;
    if (!current || !current.trim()) return;
    if (!textOriginal.has(node)) textOriginal.set(node, current);
    const source = textOriginal.get(node);
    if (language === 'he') node.nodeValue = source;
    else {
      const leading = source.match(/^\s*/)?.[0] || '';
      const trailing = source.match(/\s*$/)?.[0] || '';
      node.nodeValue = leading + translateDynamic(source.trim()) + trailing;
    }
  }

  function translateAttributes(element) {
    const names = ['placeholder','title','aria-label'];
    let saved = attrOriginal.get(element);
    if (!saved) { saved = {}; attrOriginal.set(element, saved); }
    names.forEach(name => {
      if (!element.hasAttribute(name)) return;
      if (!(name in saved)) saved[name] = element.getAttribute(name);
      element.setAttribute(name, language === 'he' ? saved[name] : translateDynamic(saved[name]));
    });
  }

  function walk(root = document.body) {
    if (!root) return;
    applying = true;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (root.nodeType === 1) translateAttributes(root);
    root.querySelectorAll?.('*').forEach(translateAttributes);
    applying = false;
  }

  function ensureControl() {
    if (document.getElementById('beautix-language-select')) return;
    const host = document.querySelector('.nav-utilities') || document.querySelector('.site-sidebar') || document.body;
    const wrap = document.createElement('label');
    wrap.className = 'beautix-language-control';
    wrap.innerHTML = `<span class="beautix-language-icon" aria-hidden="true">🌐</span><select id="beautix-language-select" aria-label="שפה"><option value="he">עברית</option><option value="en">English</option></select>`;
    host.prepend(wrap);
    const style = document.createElement('style');
    style.id = 'beautix-language-style';
    style.textContent = `.beautix-language-control{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 10px;border:1px solid rgba(111,66,168,.24);border-radius:12px;background:#fff;color:#4e2e6d;font-weight:800}.beautix-language-control select{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;outline:none;cursor:pointer}.beautix-language-icon{font-size:1rem}html[dir="ltr"] body{text-align:left}html[dir="ltr"] .site-content,html[dir="ltr"] .cashflow-dialog,html[dir="ltr"] .lead-action-dialog,html[dir="ltr"] .profile-editor{text-align:left}html[dir="ltr"] .cashflow-close,html[dir="ltr"] .modal-close{left:auto;right:12px}@media(max-width:720px){.beautix-language-control{padding:0 7px}.beautix-language-control select{max-width:88px}}`;
    document.head.appendChild(style);
    const select = wrap.querySelector('select');
    select.value = language;
    select.addEventListener('change', () => setLanguage(select.value));
  }

  function setLanguage(next) {
    language = next === 'en' ? 'en' : 'he';
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    const select = document.getElementById('beautix-language-select');
    if (select) select.value = language;
    walk(document.body);
    window.dispatchEvent(new CustomEvent('beautix:language-changed', { detail: { language } }));
  }

  const observer = new MutationObserver(mutations => {
    if (applying) return;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
        else if (node.nodeType === Node.ELEMENT_NODE) walk(node);
      });
      if (mutation.type === 'characterData') translateTextNode(mutation.target);
    }
  });

  function init() {
    ensureControl();
    setLanguage(language);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  window.BEAUTIX_I18N = { setLanguage, getLanguage: () => language, translate: translateDynamic };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();