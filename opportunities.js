(() => {
  const money=value=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS",maximumFractionDigits:0}).format(Number(value||0));
  const dateText=value=>value?new Intl.DateTimeFormat("he-IL").format(new Date(`${String(value).slice(0,10)}T00:00:00`)):"—";
  const escapeHtml=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const dial=value=>String(value??"").replace(/[^\d+]/g,"");
  const statusLabels={new:"חדש",contacted:"נוצר קשר",appointment_set:"נקבע תור",visited:"כבר ביקרה",no_answer:"אין מענה",not_relevant:"לא רלוונטי",lost:"אבוד"};
  const cardByLabel=label=>[...document.querySelectorAll(".opportunities-section .card")].find(card=>card.querySelector("span")?.textContent?.trim()===label);
  const setCard=(label,value,note)=>{const card=cardByLabel(label);if(!card)return;const strong=card.querySelector("strong"),p=card.querySelector("p");if(strong)strong.textContent=value;if(p)p.textContent=note;};
  let client=null,activeCustomer=null;

  function getClient(){if(!client){const config=window.BEAUTIX_CONFIG;client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);}return client;}

  function ensureActionModal(){
    if(document.getElementById("return-action-modal"))return;
    document.body.insertAdjacentHTML("beforeend",`<div id="return-action-modal" class="modal-backdrop" hidden><section class="profile-editor return-action-dialog" role="dialog" aria-modal="true" aria-labelledby="return-action-title"><button id="return-action-close" type="button" class="modal-close" aria-label="סגירה">×</button><h2 id="return-action-title">עדכון לקוחה</h2><p id="return-action-name">—</p><form id="return-action-form"><label>סטטוס<select id="return-action-status" required><option value="appointment_set">נקבע תור חדש</option><option value="visited">הלקוחה כבר ביקרה</option><option value="contacted">נוצר קשר</option><option value="no_answer">אין מענה</option><option value="not_relevant">לא רלוונטי</option><option value="lost">אבוד</option><option value="new">החזרה לחדש</option></select></label><label id="return-action-date-wrap">מועד התור<input id="return-action-date" type="datetime-local" /></label><label>הערה<textarea id="return-action-note" rows="3" placeholder="הערה אופציונלית"></textarea></label><button type="submit">שמירת פעולה</button><p id="return-action-message" class="auth-status" hidden></p></form></section></div>`);
    const modal=document.getElementById("return-action-modal"),form=document.getElementById("return-action-form"),status=document.getElementById("return-action-status"),dateWrap=document.getElementById("return-action-date-wrap"),message=document.getElementById("return-action-message");
    const close=()=>{modal.hidden=true;activeCustomer=null;message.hidden=true;};
    document.getElementById("return-action-close").addEventListener("click",close);
    modal.addEventListener("click",event=>{if(event.target===modal)close();});
    status.addEventListener("change",()=>{dateWrap.hidden=status.value!=="appointment_set";});
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(!activeCustomer)return;
      const submit=form.querySelector('button[type="submit"]');submit.disabled=true;message.hidden=true;
      try{
        const appointment=status.value==="appointment_set"?(document.getElementById("return-action-date").value||null):null;
        if(status.value==="appointment_set"&&!appointment)throw new Error("יש לבחור מועד לתור");
        const {error}=await getClient().rpc("update_return_opportunity_action",{p_customer_id:activeCustomer.id,p_status:status.value,p_appointment_date:appointment,p_note:document.getElementById("return-action-note").value||null});
        if(error)throw error;
        message.textContent="הפעולה נשמרה בהצלחה";message.className="auth-status success";message.hidden=false;
        setTimeout(async()=>{close();await openAll(true);},450);
      }catch(error){message.textContent=`שמירת הפעולה נכשלה: ${error.message}`;message.className="auth-status error";message.hidden=false;}
      finally{submit.disabled=false;}
    });
  }

  function openAction(button){
    ensureActionModal();activeCustomer={id:button.dataset.customerId};
    document.getElementById("return-action-name").textContent=button.dataset.customerName||"לקוחה";
    const status=document.getElementById("return-action-status");status.value=button.dataset.status||"new";
    document.getElementById("return-action-date").value=button.dataset.appointmentDate?String(button.dataset.appointmentDate).slice(0,16):"";
    document.getElementById("return-action-note").value=button.dataset.note||"";
    document.getElementById("return-action-date-wrap").hidden=status.value!=="appointment_set";
    document.getElementById("return-action-modal").hidden=false;
  }

  function ensureModal(){
    if(document.getElementById("return-opportunities-modal"))return;
    document.body.insertAdjacentHTML("beforeend",`<div id="return-opportunities-modal" class="modal-backdrop" hidden><section class="profile-editor return-opportunities-dialog" role="dialog" aria-modal="true" aria-labelledby="return-opportunities-title"><button id="return-opportunities-close" type="button" class="modal-close" aria-label="סגירה">×</button><h2 id="return-opportunities-title">לקוחות עם פוטנציאל חזרה</h2><p id="return-opportunities-summary">טוען...</p><div id="return-opportunities-list" class="return-opportunities-list"></div></section></div>`);
    const modal=document.getElementById("return-opportunities-modal");
    const close=()=>modal.hidden=true;
    document.getElementById("return-opportunities-close").addEventListener("click",close);
    modal.addEventListener("click",event=>{if(event.target===modal)close();});
    if(!document.getElementById("return-opportunities-style")){
      const style=document.createElement("style");style.id="return-opportunities-style";style.textContent=`.return-opportunities-dialog,.return-action-dialog{width:min(760px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto}.return-opportunities-list{display:grid;gap:10px;margin-top:16px}.return-opportunity-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px;border:1px solid #ece7f3;border-radius:16px;background:#fff}.return-opportunity-card strong{display:block;color:#27364a}.return-opportunity-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.return-opportunity-meta{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:5px;color:#7b8798;font-size:.88rem}.return-opportunity-note{margin-top:7px;color:#5f6f84;font-size:.88rem}.return-opportunity-actions{display:flex;gap:8px}.return-opportunity-actions a,.return-opportunity-actions button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 12px;border-radius:11px;text-decoration:none;font:inherit;font-weight:800;border:1px solid #dcd5e8;background:#fff;color:#5c3a7c}.return-opportunity-actions a{background:#e8f7ef;color:#168455;border-color:#c7ead7}.return-status{display:inline-flex;padding:5px 9px;border-radius:999px;background:#eef1f6;color:#536176;font-size:.76rem;font-weight:800}.return-status-appointment_set{background:#e8f7ef;color:#168455}.return-status-visited{background:#eee7fb;color:#6f42a8}.return-status-not_relevant,.return-status-lost{background:#fdecec;color:#b33a45}.return-status-no_answer{background:#fff3d9;color:#9b6a00}.opportunity-expand-button{margin-top:12px;width:100%;min-height:42px;border:0;border-radius:12px;background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff;font:inherit;font-weight:800;cursor:pointer}.return-action-dialog form{display:grid;gap:14px}.return-action-dialog label{display:grid;gap:6px;color:#4c596b;font-weight:700}.return-action-dialog select,.return-action-dialog input,.return-action-dialog textarea{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #d9deea;border-radius:12px;background:#fff;font:inherit}.return-action-dialog button[type=submit]{padding:12px;border:0;border-radius:12px;background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff;font-weight:800}@media(max-width:560px){.return-opportunity-card{grid-template-columns:1fr}.return-opportunity-actions{width:100%}.return-opportunity-actions a,.return-opportunity-actions button{flex:1}}`;document.head.appendChild(style);
    }
  }

  async function openAll(keepOpen=false){
    ensureModal();const modal=document.getElementById("return-opportunities-modal"),list=document.getElementById("return-opportunities-list"),summary=document.getElementById("return-opportunities-summary");modal.hidden=false;list.innerHTML='<div class="chart-empty">טוען פוטנציאלים...</div>';summary.textContent="טוען...";
    try{
      const {data,error}=await getClient().rpc("get_return_opportunities_report",{p_limit:100});if(error)throw error;
      const report=data?.report||data||{},items=Array.isArray(report.items)?report.items:[];summary.textContent=`${Number(report.count||items.length).toLocaleString("he-IL")} לקוחות עם פוטנציאל חזרה`;
      list.innerHTML=items.length?items.map(item=>{const phone=dial(item.phone),status=item.status||"new";return `<article class="return-opportunity-card"><div><div class="return-opportunity-title"><strong>${escapeHtml(item.name||"—")}</strong><span class="return-status return-status-${escapeHtml(status)}">${escapeHtml(statusLabels[status]||"חדש")}</span></div><div class="return-opportunity-meta"><span>ביקור אחרון: ${dateText(item.last_visit)}</span><span>${Number(item.days_since_visit||0).toLocaleString("he-IL")} ימים ללא ביקור</span><span>${Number(item.visit_count||0).toLocaleString("he-IL")} ביקורים</span><span>מכירות מצטברות: ${money(item.lifetime_sales)}</span>${item.appointment_date?`<span>תור: ${dateText(item.appointment_date)}</span>`:""}</div>${item.follow_up_note?`<div class="return-opportunity-note">הערה: ${escapeHtml(item.follow_up_note)}</div>`:""}</div><div class="return-opportunity-actions">${phone?`<a href="tel:${escapeHtml(phone)}">חיוג</a>`:""}<button type="button" class="return-action-button" data-customer-id="${escapeHtml(item.id)}" data-customer-name="${escapeHtml(item.name||"לקוחה")}" data-status="${escapeHtml(status)}" data-note="${escapeHtml(item.follow_up_note||"")}" data-appointment-date="${escapeHtml(item.appointment_date||"")}">פעולות</button></div></article>`;}).join(""):'<div class="chart-empty">לא נמצאו לקוחות</div>';
      list.querySelectorAll(".return-action-button").forEach(button=>button.addEventListener("click",()=>openAction(button)));
    }catch(error){summary.textContent="טעינת הרשימה נכשלה";list.innerHTML=`<div class="chart-empty">${escapeHtml(error.message)}</div>`;}
  }

  const render=report=>{
    const data=report?.opportunities||{},products=Array.isArray(data.top_products)?data.top_products:[],candidates=Array.isArray(data.return_candidates)?data.return_candidates:[],top=products[0],best=candidates[0];
    setCard("מוצרים / טיפולים מובילים",top?top.name:"אין נתון",top?`${money(top.sales)} · ${top.transaction_count} עסקאות`:"לא נמצאו עסקאות עם פירוט מוצר או טיפול");
    setCard("לקוחות עם פוטנציאל חזרה",Number(data.return_candidate_count||0)>0?`${data.return_candidate_count} לקוחות`:"אין נתון",best?`מועמד מוביל: ${best.name} · ביקור אחרון ${dateText(best.last_visit)} · ${money(best.lifetime_sales)}`:"לא נמצאו לקוחות ללא ביקור ב־90 הימים האחרונים");
    const card=cardByLabel("לקוחות עם פוטנציאל חזרה");if(card&&!card.querySelector(".opportunity-expand-button")){const button=document.createElement("button");button.type="button";button.className="opportunity-expand-button";button.textContent="הצגת פוטנציאלים נוספים";button.addEventListener("click",()=>openAll());card.appendChild(button);}
  };
  window.addEventListener("beautix:report-loaded",event=>render(event.detail));
  if(window.__beautixLastReport)render(window.__beautixLastReport);
})();