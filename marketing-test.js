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
  const errorBox=document.getElementById("marketing-error");

  function renderRows(targetId,rows,renderer,colspan){
    const target=document.getElementById(targetId);
    if(!target)return;
    target.innerHTML=rows.length?rows.map(renderer).join(""):`<tr><td class="empty-row" colspan="${colspan}">אין נתונים</td></tr>`;
  }

  function ensureMonthlyChartsSection(){
    if(document.getElementById("monthly-performance-section"))return;
    const sections=document.querySelectorAll("main.site-content > section.dashboard-section");
    const first=sections[0];
    if(!first)return;
    const section=document.createElement("section");
    section.id="monthly-performance-section";
    section.className="dashboard-section";
    section.innerHTML=`
      <div class="section-title-block"><span class="section-kicker">מגמה חודשית</span><h2>ביצועי לידים והמרה לפי חודש</h2><p>שלושה מבטים משלימים: כמות לידים, שיעורי המרה והכנסה מיוחסת.</p></div>
      <div class="monthly-chart-grid">
        <article class="chart-card"><div class="chart-card-head"><div><span>לידים לפי חודש</span><strong id="monthly-leads-total">—</strong></div><small>כמות לידים חדשים</small></div><div id="monthly-leads-chart" class="chart-stage"></div></article>
        <article class="chart-card"><div class="chart-card-head"><div><span>שיעורי המרה</span><strong id="monthly-best-conversion">—</strong></div><small>ליד → לקוח וליד → משלם</small></div><div id="monthly-conversion-chart" class="chart-stage"></div><div class="chart-legend"><span><i class="legend-purple"></i>ללקוח</span><span><i class="legend-pink"></i>למשלם</span></div></article>
        <article class="chart-card"><div class="chart-card-head"><div><span>הכנסה מיוחסת</span><strong id="monthly-attributed-sales">—</strong></div><small>לפי חודש יצירת הליד</small></div><div id="monthly-sales-chart" class="chart-stage"></div></article>
      </div>`;
    first.insertAdjacentElement("afterend",section);
  }

  function barChart(rows,valueKey,formatter){
    if(!rows.length)return '<div class="chart-empty">אין נתונים</div>';
    const width=640,height=230,pad={top:22,right:12,bottom:48,left:12};
    const innerW=width-pad.left-pad.right,innerH=height-pad.top-pad.bottom;
    const max=Math.max(...rows.map(row=>Number(row[valueKey]||0)),1);
    const slot=innerW/rows.length,barW=Math.min(46,slot*.58);
    const bars=rows.map((row,index)=>{
      const value=Number(row[valueKey]||0),h=(value/max)*innerH;
      const x=pad.left+index*slot+(slot-barW)/2,y=pad.top+innerH-h;
      return `<g><rect class="chart-bar" x="${x}" y="${y}" width="${barW}" height="${Math.max(h,2)}" rx="8"><title>${monthText(row.month_start)}: ${formatter(value)}</title></rect><text class="chart-value" x="${x+barW/2}" y="${Math.max(y-7,12)}" text-anchor="middle">${formatter(value)}</text><text class="chart-label" x="${x+barW/2}" y="${height-18}" text-anchor="middle">${monthText(row.month_start)}</text></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="גרף חודשי">${bars}</svg>`;
  }

  function lineChart(rows){
    if(!rows.length)return '<div class="chart-empty">אין נתונים</div>';
    const width=640,height=230,pad={top:24,right:18,bottom:48,left:18};
    const innerW=width-pad.left-pad.right,innerH=height-pad.top-pad.bottom;
    const max=Math.max(...rows.flatMap(row=>[Number(row.lead_to_customer_pct||0),Number(row.lead_to_paying_pct||0)]),10);
    const x=index=>pad.left+(rows.length===1?innerW/2:index*(innerW/(rows.length-1)));
    const y=value=>pad.top+innerH-(Number(value||0)/max)*innerH;
    const pathFor=key=>rows.map((row,index)=>`${index===0?"M":"L"}${x(index)},${y(row[key])}`).join(" ");
    const labels=rows.map((row,index)=>`<text class="chart-label" x="${x(index)}" y="${height-18}" text-anchor="middle">${monthText(row.month_start)}</text>`).join("");
    const points=(key,css)=>rows.map((row,index)=>`<circle class="${css}" cx="${x(index)}" cy="${y(row[key])}" r="5"><title>${monthText(row.month_start)}: ${number(row[key])}%</title></circle>`).join("");
    return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="גרף שיעורי המרה"><path class="chart-line-purple" d="${pathFor("lead_to_customer_pct")}"/><path class="chart-line-pink" d="${pathFor("lead_to_paying_pct")}"/>${points("lead_to_customer_pct","chart-point-purple")}${points("lead_to_paying_pct","chart-point-pink")}${labels}</svg>`;
  }

  function renderMonthly(months){
    const rows=(months||[]).slice(-12);
    set("monthly-leads-total",number(rows.reduce((sum,row)=>sum+Number(row.leads||0),0)));
    const best=rows.reduce((max,row)=>Math.max(max,Number(row.lead_to_customer_pct||0)),0);
    set("monthly-best-conversion",`${number(best)}%`);
    set("monthly-attributed-sales",money(rows.reduce((sum,row)=>sum+Number(row.attributed_sales||0),0)));
    const leads=document.getElementById("monthly-leads-chart");
    const conversion=document.getElementById("monthly-conversion-chart");
    const sales=document.getElementById("monthly-sales-chart");
    if(leads)leads.innerHTML=barChart(rows,"leads",value=>number(value));
    if(conversion)conversion.innerHTML=lineChart(rows);
    if(sales)sales.innerHTML=barChart(rows,"attributed_sales",value=>money(value));
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
    ensureMonthlyChartsSection();
    try{
      const [reportResult,monthlyResult]=await Promise.all([
        client.rpc("get_marketing_conversion_report"),
        client.rpc("get_marketing_monthly_performance")
      ]);
      if(reportResult.error)throw reportResult.error;
      if(monthlyResult.error)throw monthlyResult.error;
      render(reportResult.data?.report||reportResult.data||{});
      renderMonthly((monthlyResult.data?.report||monthlyResult.data||{}).months||[]);
    }catch(error){
      console.error(error);
      if(errorBox){errorBox.textContent=`שגיאה בטעינת דו״ח השיווק: ${error.message}`;errorBox.hidden=false;}
    }
  }

  window.addEventListener("load",load);
  window.addEventListener("focus",load);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)load();});
})();