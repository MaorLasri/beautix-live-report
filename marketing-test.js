(() => {
  const config=window.BEAUTIX_CONFIG;
  const rememberPreference=localStorage.getItem("beautix-remember-device")==="true";
  const storage=rememberPreference?window.localStorage:window.sessionStorage;
  const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,storage,autoRefreshToken:true,detectSessionInUrl:true}});
  const money=value=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS",maximumFractionDigits:0}).format(Number(value||0));
  const number=value=>new Intl.NumberFormat("he-IL",{maximumFractionDigits:1}).format(Number(value||0));
  const dateText=value=>value?new Intl.DateTimeFormat("he-IL").format(new Date(`${String(value).slice(0,10)}T00:00:00`)):"—";
  const monthText=value=>value?new Intl.DateTimeFormat("he-IL",{month:"short",year:"2-digit"}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):"—";
  const set=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value;};
  const escapeHtml=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const phoneLink=value=>{const display=String(value??"").trim();if(!display)return "—";const dial=display.replace(/[^\d+]/g,"");return dial?`<a class="phone-link" href="tel:${escapeHtml(dial)}" dir="ltr">${escapeHtml(display)}</a>`:escapeHtml(display);};
  const statusLabels={new:"חדש",contacted:"נוצר קשר",appointment_set:"נקבע תור",quote_sent:"נשלחה הצעה",won:"נסגר",lost:"אבוד",not_relevant:"לא רלוונטי",no_answer:"אין מענה",visited:"כבר ביקרה"};
  const errorBox=document.getElementById("marketing-error");
  let activeLead=null;

  function renderRows(targetId,rows,renderer,colspan){const target=document.getElementById(targetId);if(!target)return;target.innerHTML=rows.length?rows.map(renderer).join(""):`<tr><td class="empty-row" colspan="${colspan}">אין נתונים</td></tr>`;}

  function ensureActionModal(){
    if(document.getElementById("lead-action-modal"))return;
    document.body.insertAdjacentHTML("beforeend",`<div id="lead-action-modal" class="lead-action-backdrop" hidden><section class="lead-action-dialog" role="dialog" aria-modal="true" aria-labelledby="lead-action-title"><button id="lead-action-close" class="modal-close" type="button" aria-label="סגירה">×</button><h2 id="lead-action-title">עדכון ליד</h2><p id="lead-action-name">—</p><form id="lead-action-form"><label>סטטוס<select id="lead-action-status" required><option value="appointment_set">נקבע תור חדש</option><option value="visited">הלקוחה כבר ביקרה</option><option value="contacted">נוצר קשר</option><option value="no_answer">אין מענה</option><option value="not_relevant">לא רלוונטי</option><option value="lost">אבוד</option><option value="new">החזרה לחדש</option></select></label><label id="lead-action-date-wrap">מועד התור<input id="lead-action-date" type="datetime-local" /></label><label>הערה<textarea id="lead-action-note" rows="3" placeholder="הערה אופציונלית"></textarea></label><button id="lead-action-save" type="submit">שמירת פעולה</button><p id="lead-action-status-message" class="auth-status" hidden></p></form></section></div>`);
    const modal=document.getElementById("lead-action-modal"),form=document.getElementById("lead-action-form"),status=document.getElementById("lead-action-status"),dateWrap=document.getElementById("lead-action-date-wrap"),message=document.getElementById("lead-action-status-message");
    const close=()=>{modal.hidden=true;activeLead=null;message.hidden=true;};
    document.getElementById("lead-action-close").addEventListener("click",close);
    modal.addEventListener("click",event=>{if(event.target===modal)close();});
    status.addEventListener("change",()=>{dateWrap.hidden=status.value!=="appointment_set";});
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(!activeLead)return;
      const save=document.getElementById("lead-action-save");save.disabled=true;message.hidden=true;
      try{
        const appointment=status.value==="appointment_set"?(document.getElementById("lead-action-date").value||null):null;
        if(status.value==="appointment_set"&&!appointment)throw new Error("יש לבחור מועד לתור");
        const {error}=await client.rpc("update_marketing_lead_action",{p_lead_id:activeLead.leadId,p_status:status.value,p_appointment_date:appointment,p_note:document.getElementById("lead-action-note").value||null});
        if(error)throw error;
        message.textContent="הפעולה נשמרה בהצלחה";message.className="auth-status success";message.hidden=false;
        setTimeout(()=>{close();load();},500);
      }catch(error){message.textContent=`שמירת הפעולה נכשלה: ${error.message}`;message.className="auth-status error";message.hidden=false;}
      finally{save.disabled=false;}
    });
  }

  function openLeadAction(button){
    ensureActionModal();activeLead={leadId:button.dataset.leadId};
    document.getElementById("lead-action-name").textContent=button.dataset.leadName||"ליד";
    const status=document.getElementById("lead-action-status");status.value=button.dataset.status||"appointment_set";
    document.getElementById("lead-action-date").value="";document.getElementById("lead-action-note").value=button.dataset.note||"";
    document.getElementById("lead-action-date-wrap").hidden=status.value!=="appointment_set";
    document.getElementById("lead-action-modal").hidden=false;
  }

  function ensureMonthlyChartsSection(){
    if(document.getElementById("monthly-performance-section"))return;
    const first=document.querySelector("main.site-content > section.dashboard-section");if(!first)return;
    const section=document.createElement("section");section.id="monthly-performance-section";section.className="dashboard-section";
    section.innerHTML=`<div class="section-title-block"><span class="section-kicker">מגמה חודשית</span><h2>ביצועי לידים והמרה לפי חודש</h2><p>לידים והמרות לפי חודש יצירת הליד; הכנסות לפי חודש ביצוע העסקה בפועל.</p></div><div class="monthly-chart-grid"><article class="chart-card"><div class="chart-card-head"><div><span>לידים לפי חודש</span><strong id="monthly-leads-total">—</strong></div><small>כמות לידים חדשים</small></div><div id="monthly-leads-chart" class="chart-stage"></div></article><article class="chart-card"><div class="chart-card-head"><div><span>שיעורי המרה</span><strong id="monthly-best-conversion">—</strong></div><small>ליד → לקוח וליד → משלם</small></div><div id="monthly-conversion-chart" class="chart-stage"></div><div class="chart-legend"><span><i class="legend-purple"></i>ללקוח</span><span><i class="legend-pink"></i>למשלם</span></div></article><article class="chart-card"><div class="chart-card-head"><div><span>הכנסה מלקוחות שהגיעו מלידים</span><strong id="monthly-attributed-sales">—</strong></div><small>לפי חודש ביצוע העסקה</small></div><div id="monthly-sales-chart" class="chart-stage"></div></article><article class="chart-card"><div class="chart-card-head"><div><span>זמן ממוצע להמרה</span><strong id="monthly-conversion-days">—</strong></div><small>מתאריך הליד לעסקה הראשונה</small></div><div id="monthly-conversion-days-chart" class="chart-stage"></div></article></div>`;
    first.insertAdjacentElement("afterend",section);
  }

  function barChart(rows,valueKey,formatter,barClass="chart-bar"){if(!rows.length)return '<div class="chart-empty">אין נתונים</div>';const width=640,height=230,pad={top:22,right:12,bottom:48,left:12},innerW=width-pad.left-pad.right,innerH=height-pad.top-pad.bottom,max=Math.max(...rows.map(row=>Number(row[valueKey]||0)),1),slot=innerW/rows.length,barW=Math.min(46,slot*.58);const bars=rows.map((row,index)=>{const value=Number(row[valueKey]||0),h=(value/max)*innerH,x=pad.left+index*slot+(slot-barW)/2,y=pad.top+innerH-h;return `<g><rect class="${barClass}" x="${x}" y="${y}" width="${barW}" height="${Math.max(h,2)}" rx="8"><title>${monthText(row.month_start)}: ${formatter(value)}</title></rect><text class="chart-value" x="${x+barW/2}" y="${Math.max(y-7,12)}" text-anchor="middle">${formatter(value)}</text><text class="chart-label" x="${x+barW/2}" y="${height-18}" text-anchor="middle">${monthText(row.month_start)}</text></g>`;}).join("");return `<svg viewBox="0 0 ${width} ${height}" role="img">${bars}</svg>`;}
  function lineChart(rows){if(!rows.length)return '<div class="chart-empty">אין נתונים</div>';const width=640,height=230,pad={top:24,right:18,bottom:48,left:18},innerW=width-pad.left-pad.right,innerH=height-pad.top-pad.bottom,max=Math.max(...rows.flatMap(row=>[Number(row.lead_to_customer_pct||0),Number(row.lead_to_paying_pct||0)]),10),x=index=>pad.left+(rows.length===1?innerW/2:index*(innerW/(rows.length-1))),y=value=>pad.top+innerH-(Number(value||0)/max)*innerH,pathFor=key=>rows.map((row,index)=>`${index===0?"M":"L"}${x(index)},${y(row[key])}`).join(" "),labels=rows.map((row,index)=>`<text class="chart-label" x="${x(index)}" y="${height-18}" text-anchor="middle">${monthText(row.month_start)}</text>`).join(""),points=(key,css)=>rows.map((row,index)=>`<circle class="${css}" cx="${x(index)}" cy="${y(row[key])}" r="5"><title>${number(row[key])}%</title></circle>`).join("");return `<svg viewBox="0 0 ${width} ${height}"><path class="chart-line-purple" d="${pathFor("lead_to_customer_pct")}"/><path class="chart-line-pink" d="${pathFor("lead_to_paying_pct")}"/>${points("lead_to_customer_pct","chart-point-purple")}${points("lead_to_paying_pct","chart-point-pink")}${labels}</svg>`;}
  function renderMonthly(months){const rows=(months||[]).slice(-12);set("monthly-leads-total",number(rows.reduce((sum,row)=>sum+Number(row.leads||0),0)));set("monthly-best-conversion",`${number(rows.reduce((max,row)=>Math.max(max,Number(row.lead_to_customer_pct||0)),0))}%`);set("monthly-attributed-sales",money(rows.reduce((sum,row)=>sum+Number(row.attributed_sales||0),0)));const conversionRows=rows.filter(row=>row.avg_conversion_days!==null&&row.avg_conversion_days!==undefined),weightedDays=conversionRows.reduce((sum,row)=>sum+Number(row.avg_conversion_days||0)*Number(row.converted_customers||0),0),convertedCount=conversionRows.reduce((sum,row)=>sum+Number(row.converted_customers||0),0);set("monthly-conversion-days",convertedCount?`${number(weightedDays/convertedCount)} ימים`:"—");document.getElementById("monthly-leads-chart").innerHTML=barChart(rows,"leads",value=>number(value));document.getElementById("monthly-conversion-chart").innerHTML=lineChart(rows);document.getElementById("monthly-sales-chart").innerHTML=barChart(rows,"attributed_sales",value=>money(value));document.getElementById("monthly-conversion-days-chart").innerHTML=barChart(conversionRows,"avg_conversion_days",value=>`${number(value)} ימים`,"chart-bar-days");}

  function render(report){
    const summary=report.summary||{};set("m-total-leads",number(summary.total_leads));set("m-phone-coverage",`${number(summary.leads_with_phone)} עם מספר טלפון`);set("m-matched",number(summary.matched_customers));set("m-match-rate",`${number(summary.lead_to_customer_pct)}% מהלידים`);set("m-visitors",number(summary.ever_visited));set("m-visit-rate",`${number(summary.lead_to_visit_pct)}% מהלידים`);set("m-paying",number(summary.paying_customers));set("m-paying-rate",`${number(summary.lead_to_paying_pct)}% מהלידים`);set("m-attributed-sales",money(summary.attributed_sales));set("m-never-visited",number(summary.matched_never_visited));set("m-customers-total",number(summary.customers_total));set("m-customers-never",number(summary.customers_never_visited));set("m-future-meetings",number(summary.customers_with_future_meeting));set("m-debtors-count",number(summary.debtors_count));set("m-debt-total",`סה״כ ${money(summary.customer_debt_total)}`);
    renderRows("campaign-table",report.campaigns||[],row=>`<tr><td>${escapeHtml(row.campaign_name||"—")}</td><td>${number(row.leads)}</td><td>${number(row.matched_customers)}</td><td>${number(row.paying_customers)}</td><td>${money(row.attributed_sales)}</td></tr>`,5);
    renderRows("debtors-table",report.debtors||[],row=>`<tr><td>${escapeHtml(row.customer_name||"—")}</td><td>${phoneLink(row.phone)}</td><td>${money(Math.abs(Number(row.balance||0)))}</td><td>${number(row.history_meetings_count)}</td></tr>`,4);
    const head=document.querySelector("#never-visited-table")?.closest("table")?.querySelector("thead tr");if(head&&!head.querySelector(".actions-head"))head.insertAdjacentHTML("beforeend",'<th class="actions-head">סטטוס ופעולות</th>');
    renderRows("never-visited-table",report.never_visited||[],row=>`<tr><td>${escapeHtml(row.lead_name||"—")}</td><td>${phoneLink(row.phone)}</td><td>${escapeHtml(row.campaign_name||"—")}</td><td>${dateText(row.lead_date)}</td><td>${escapeHtml(row.customer_name||"—")}</td><td>${row.has_future_meeting?dateText(row.next_meeting_at):"אין"}</td><td><div class="lead-action-cell"><span class="lead-status status-${escapeHtml(row.lead_status||"new")}">${escapeHtml(statusLabels[row.lead_status]||"חדש")}</span><button class="lead-action-button" type="button" data-lead-id="${escapeHtml(row.lead_id)}" data-lead-name="${escapeHtml(row.lead_name||row.customer_name||"ליד")}" data-status="${escapeHtml(row.lead_status||"appointment_set")}" data-note="${escapeHtml(row.follow_up_note||"")}">פעולות</button></div></td></tr>`,7);
    document.querySelectorAll(".lead-action-button").forEach(button=>button.addEventListener("click",()=>openLeadAction(button)));
    set("marketing-updated",`עודכן ${new Intl.DateTimeFormat("he-IL",{dateStyle:"short",timeStyle:"medium"}).format(new Date())}`);
  }

  async function load(){if(errorBox)errorBox.hidden=true;ensureMonthlyChartsSection();ensureActionModal();try{const [reportResult,monthlyResult]=await Promise.all([client.rpc("get_marketing_conversion_report"),client.rpc("get_marketing_monthly_performance")]);if(reportResult.error)throw reportResult.error;if(monthlyResult.error)throw monthlyResult.error;render(reportResult.data?.report||reportResult.data||{});renderMonthly((monthlyResult.data?.report||monthlyResult.data||{}).months||[]);}catch(error){console.error(error);if(errorBox){errorBox.textContent=`שגיאה בטעינת דו״ח השיווק: ${error.message}`;errorBox.hidden=false;}}}
  window.addEventListener("load",load);window.addEventListener("focus",load);document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
})();