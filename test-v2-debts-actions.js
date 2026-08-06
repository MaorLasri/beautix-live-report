(() => {
  'use strict';
  const cfg=window.BEAUTIX_V2_CONFIG;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const money=v=>new Intl.NumberFormat('he-IL',{style:'currency',currency:'ILS',maximumFractionDigits:0}).format(Number(v||0));
  let rows=[];
  let current=null;
  let forceDuplicate=false;

  function modal(){
    if($('debt-editor'))return;
    document.body.insertAdjacentHTML('beforeend',`<div id="debt-editor" class="debt-modal" hidden>
      <div class="debt-modal-backdrop" data-debt-close></div>
      <section class="debt-modal-card" role="dialog" aria-modal="true" aria-labelledby="debt-editor-title">
        <div class="debt-modal-head"><div><span id="debt-editor-kicker">חוב חדש</span><h2 id="debt-editor-title">הוספת חוב</h2></div><button type="button" class="debt-close" data-debt-close aria-label="סגירה">×</button></div>
        <form id="debt-form" class="debt-form">
          <label>מלווה / גוף מממן<input id="debt-lender" required maxlength="120"></label>
          <label>שם החוב<input id="debt-name" maxlength="160"></label>
          <label>סכום מקורי<input id="debt-original" type="number" min="0" step="0.01" required></label>
          <label>יתרה נוכחית<input id="debt-balance" type="number" min="0" step="0.01" required></label>
          <label>החזר חודשי<input id="debt-monthly" type="number" min="0" step="0.01"></label>
          <label>ריבית שנתית %<input id="debt-interest" type="number" min="0" step="0.01"></label>
          <label>תאריך התחלה<input id="debt-start" type="date"></label>
          <label>תאריך סיום<input id="debt-end" type="date"></label>
          <label>תשלום הבא<input id="debt-next" type="date"></label>
          <label>סטטוס<select id="debt-status"><option value="active">פעיל</option><option value="paid">נפרע</option><option value="paused">מושהה</option></select></label>
          <label class="debt-check"><input id="debt-estimated" type="checkbox"> הנתונים כוללים הערכה</label>
          <label class="full">הערות<textarea id="debt-notes" rows="4"></textarea></label>
          <div id="debt-duplicate-box" class="debt-duplicate-box full" hidden></div>
          <div id="debt-feedback" class="debt-feedback full">לפני יצירת חוב חדש תבוצע בדיקת כפילויות.</div>
          <div class="debt-form-actions full"><div><button id="debt-cancel-record" type="button" class="secondary-btn danger-outline" hidden>ביטול חוב</button><button id="debt-delete-record" type="button" class="secondary-btn danger-outline" hidden>מחיקה מהתצוגה</button></div><div><button type="button" class="secondary-btn" data-debt-close>סגירה</button><button id="debt-save" type="submit" class="primary-btn">שמירה</button></div></div>
        </form>
      </section>
    </div>`);
    $('debt-form').addEventListener('submit',save);
    document.querySelectorAll('[data-debt-close]').forEach(x=>x.addEventListener('click',close));
    $('debt-cancel-record').addEventListener('click',()=>changeStatus('cancel'));
    $('debt-delete-record').addEventListener('click',()=>changeStatus('delete'));
  }

  async function refreshRows(){
    const {data,error}=await client.from('v_open_loans').select('*').order('current_balance',{ascending:false});
    if(error)return;
    rows=data||[];
    document.querySelectorAll('#debts-list .debt-card').forEach((card,index)=>{
      const row=rows[index];
      if(!row)return;
      card.dataset.debtId=row.id;
      card.tabIndex=0;
      card.setAttribute('role','button');
      card.setAttribute('aria-label',`עריכת ${row.name||row.loan_name||'חוב'}`);
    });
  }

  function addButton(){
    const head=document.querySelector('#panel-debts .section-head');
    if(!head||$('add-debt-button'))return;
    head.insertAdjacentHTML('beforeend','<button id="add-debt-button" class="primary-btn" type="button">הוספת חוב</button>');
    $('add-debt-button').addEventListener('click',()=>open(null));
  }

  function setValue(id,value){$(id).value=value??''}
  function open(row){
    modal();current=row||null;forceDuplicate=false;
    $('debt-editor-kicker').textContent=row?'עריכת רשומה':'חוב חדש';
    $('debt-editor-title').textContent=row?(row.name||row.loan_name||'עריכת חוב'):'הוספת חוב';
    setValue('debt-lender',row?.lender_name);setValue('debt-name',row?.name||row?.loan_name);
    setValue('debt-original',row?.original_amount);setValue('debt-balance',row?.current_balance);
    setValue('debt-monthly',row?.monthly_payment);setValue('debt-interest',row?.annual_interest_rate);
    setValue('debt-start',row?.start_date?.slice?.(0,10));setValue('debt-end',row?.end_date?.slice?.(0,10));setValue('debt-next',row?.next_payment_date?.slice?.(0,10));
    setValue('debt-status',row?.status||'active');$('debt-estimated').checked=Boolean(row?.is_estimated);setValue('debt-notes',row?.notes);
    $('debt-cancel-record').hidden=!row;$('debt-delete-record').hidden=!row;
    $('debt-duplicate-box').hidden=true;$('debt-feedback').className='debt-feedback full';$('debt-feedback').textContent=row?'השינויים יישמרו עם היסטוריה מלאה.':'לפני יצירת חוב חדש תבוצע בדיקת כפילויות.';
    $('debt-editor').hidden=false;document.body.classList.add('debt-modal-open');
  }
  function close(){if($('debt-editor'))$('debt-editor').hidden=true;document.body.classList.remove('debt-modal-open');current=null;forceDuplicate=false}

  function args(){return {
    p_id:current?.id||null,p_lender_name:$('debt-lender').value.trim(),p_loan_name:$('debt-name').value.trim()||null,
    p_original_amount:Number($('debt-original').value||0),p_current_balance:Number($('debt-balance').value||0),
    p_monthly_payment:$('debt-monthly').value===''?null:Number($('debt-monthly').value),p_annual_interest_rate:$('debt-interest').value===''?null:Number($('debt-interest').value),
    p_start_date:$('debt-start').value||null,p_end_date:$('debt-end').value||null,p_next_payment_date:$('debt-next').value||null,
    p_status:$('debt-status').value,p_is_estimated:$('debt-estimated').checked,p_notes:$('debt-notes').value.trim()||null
  }}

  async function save(event){
    event.preventDefault();const btn=$('debt-save'),feedback=$('debt-feedback'),payload=args();
    if(!payload.p_lender_name)return;
    btn.disabled=true;feedback.textContent='בודק ושומר…';
    try{
      if(!current&&!forceDuplicate){
        const {data,error}=await client.rpc('check_test_v2_debt_duplicate_v1',{p_id:null,p_lender_name:payload.p_lender_name,p_loan_name:payload.p_loan_name,p_original_amount:payload.p_original_amount,p_current_balance:payload.p_current_balance});
        if(error)throw error;const matches=Array.isArray(data?.matches)?data.matches:[];
        if(matches.length){
          const box=$('debt-duplicate-box');box.hidden=false;box.innerHTML=`<b>נמצא חוב זהה במסד</b>${matches.map(x=>`<div>${esc(x.lender_name)} · ${esc(x.loan_name||'חוב')} · ${money(x.current_balance)}</div>`).join('')}<div class="debt-duplicate-actions"><button id="debt-back-edit" type="button" class="secondary-btn">חזרה לעריכה</button><button id="debt-force-save" type="button" class="primary-btn">שמירה בכל זאת</button></div>`;
          $('debt-back-edit').onclick=()=>box.hidden=true;$('debt-force-save').onclick=()=>{forceDuplicate=true;box.hidden=true;$('debt-form').requestSubmit()};
          feedback.className='debt-feedback warning full';feedback.textContent='לא נשמר דבר. יש לאשר יצירת רשומה נוספת.';return;
        }
      }
      const {error}=await client.rpc('save_test_v2_debt_v1',payload);if(error)throw error;
      feedback.className='debt-feedback success full';feedback.textContent='החוב נשמר בהצלחה.';
      await reloadDebts();setTimeout(close,450);
    }catch(err){feedback.className='debt-feedback error full';feedback.textContent=`השמירה נכשלה: ${err.message||err}`}
    finally{btn.disabled=false}
  }

  async function changeStatus(action){
    if(!current)return;
    const label=action==='delete'?'להסיר את החוב מהתצוגה? הרשומה תישמר בהיסטוריה.':'לבטל את החוב?';
    if(!confirm(label))return;
    const fn=action==='delete'?'delete_test_v2_debt_v1':'cancel_test_v2_debt_v1';
    const {error}=await client.rpc(fn,{p_id:current.id});
    if(error){$('debt-feedback').className='debt-feedback error full';$('debt-feedback').textContent=error.message;return}
    await reloadDebts();close();
  }

  async function reloadDebts(){
    const cards=$('debts-list');if(cards)cards.innerHTML='<div class="empty-state"><p>מרענן חובות…</p></div>';
    const {data,error}=await client.from('v_open_loans').select('*').order('current_balance',{ascending:false});
    if(error){if(cards)cards.innerHTML=`<div class="empty-state"><p>${esc(error.message)}</p></div>`;return}
    location.reload();
  }

  function bind(){
    modal();addButton();refreshRows();
    document.addEventListener('click',event=>{const card=event.target.closest('#debts-list .debt-card');if(!card)return;const row=rows.find(x=>x.id===card.dataset.debtId);if(row)open(row)});
    document.addEventListener('keydown',event=>{const card=event.target.closest?.('#debts-list .debt-card');if(card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();const row=rows.find(x=>x.id===card.dataset.debtId);if(row)open(row)}});
    const observer=new MutationObserver(()=>{addButton();refreshRows()});
    const panel=$('panel-debts');if(panel)observer.observe(panel,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();