(() => {
  'use strict';
  let lastGlobalPeriod = null;
  let customActive = false;

  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const currentMonth = () => {
    const d = new Date();
    return {
      start: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`,
      end: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())}`,
      label: new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(d)
    };
  };

  function dispatchPeriod(period, source) {
    window.dispatchEvent(new CustomEvent('beautix-v2:period-change', {
      detail: { ...period, source }
    }));
  }

  function setFeedback(message, error = false) {
    const box = $('tax-range-feedback');
    if (!box) return;
    box.textContent = message || '';
    box.className = `tax-note${error ? ' error' : ''}`;
  }

  function inject() {
    const panel = $('panel-taxes');
    const hero = panel?.querySelector('.hero');
    if (!hero || $('tax-range-control')) return false;

    const wrap = document.createElement('div');
    wrap.id = 'tax-range-control';
    wrap.style.cssText = 'display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid rgba(120,110,140,.16)';
    wrap.innerHTML = `
      <label style="min-width:210px">טווח הדוח
        <select id="tax-range-mode">
          <option value="global">לפי התקופה הגלובלית</option>
          <option value="custom">טווח תאריכים מותאם</option>
        </select>
      </label>
      <div id="tax-custom-range" style="display:none;gap:10px;align-items:end;flex-wrap:wrap">
        <label>מתאריך<input id="tax-custom-start" type="date"></label>
        <label>עד תאריך<input id="tax-custom-end" type="date"></label>
        <button id="tax-apply-range" class="secondary-btn" type="button">הצגת הטווח</button>
      </div>
      <div id="tax-range-feedback" class="tax-note" style="flex-basis:100%;margin:0"></div>`;
    hero.appendChild(wrap);

    $('tax-range-mode').addEventListener('change', event => {
      customActive = event.target.value === 'custom';
      $('tax-custom-range').style.display = customActive ? 'flex' : 'none';
      setFeedback('');
      if (!customActive) dispatchPeriod(lastGlobalPeriod || currentMonth(), 'tax-global-reset');
    });

    $('tax-apply-range').addEventListener('click', () => {
      const start = $('tax-custom-start').value;
      const end = $('tax-custom-end').value;
      if (!start || !end) {
        setFeedback('יש לבחור תאריך התחלה ותאריך סיום.', true);
        return;
      }
      if (start > end) {
        setFeedback('תאריך הסיום חייב להיות מאוחר מתאריך ההתחלה.', true);
        return;
      }
      customActive = true;
      setFeedback(`מוצג טווח מותאם: ${start} עד ${end}`);
      dispatchPeriod({ start, end, label: `${start}–${end}` }, 'tax-custom');
    });
    return true;
  }

  window.addEventListener('beautix-v2:period-change', event => {
    const detail = event.detail || {};
    if (detail.source === 'tax-custom' || detail.source === 'tax-global-reset') return;
    lastGlobalPeriod = detail;
    if (!customActive) return;
    const mode = $('tax-range-mode');
    if (mode) mode.value = 'custom';
  });

  function init() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (inject() || attempts > 50) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();