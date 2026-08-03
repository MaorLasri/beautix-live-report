(() => {
  'use strict';
  const cfg=window.BEAUTIX_V2_CONFIG;
  const $=id=>document.getElementById(id);
  const money=v=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(v||0));
  const signed=(v,type)=>`${type==='income'?'+':'−'}${money(Math.abs(Number(v||0)))}`;
  const dateText=v=>new Intl.DateTimeFormat('he-IL',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${v}T00:00:00`));
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const state={entries:new Map(),loading:false,openDays:new Set(),currentEntry:null};

  function currentRange(){
    const active=document.querySelector('[data-range].active');
    const key=active?.dataset.range||'current_month';
    const t=new Date(),iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let start=new Date(t.getFullYear(),t.getMonth(),t.getDate()),end=new Date(start);
    if(key==='custom') return {start:$('cashflow-start')?.value,end:$('cashflow-end')?.value};
    if(key==='back30') start.setDate(start.getDate()-29);
    else if(key==='back60') start.setDate(start.getDate()-59);
    else if(key==='back90') start.setDate(start.getDate()-89);
    else if(key==='forward30') end.setDate(end.getDate()+29);
    else if(key==='forward60') end.setDate(end.getDate()+59);
    else if(key==='forward90') end.setDate(end.getDate()+89);
    else if(key==='current_month'){start=new Date(t.getFullYear(),t.getMonth(),1);end=new Date(t.getFullYear(),t.getMonth()+1,0)}
    return {start:iso(start),end:iso(end)};
  }

  function injectControls(){
    const hero=document.querySelector('.cashflow-hero');
    if(hero&&!$('cashflow-add-entry')){
      const button=document.createElement('button');button.id='cashflow-add-entry';button.type='button';button.className='cashflow-add-btn';button.textContent='+ הוספת תנועה';
      hero.prepend(button);
    }
    if(!$('cashflow-entry-dialog')){
      document.body.insertAdjacentHTML('beforeend',`<dialog id="cashflow-entry-dialog" class="cashflow-dialog" dir="rtl"><form id="cashflow-entry-form" method="dialog"><div class="dialog-head"><div><h2 id="cashflow-dialog-title">הוספת תנועה</h2><p>הפרטים נשמרים ישירות במקור האמת.</p></div><button type="button" class="dialog-close" aria-label="סגירה">×</button></div><input id="cashflow-entry-id" type="hidden"><div class="dialog-grid"><label>תאריך<input id="cashflow-entry-date" type="date" required></label><label>סוג<select id="cashflow-entry-type"><option value="expense">הוצאה</option><option value="income">הכנסה</option></select></label><label class="wide">תיאור<input id="cashflow-entry-description" type="text" required maxlength="180"></label><label>סכום<input id="cashflow-entry-amount" type="number" min="0.01" step="0.01" required></label><label>אמצעי תשלום<select id="cashflow-entry-method"><option value="unknown">לא ידוע</option><option value="cash">מזומן</option><option value="check">צ׳ק</option><option value="credit_card">כרטיס אשראי</option><option value="bank_transfer">העברה בנקאית</option><option value="direct_debit">הוראת קבע</option><option value="bit">Bit</option><option value="paybox">PayBox</option><option value="other">אחר</option></select></label><label>מצב<select id="cashflow-entry-status"><option value="forecast">מתוכנן</option><option value="actual">בוצע בפועל</option></select></label></div><p id="cashflow-entry-error" class="dialog-error" hidden></p><div id="cashflow-destructive-actions" class="dialog-danger-zone" hidden><button type="button" class="cancel-entry-record">ביטול תנועה</button><button type="button" class="delete-entry-record" hidden>מחיקה</button><small>הפעולות מסירות את התנועה מהתזרים ושומרות תיעוד במערכת.</small></div><div class="dialog-actions"><button type="button" class="secondary-btn dialog-cancel">סגירה</button><button type="submit" class="primary-btn">שמירה</button></div></form></dialog>`);
    }
  }

  function openDialog(entry=null,date=null){
    injectControls();
    state.currentEntry=entry;
    const dialog=$('cashflow-entry-dialog');
    $('cashflow-dialog-title').textContent=entry?'עריכת תנועה':'הוספת תנועה';
    $('cashflow-entry-id').value=entry?.id||'';
    $('cashflow-entry-date').value=entry?.date||date||new Date().toISOString().slice(0,10);
    $('cashflow-entry-type').value=entry?.type||'expense';
    $('cashflow-entry-description').value=entry?.description||'';
    $('cashflow-entry-amount').value=entry?.amount||'';
    $('cashflow-entry-method').value=entry?.payment_method||'unknown';
    $('cashflow-entry-status').value=entry?.state==='actual'?'actual':'forecast';
    $('cashflow-entry-error').hidden=true;
    const danger=$('cashflow-destructive-actions');
    danger.hidden=!entry;
    const deleteButton=danger.querySelector('.delete-entry-record');
    deleteButton.hidden=!(entry?.source_reference||'').startsWith('test-v2:cashflow:');
    dialog.showModal();
  }

  async function refreshAll(){
    await refresh();
    window.BEAUTIX_V2?.refreshCashflow?.();
  }

  async function saveEntry(e){
    e.preventDefault();
    const errorBox=$('cashflow-entry-error');errorBox.hidden=true;
    const params={p_id:$('cashflow-entry-id').value||null,p_date:$('cashflow-entry-date').value,p_type:$('cashflow-entry-type').value,p_amount:Number($('cashflow-entry-amount').value),p_description:$('cashflow-entry-description').value.trim(),p_payment_method:$('cashflow-entry-method').value,p_status:$('cashflow-entry-status').value};
    const {error}=await client.rpc('save_test_v2_cashflow_entry_v1',params);
    if(error){errorBox.textContent=error.message;errorBox.hidden=false;return}
    $('cashflow-entry-dialog').close();
    await refreshAll();
  }

  async function runDestructiveAction(kind){
    const entry=state.currentEntry;
    if(!entry?.id)return;
    const isDelete=kind==='delete';
    const message=isDelete?'למחוק את התנועה? היא תוסר מהדוח, אך תיעוד המחיקה יישמר במערכת.':'לבטל את התנועה? היא תוסר מחישובי התזרים, אך ההיסטוריה שלה תישמר.';
    if(!window.confirm(message))return;
    const errorBox=$('cashflow-entry-error');errorBox.hidden=true;
    const buttons=$('cashflow-destructive-actions').querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
    const rpc=isDelete?'delete_test_v2_cashflow_entry_v1':'cancel_test_v2_cashflow_entry_v1';
    const {error}=await client.rpc(rpc,{p_id:entry.id});
    buttons.forEach(b=>b.disabled=false);
    if(error){errorBox.textContent=error.message;errorBox.hidden=false;return}
    $('cashflow-entry-dialog').close();
    state.currentEntry=null;
    await refreshAll();
  }

  async function confirmEntry(id,button){
    button.disabled=true;button.textContent='מאשר…';
    const {error}=await client.rpc('confirm_test_v2_cashflow_entry_v1',{p_id:id});
    if(error){button.disabled=false;button.textContent='אישור';alert(error.message);return}
    await refreshAll();
  }

  function renderDays(data){
    const host=$('cashflow-upcoming');if(!host)return;
    state.entries.clear();
    const days=Array.isArray(data.days)?data.days:[];
    if(!days.length){host.innerHTML='<div class="empty-state"><p>אין תנועות בטווח שנבחר.</p></div>';return}
    host.innerHTML=days.map((day,index)=>{
      const open=state.openDays.has(day.date)||index===0;
      if(open)state.openDays.add(day.date);
      const entries=(day.entries||[]).map(entry=>{const item={...entry,date:day.date};state.entries.set(entry.id,item);return item});
      return `<article class="cash-day-accordion ${open?'open':''}" data-day="${day.date}"><button class="cash-day-summary" type="button" aria-expanded="${open}"><div class="cash-day-date"><strong>${dateText(day.date)}</strong><span>${day.event_count||0} תנועות</span></div><div class="cash-day-metrics"><span class="day-income">+${money(day.inflows)}</span><span class="day-expense">−${money(day.outflows)}</span><span class="day-balance">יתרת עו״ש ${money(day.balance)}</span><i>⌄</i></div></button><div class="cash-day-details" ${open?'':'hidden'}>${entries.map(entry=>`<div class="cash-entry-row" data-entry-id="${entry.id}" tabindex="0" role="button"><div class="cash-entry-main"><strong>${esc(entry.description||'תנועה')}</strong><span>${entry.state==='actual'?'בוצע בפועל':'מתוכנן'}${entry.payment_method?` · ${esc(entry.payment_method)}`:''}</span></div><div class="cash-entry-actions"><b class="entry-amount ${entry.type==='income'?'income':'expense'}">${signed(entry.amount,entry.type)}</b>${entry.state!=='actual'?'<button type="button" class="confirm-entry">אישור</button>':'<span class="confirmed-entry">אושר</span>'}</div></div>`).join('')}</div></article>`;
    }).join('');
  }

  async function refresh(){
    if(state.loading||!$('panel-cashflow')||$('panel-cashflow').hidden)return;
    const range=currentRange();if(!range.start||!range.end)return;
    state.loading=true;
    const {data,error}=await client.rpc('get_test_v2_cashflow_range_v1',{p_start:range.start,p_end:range.end});
    state.loading=false;
    if(!error)renderDays(data||{});
  }

  function bind(){
    injectControls();
    document.addEventListener('click',e=>{
      const add=e.target.closest('#cashflow-add-entry');if(add){openDialog(null,currentRange().start);return}
      const close=e.target.closest('.dialog-close,.dialog-cancel');if(close){$('cashflow-entry-dialog')?.close();state.currentEntry=null;return}
      const cancelRecord=e.target.closest('.cancel-entry-record');if(cancelRecord){runDestructiveAction('cancel');return}
      const deleteRecord=e.target.closest('.delete-entry-record');if(deleteRecord){runDestructiveAction('delete');return}
      const day=e.target.closest('.cash-day-summary');if(day){const card=day.closest('.cash-day-accordion'),details=card.querySelector('.cash-day-details'),open=card.classList.toggle('open');details.hidden=!open;day.setAttribute('aria-expanded',String(open));open?state.openDays.add(card.dataset.day):state.openDays.delete(card.dataset.day);return}
      const confirm=e.target.closest('.confirm-entry');if(confirm){e.stopPropagation();const row=confirm.closest('.cash-entry-row');confirmEntry(row.dataset.entryId,confirm);return}
      const row=e.target.closest('.cash-entry-row');if(row){openDialog(state.entries.get(row.dataset.entryId));return}
      if(e.target.closest('[data-range]'))setTimeout(refresh,250);
      if(e.target.closest('[data-tab="cashflow"]'))setTimeout(refresh,500);
    });
    $('cashflow-entry-form')?.addEventListener('submit',saveEntry);
    $('cashflow-custom-range')?.addEventListener('submit',()=>setTimeout(refresh,250));
    client.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(refresh,500)});
    setTimeout(refresh,900);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();