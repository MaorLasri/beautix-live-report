(() => {
  const config=window.BEAUTIX_CONFIG;
  const rememberPreference=localStorage.getItem("beautix-remember-device")==="true";
  const storage=rememberPreference?window.localStorage:window.sessionStorage;
  const client=window.supabase.createClient(config.supabaseUrl,config.supabasePublishableKey,{auth:{persistSession:true,storage,autoRefreshToken:true,detectSessionInUrl:true}});
  const checkView=document.getElementById("analytics-auth-check"),appView=document.getElementById("analytics-app");
  let shell=null;
  const redirectToLogin=()=>window.location.replace("./");
  const refreshPage=()=>window.location.reload();
  client.auth.getSession().then(async({data,error})=>{
    if(error||!data.session){redirectToLogin();return;}
    shell=window.BeautiXSiteShell.create({client,refresh:refreshPage,onSignedOut:redirectToLogin});
    await shell.renderProfile(data.session);
    checkView.hidden=true;
    appView.hidden=false;
  }).catch(redirectToLogin);
  client.auth.onAuthStateChange((event,session)=>{
    if(event==="SIGNED_OUT"||!session)redirectToLogin();
    else if(["SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED"].includes(event))shell?.renderProfile(session);
  });
})();
