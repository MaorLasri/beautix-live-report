(() => {
  if (window.__beautixCollectionMetricsV1Loaded) return;
  window.__beautixCollectionMetricsV1Loaded = true;

  const money = value => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 2 }).format(Number(value || 0));
  const numberText = value => new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 }).format(Number(value || 0));
  const setText = (id, value, cls = null) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
    el.classList.remove('pos','neg','warn');
    if (cls) el.classList.add(cls);
  };
  const setProgress = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(Number(value || 0), 100))}%`;
  };

  function render(report) {
    const m = report?.collection_metrics;
    if (!m) return;

    const status = m.linkage_status;
    const received = Number(m.payments_received_amount || 0);
    const allocated = Number(m.allocated_amount || 0);
    const future = Number(m.future_clearing_expected_amount || 0);
    const sales = Number(m.sales_amount || 0);

    if (status === 'missing_payment_data') {
      setText('immediate-receipts', 'אין נתוני תקבולים', 'warn');
      setText('immediate-receipts-progress-note', 'לא ניתן לחשב גבייה בלי נתוני תשלומים מקושרים');
      setText('immediate-receipts-daily-needed', '—');
      setText('immediate-receipts-daily-needed-note', `זיכויי סליקה צפויים החודש: ${money(future)}`);
      setProgress('immediate-progress-bar', 0);
      return;
    }

    const allocatedRatio = received > 0 ? allocated / received * 100 : 0;
    setText('immediate-receipts', money(received), received > 0 ? 'pos' : null);
    setText('immediate-receipts-progress-note', `${numberText(allocatedRatio)}% מהתקבולים שויכו לעסקאות`);
    setText('immediate-receipts-daily-needed', money(Number(m.unallocated_received_amount || 0)), Number(m.unallocated_received_amount || 0) > 0 ? 'warn' : 'pos');
    setText('immediate-receipts-daily-needed-note', `תקבולים לא משויכים · סליקה צפויה ${money(future)}`);
    setProgress('immediate-progress-bar', allocatedRatio);

    const gap = m.uncollected_sales_amount;
    if (gap !== null && gap !== undefined) {
      setText('sales-gap', money(Math.abs(Number(gap))), Number(gap) > 0 ? 'neg' : 'pos');
      setText('sales-gap-note', Number(gap) > 0 ? 'מכירות שטרם קיבלו תקבול משויך' : 'כל המכירות בתקופה מכוסות בתקבולים משויכים');
    } else if (sales > 0) {
      setText('sales-gap', 'לא ניתן לחשב', 'warn');
      setText('sales-gap-note', 'חסרים שיוכים בין עסקאות לתשלומים');
    }
  }

  window.addEventListener('beautix:report-loaded', event => render(event.detail || window.__beautixLastReport));
  setTimeout(() => render(window.__beautixLastReport), 300);
})();