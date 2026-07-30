(() => {
  const money=value=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS",maximumFractionDigits:0}).format(Number(value||0));
  const dateText=value=>value?new Intl.DateTimeFormat("he-IL").format(new Date(`${String(value).slice(0,10)}T00:00:00`)):"—";
  const escapeHtml=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const dial=value=>String(value??"").replace(/[^\d+]/g,"");
  const cardByLabel=label=>[...document.querySelectorAll(".opportunities-section .card")].find(card=>card.querySelector("span")?.textContent?.trim()===label);
  const setCard=(label,value,note)=>{const card=cardByLabel(label);if(!card)return;const strong=card.querySelector("strong"),p=card.querySelector("p");if(strong)strong.textContent=value;if(p)p.textContent=note;};
  let client=null;

  function ensureModal(){
    if(document.getElementById("return-opportunities-modal"))return;
    document.body.insertAdjacentHTML("beforeend",`<div id="return-opportunities-modal" class="modal-backdrop" hidden><section class="profile-editor return-opportunities-dialog" role="dialog" aria-modal="true" aria-labelledby="return-opportunities-title"><button id="return-opportunities-close" type="button" class="modal-close" aria-label="סגירה">×</button><h2 id="return-opportunities-title">לקוחות עם פוטנציאל חזרה</h2><p id="return-opportunities-summary">טוען...</p><div id="return-opportunities-list" class="return-opportunities-list"></div></section></div>`);
    const modal=document.getElementById("return-opportunities-modal");
    const close=()=>modal.hidden=true;
    document.getElementById("return-opportunities-close").addEventListener("click",close);
    modal.addEventListener("click",event=>{if(event.target===modal)close();});
    if(!document.getElementById("return-opportunities-style")){
      const style=document.createElement("style");style.id="return-opportunities-style";style.textContent=`.return-opportunities-dialog{width:min(760px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto}.return-opportunities-list{display:grid;gap:10px;margin-top:16px}.return-opportunity-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px;border:1px solid #ece7f3;border-radius:16px;background:#fff}.return-opportunity-card strong{display:block;color:#27364a}.return-opportunity-meta{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:5px;color:#7b8798;font-size:.88rem}.return-opportunity-actions{display:flex;gap:8px}.return-opportunity-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 12px;border-radius:11px;text-decoration:none;font-weight:800;background:#e8f7ef;color:#168455;border:1px solid #c7ead7}.opportunity-expand-button{margin-top:12px;width:100%;min-height:42px;border:0;border-radius:12px;background:linear-gradient(135deg,#ef2d9a,#6f42a8);color:#fff;font:inherit;font-weight:800;cursor:pointer}@media(max-width:560px){.return-opportunity-card{grid-template-columns:1fr}.return-opportunity-actions{width:100%}.return-opportunity-actions a{width:100%}}`;document.head.appendChild(style);
    }
  }

  async function openAll(){
    ensureModal();const modal=document.getElementById("return-opportunities-modal"),list=document.getElementById("return-opportunities-list"),summary=document.getElementById("return-opportunities-summary");modal.hidden=false;list.innerHTML='<div class="chart-empty">טוען פוטנציאלים...</div>';summary.textContent="טוען...";
    try{
      if(!client){const config=window.BEAUTIX_CONFIG;client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey);}
      const {data,error}=await client.rpc("get_return_opportunities_report",{p_limit:100});if(error)throw error;
      const report=data?.report||data||{},items=Array.isArray(report.items)?report.items:[];summary.textContent=`${Number(report.count||items.length).toLocaleString("he-IL")} לקוחות עם פוטנציאל חזרה`;
      list.innerHTML=items.length?items.map(item=>{const phone=dial(item.phone);return `<article class="return-opportunity-card"><div><strong>${escapeHtml(item.name||"—")}</strong><div class="return-opportunity-meta"><span>ביקור אחרון: ${dateText(item.last_visit)}</span><span>${Number(item.days_since_visit||0).toLocaleString("he-IL")} ימים ללא ביקור</span><span>${Number(item.visit_count||0).toLocaleString("he-IL")} ביקורים</span><span>מכירות מצטברות: ${money(item.lifetime_sales)}</span></div></div><div class="return-opportunity-actions">${phone?`<a href="tel:${escapeHtml(phone)}">חיוג</a>`:""}</div></article>`;}).join(""):'<div class="chart-empty">לא נמצאו לקוחות</div>';
    }catch(error){summary.textContent="טעינת הרשימה נכשלה";list.innerHTML=`<div class="chart-empty">${escapeHtml(error.message)}</div>`;}
  }

  const render=report=>{
    const data=report?.opportunities||{},products=Array.isArray(data.top_products)?data.top_products:[],candidates=Array.isArray(data.return_candidates)?data.return_candidates:[],top=products[0],best=candidates[0];
    setCard("מוצרים / טיפולים מובילים",top?top.name:"אין נתון",top?`${money(top.sales)} · ${top.transaction_count} עסקאות`:"לא נמצאו עסקאות עם פירוט מוצר או טיפול");
    setCard("לקוחות עם פוטנציאל חזרה",Number(data.return_candidate_count||0)>0?`${data.return_candidate_count} לקוחות`:"אין נתון",best?`מועמד מוביל: ${best.name} · ביקור אחרון ${dateText(best.last_visit)} · ${money(best.lifetime_sales)}`:"לא נמצאו לקוחות ללא ביקור ב־90 הימים האחרונים");
    const card=cardByLabel("לקוחות עם פוטנציאל חזרה");if(card&&!card.querySelector(".opportunity-expand-button")){const button=document.createElement("button");button.type="button";button.className="opportunity-expand-button";button.textContent="הצגת פוטנציאלים נוספים";button.addEventListener("click",openAll);card.appendChild(button);}
  };
  window.addEventListener("beautix:report-loaded",event=>render(event.detail));
  if(window.__beautixLastReport)render(window.__beautixLastReport);
})();