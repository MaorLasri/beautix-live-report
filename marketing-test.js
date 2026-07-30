(() => {
  const config=window.BEAUTIX_CONFIG;
  const rememberPreference=localStorage.getItem("beautix-remember-device")==="true";
  const storage=rememberPreference?window.localStorage:window.sessionStorage;
  const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,storage,autoRefreshToken:true,detectSessionInUrl:true}});
  const money=value=>new Intl.NumberFormat("he-IL",{style:"currency",currency:"ILS",maximumFractionDigits:0}).format(Number(value||0));
  const number=value=>new Intl.NumberFormat("he-IL",{maximumFractionDigits:1}).format(Number(value||0));
  const dateText=value=>value?new Intl.DateTimeFormat("he-IL").format(new Date(`${String(value).slice(0,10)}T00:00:00`)):"—";
  const set=(id,value)=>{const element=document.getElementById(id);if(element)element.textContent=value;};
  const escapeHtml=value=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const errorBox=document.getElementById("marketing-error");

  function renderRows(targetId,rows,renderer,colspan){
    const target=document.getElementById(targetId);
    if(!target)return;
    target.innerHTML=rows.length?rows.map(renderer).join(""):`<tr><td class="empty-row" colspan="${colspan}">אין נתונים</td></tr>`;
  }

  function render(report){
    const summary=report.summary||{};
    set("m-total-leads",number(summary.total_leads));
    set("m-phone-coverage",`${number(summary.leads_with_phone)} עם מספר טלפון`);
    set("m-matched",number(summary.matched_customers));
    set("m-match-rate",`${number(summary.lead_to_customer_pct)}% מהלידים`);
    set("m-visitors",number(summary.ever_visited));
    set("m-visit-rate",`${number(summary.lead_to_visit_pct)}% מהלידים`);
    set("m-paying",number(summary.paying_customers));
    set("m-paying-rate",`${number(summary.lead_to_paying_pct)}% מהלידים`);
    set("m-attributed-sales",money(summary.attributed_sales));
    set("m-never-visited",number(summary.matched_never_visited));
    set("m-customers-total",number(summary.customers_total));
    set("m-customers-never",number(summary.customers_never_visited));
    set("m-future-meetings",number(summary.customers_with_future_meeting));
    set("m-debtors-count",number(summary.debtors_count));
    set("m-debt-total",`סה״כ ${money(summary.customer_debt_total)}`);

    renderRows("campaign-table",report.campaigns||[],row=>`<tr><td>${escapeHtml(row.campaign_name||"—")}</td><td>${number(row.leads)}</td><td>${number(row.matched_customers)}</td><td>${number(row.paying_customers)}</td><td>${money(row.attributed_sales)}</td></tr>`,5);
    renderRows("debtors-table",report.debtors||[],row=>`<tr><td>${escapeHtml(row.customer_name||"—")}</td><td dir="ltr">${escapeHtml(row.phone||"—")}</td><td>${money(Math.abs(Number(row.balance||0)))}</td><td>${number(row.history_meetings_count)}</td></tr>`,4);
    renderRows("never-visited-table",report.never_visited||[],row=>`<tr><td>${escapeHtml(row.lead_name||"—")}</td><td dir="ltr">${escapeHtml(row.phone||"—")}</td><td>${escapeHtml(row.campaign_name||"—")}</td><td>${dateText(row.lead_date)}</td><td>${escapeHtml(row.customer_name||"—")}</td><td>${row.has_future_meeting?dateText(row.next_meeting_at):"אין"}</td></tr>`,6);
    set("marketing-updated",`עודכן ${new Intl.DateTimeFormat("he-IL",{dateStyle:"short",timeStyle:"medium"}).format(new Date())}`);
  }

  async function load(){
    if(errorBox)errorBox.hidden=true;
    try{
      const {data,error}=await client.rpc("get_marketing_conversion_report");
      if(error)throw error;
      render(data?.report||data||{});
    }catch(error){
      console.error(error);
      if(errorBox){errorBox.textContent=`שגיאה בטעינת דו״ח השיווק: ${error.message}`;errorBox.hidden=false;}
    }
  }

  window.addEventListener("load",load);
  window.addEventListener("focus",load);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
})();