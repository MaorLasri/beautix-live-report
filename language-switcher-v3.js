(() => {
  if (window.__beautixI18nV3) return;
  window.__beautixI18nV3 = true;

  const STORAGE_KEY = 'beautix-language';
  const maps = window.BEAUTIX_TRANSLATIONS || {};
  const sourceText = new WeakMap();
  const sourceAttrs = new WeakMap();
  let language = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'he';
  let scheduled = false;

  const flatMap = lang => {
    const pack = maps[lang] || {};
    return Object.entries(pack).reduce((all, [key, value]) => {
      if (key !== 'meta' && value && typeof value === 'object') Object.assign(all, value);
      return all;
    }, {});
  };

  const english = flatMap('en');
  const skipElement = el => !el || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(el.tagName) || el.closest('[data-i18n-ignore],.customer-name,.lead-name,[data-customer-data],[data-user-content]');

  function dynamicTranslate(text) {
    if (language === 'he') return text;
    const clean = text.trim();
    if (!clean) return text;
    if (english[clean]) return english[clean];

    const rules = [
      [/^(\d+) תנועות$/, '$1 transactions'],
      [/^(\d+) תנועה$/, '$1 transaction'],
      [/^(\d+) עסקאות$/, '$1 transactions'],
      [/^(\d+) לקוחות$/, '$1 customers'],
      [/^(\d+) לידים$/, '$1 leads'],
      [/^(\d+) ביקורים$/, '$1 visits'],
      [/^(\d+) ימים$/, '$1 days'],
      [/^שבוע (\d+)$/, 'Week $1'],
      [/^נותרו ([\d,.]+) ₪ ליעד$/, '₪$1 remaining to target'],
      [/^מתחת ליעד ב-?([\d,.]+) ₪$/, '₪$1 below target'],
      [/^יתרה חזויה: ?([\d,.-]+) ₪$/, 'Forecast balance: ₪$1'],
      [/^הוצאה צפויה: ?([\d,.-]+) ₪$/, 'Expected expense: ₪$1'],
      [/^מתוך יעד של ([\d,.]+) ₪$/, 'of ₪$1 target'],
      [/^([\d.]+)% מהיעד הפעיל$/, '$1% of active target']
    ];
    for (const [pattern, replacement] of rules) if (pattern.test(clean)) return clean.replace(pattern, replacement);
    return text;
  }

  function translateTextNode(node) {
    const parent = node.parentElement;
    if (skipElement(parent)) return;
    const current = node.nodeValue;
    if (!current || !current.trim()) return;
    if (!sourceText.has(node)) sourceText.set(node, current);
    const original = sourceText.get(node);
    if (language === 'he') {
      if (node.nodeValue !== original) node.nodeValue = original;
      return;
    }
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    const translated = dynamicTranslate(original.trim());
    const next = leading + translated + trailing;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function translateAttributes(el) {
    if (skipElement(el)) return;
    const attrs = ['placeholder','title','aria-label'];
    let saved = sourceAttrs.get(el);
    if (!saved) { saved = {}; sourceAttrs.set(el, saved); }
    for (const name of attrs) {
      if (!el.hasAttribute(name)) continue;
      if (!(name in saved)) saved[name] = el.getAttribute(name);
      const original = saved[name];
      const next = language === 'he' ? original : dynamicTranslate(original);
      if (el.getAttribute(name) !== next) el.setAttribute(name, next);
    }
  }

  function apply(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) translateTextNode(node);
    if (root.nodeType === Node.ELEMENT_NODE) translateAttributes(root);
    root.querySelectorAll?.('*').forEach(translateAttributes);
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply(document.body);
    });
  }

  function ensureControl() {
    if (document.getElementById('beautix-language-select')) return;
    const host = document.querySelector('.nav-utilities') || document.querySelector('.topbar .actions') || document.querySelector('header') || document.body;
    const wrap = document.createElement('label');
    wrap.className = 'beautix-language-control';
    wrap.innerHTML = '<span aria-hidden="true">🌐</span><select id="beautix-language-select" aria-label="שפה"><option value="he">עברית</option><option value="en">English</option></select>';
    host.prepend(wrap);
    const style = document.createElement('style');
    style.id = 'beautix-language-style-v3';
    style.textContent = '.beautix-language-control{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 10px;border:1px solid rgba(111,66,168,.24);border-radius:12px;background:#fff;color:#4e2e6d;font-weight:800}.beautix-language-control select{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;outline:none;cursor:pointer}html[dir="ltr"] body{text-align:left}html[dir="ltr"] .site-content,html[dir="ltr"] .cashflow-dialog,html[dir="ltr"] .lead-action-dialog,html[dir="ltr"] .profile-editor{text-align:left}html[dir="ltr"] .cashflow-close,html[dir="ltr"] .modal-close{left:auto;right:12px}@media(max-width:720px){.beautix-language-control{padding:0 7px}.beautix-language-control select{max-width:90px}}';
    document.head.appendChild(style);
    const select = wrap.querySelector('select');
    select.value = language;
    select.addEventListener('change', () => setLanguage(select.value));
  }

  function setLanguage(next) {
    language = next === 'en' ? 'en' : 'he';
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = maps[language]?.meta?.dir || (language === 'he' ? 'rtl' : 'ltr');
    const select = document.getElementById('beautix-language-select');
    if (select) select.value = language;
    apply(document.body);
    window.dispatchEvent(new CustomEvent('beautix:language-changed', { detail: { language } }));
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
      scheduleApply();
      break;
    }
  });

  function init() {
    ensureControl();
    setLanguage(language);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('beautix:report-loaded', scheduleApply);
    window.addEventListener('beautix:cashflow-updated', scheduleApply);
    setInterval(scheduleApply, 1500);
  }

  window.BEAUTIX_I18N = {
    setLanguage,
    getLanguage: () => language,
    translate: dynamicTranslate,
    refresh: scheduleApply,
    map: maps
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
