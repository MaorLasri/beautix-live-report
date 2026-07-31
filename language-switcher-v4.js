(() => {
  if (window.__beautixI18nV4) return;
  window.__beautixI18nV4 = true;

  const STORAGE_KEY = 'beautix-language';
  const maps = window.BEAUTIX_TRANSLATIONS || {};
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  let language = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'he';
  let pending = false;
  let applying = false;

  const flatten = lang => Object.entries(maps[lang] || {}).reduce((out,[section,value]) => {
    if (section !== 'meta' && value && typeof value === 'object') Object.assign(out,value);
    return out;
  },{});
  const dict = flatten('en');
  const keys = Object.keys(dict).sort((a,b) => b.length-a.length);

  const userSelectors = [
    '[data-i18n-ignore]','[data-user-content]','[data-customer-data]',
    '.customer-name','.lead-name','.campaign-name','.transaction-description',
    '.transaction-note','.loan-name','.contact-name','.whatsapp-message-text',
    'input[type="text"]','input[type="email"]','input[type="tel"]','textarea'
  ].join(',');

  const shouldSkip = el => !el || ['SCRIPT','STYLE','NOSCRIPT','CODE','PRE'].includes(el.tagName) || !!el.closest(userSelectors);
  const hasHebrew = text => /[\u0590-\u05FF]/.test(text);

  function exactOrPattern(text) {
    const clean = text.trim();
    if (!clean) return text;
    if (dict[clean]) return dict[clean];
    const rules = [
      [/^(\d+) תנועות$/, '$1 transactions'],[/^(\d+) תנועה$/, '$1 transaction'],
      [/^(\d+) עסקאות$/, '$1 transactions'],[/^(\d+) עסקה$/, '$1 transaction'],
      [/^(\d+) רשומות$/, '$1 records'],[/^(\d+) רשומה$/, '$1 record'],
      [/^(\d+) לקוחות$/, '$1 customers'],[/^(\d+) לידים$/, '$1 leads'],
      [/^(\d+) ביקורים$/, '$1 visits'],[/^(\d+(?:\.\d+)?) ימים$/, '$1 days'],
      [/^שבוע (\d+)$/, 'Week $1'],[/^נותרו ([\d,.]+) ₪ ליעד$/, '₪$1 remaining to target'],
      [/^חסרים ([\d,.]+) ₪ ליעד$/, '₪$1 missing from target'],
      [/^מתחת ליעד ב[־-]?([\d,.]+) ₪$/, '₪$1 below target'],
      [/^פער של ₪?([\d,.]+) מול (.+)$/, 'Gap of ₪$1 versus $2'],
      [/^יתרה חזויה:\s*([\d,.-]+)\s*₪$/, 'Forecast balance: ₪$1'],
      [/^הוצאה צפויה:\s*([\d,.-]+)\s*₪$/, 'Expected expense: ₪$1'],
      [/^הכנסה צפויה:\s*([\d,.-]+)\s*₪$/, 'Expected income: ₪$1'],
      [/^מתוך יעד של ([\d,.]+) ₪$/, 'of ₪$1 target'],
      [/^([\d.]+)% מהיעד הפעיל$/, '$1% of active target'],
      [/^([\d.]+)% מהתקבולים$/, '$1% of receipts'],
      [/^נפרע ([\d.]+)%$/, '$1% repaid'],
      [/^([\d,.-]+) ₪ נותר$/, '₪$1 remaining'],
      [/^([\d,.-]+) ₪ נפרע$/, '₪$1 repaid'],
      [/^(\d+) תשלומים שנותרו$/, '$1 payments remaining'],
      [/^נשבר ב[־-]?(.*)$/, 'Reached on $1'],
      [/^עודכן(?: מהמסד)?:?\s*(.*)$/, 'Updated: $1']
    ];
    for (const [r,repl] of rules) if (r.test(clean)) return clean.replace(r,repl);
    return null;
  }

  function translateMixed(text) {
    if (language === 'he' || !hasHebrew(text)) return text;
    const exact = exactOrPattern(text);
    if (exact !== null) return exact;
    let out = text;
    for (const key of keys) {
      if (!out.includes(key)) continue;
      out = out.split(key).join(dict[key]);
    }
    return out;
  }

  function translateNode(node) {
    const parent = node.parentElement;
    if (shouldSkip(parent)) return;
    const current = node.nodeValue;
    if (!current || !current.trim()) return;
    if (!originalText.has(node)) originalText.set(node,current);
    const source = originalText.get(node);
    const next = language === 'he' ? source : translateMixed(source);
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateElement(el) {
    if (shouldSkip(el)) return;
    const attrs = ['placeholder','title','aria-label','data-label'];
    let saved = originalAttrs.get(el);
    if (!saved) { saved={}; originalAttrs.set(el,saved); }
    for (const attr of attrs) {
      if (!el.hasAttribute(attr)) continue;
      if (!(attr in saved)) saved[attr]=el.getAttribute(attr);
      const source=saved[attr];
      const next=language==='he'?source:translateMixed(source);
      if (el.getAttribute(attr)!==next) el.setAttribute(attr,next);
    }
    if (el.tagName === 'OPTION') {
      if (!originalText.has(el)) originalText.set(el,el.textContent);
      const source=originalText.get(el);
      const next=language==='he'?source:translateMixed(source);
      if (el.textContent!==next) el.textContent=next;
    }
  }

  function apply(root=document.body) {
    if (!root || applying) return;
    applying=true;
    try {
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node; while((node=walker.nextNode())) translateNode(node);
      if (root.nodeType===Node.ELEMENT_NODE) translateElement(root);
      root.querySelectorAll?.('*').forEach(translateElement);
    } finally { applying=false; }
  }

  function scheduleApply() {
    if (pending) return;
    pending=true;
    requestAnimationFrame(() => { pending=false; apply(document.body); });
  }

  function ensureControl() {
    let select=document.getElementById('beautix-language-select');
    if (select) return select;
    const host=document.querySelector('.nav-utilities')||document.querySelector('.topbar .actions')||document.querySelector('header')||document.body;
    const wrap=document.createElement('label');
    wrap.className='beautix-language-control';
    wrap.innerHTML='<span aria-hidden="true">🌐</span><select id="beautix-language-select" aria-label="שפה"><option value="he">עברית</option><option value="en">English</option></select>';
    host.prepend(wrap);
    if (!document.getElementById('beautix-language-style-v4')) {
      const style=document.createElement('style'); style.id='beautix-language-style-v4';
      style.textContent='.beautix-language-control{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 10px;border:1px solid rgba(111,66,168,.24);border-radius:12px;background:#fff;color:#4e2e6d;font-weight:800}.beautix-language-control select{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;outline:none;cursor:pointer}html[dir="ltr"] body{text-align:left}html[dir="ltr"] .site-content,html[dir="ltr"] .cashflow-dialog,html[dir="ltr"] .lead-action-dialog,html[dir="ltr"] .profile-editor{text-align:left}html[dir="ltr"] .cashflow-close,html[dir="ltr"] .modal-close{left:auto;right:12px}@media(max-width:720px){.beautix-language-control{padding:0 7px}.beautix-language-control select{max-width:90px}}';
      document.head.appendChild(style);
    }
    select=wrap.querySelector('select');
    select.addEventListener('change',()=>setLanguage(select.value));
    return select;
  }

  function setLanguage(next) {
    language=next==='en'?'en':'he';
    localStorage.setItem(STORAGE_KEY,language);
    document.documentElement.lang=language;
    document.documentElement.dir=maps[language]?.meta?.dir||(language==='he'?'rtl':'ltr');
    const select=ensureControl(); select.value=language;
    apply(document.body);
    window.dispatchEvent(new CustomEvent('beautix:language-changed',{detail:{language}}));
  }

  const observer=new MutationObserver(mutations=>{
    if (applying) return;
    if (mutations.some(m=>m.type==='childList'&&m.addedNodes.length)) scheduleApply();
  });

  function init() {
    ensureControl();
    setLanguage(language);
    observer.observe(document.body,{childList:true,subtree:true});
    ['beautix:report-loaded','beautix:cashflow-updated','beautix:marketing-loaded','beautix:opportunities-loaded'].forEach(name=>window.addEventListener(name,scheduleApply));
    setTimeout(scheduleApply,300); setTimeout(scheduleApply,1200);
  }

  window.BEAUTIX_I18N={setLanguage,getLanguage:()=>language,translate:translateMixed,refresh:scheduleApply,map:maps};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
