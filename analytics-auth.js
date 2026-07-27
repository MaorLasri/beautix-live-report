(() => {
  const config = window.BEAUTIX_CONFIG;
  const rememberPreference = localStorage.getItem("beautix-remember-device") === "true";
  const storage = rememberPreference ? window.localStorage : window.sessionStorage;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: true, storage, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const checkView = document.getElementById("analytics-auth-check");
  const appView = document.getElementById("analytics-app");
  const authAction = document.getElementById("analytics-auth-action");
  const activeUser = document.getElementById("analytics-active-user");
  const profileRole = document.getElementById("analytics-profile-role");
  const profileMenuButton = document.getElementById("analytics-profile-menu-button");
  const profileMenu = document.getElementById("analytics-profile-menu");
  const profileAvatar = document.getElementById("analytics-profile-avatar");
  const profileAvatarFallback = document.getElementById("analytics-profile-avatar-fallback");
  const editProfileAction = document.getElementById("analytics-edit-profile-action");
  const changePasswordAction = document.getElementById("analytics-change-password-action");
  const sessionAction = document.getElementById("analytics-session-action");
  const refreshBtn = document.getElementById("analytics-refresh-btn");

  function redirectToLogin() {
    window.location.replace("./");
  }

  function closeProfileMenu(){
    profileMenu.hidden=true;
    profileMenuButton.setAttribute("aria-expanded","false");
  }

  function toggleProfileMenu(){
    const open=profileMenu.hidden;
    profileMenu.hidden=!open;
    profileMenuButton.setAttribute("aria-expanded",String(open));
  }

  async function updateActiveUser(session) {
    const fallback = session?.user?.email || "משתמש מחובר";
    const userId = session?.user?.id;
    let profile={display_name:fallback,role:"viewer",avatar_path:null,is_active:true};
    if(userId){
      try {
        const { data, error } = await client
          .from("app_users")
          .select("display_name,role,avatar_path,is_active")
          .eq("auth_user_id", userId)
          .maybeSingle();
        if (error) throw error;
        if(data) profile={...profile,...data};
      } catch (error) {
        console.warn("Unable to load user profile", error);
      }
    }
    activeUser.textContent = profile.is_active===false ? "משתמש לא פעיל" : profile.display_name?.trim() || fallback;
    profileRole.textContent = profile.role || "viewer";
    profileAvatar.hidden=true;
    profileAvatarFallback.hidden=false;
    if(profile.avatar_path){
      try{
        const {data,error}=await client.storage.from("avatars").createSignedUrl(profile.avatar_path,3600);
        if(error) throw error;
        profileAvatar.src=data.signedUrl;
        profileAvatar.hidden=false;
        profileAvatarFallback.hidden=true;
      }catch(error){
        console.warn("Unable to load avatar",error);
      }
    }
  }

  client.auth.getSession().then(async ({ data, error }) => {
    if (error || !data.session) {
      redirectToLogin();
      return;
    }
    await updateActiveUser(data.session);
    checkView.hidden = true;
    appView.hidden = false;
  }).catch(redirectToLogin);

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) redirectToLogin();
    else if (["SIGNED_IN","TOKEN_REFRESHED","USER_UPDATED"].includes(event)) updateActiveUser(session);
  });

  authAction.addEventListener("click", async () => {
    closeProfileMenu();
    await client.auth.signOut();
    localStorage.removeItem("beautix-persisted-session");
    redirectToLogin();
  });

  profileMenuButton.addEventListener("click",toggleProfileMenu);
  document.addEventListener("click",(event)=>{if(!event.target.closest(".profile-menu-wrap")) closeProfileMenu();});
  document.addEventListener("keydown",(event)=>{if(event.key==="Escape") closeProfileMenu();});
  editProfileAction.addEventListener("click",()=>{closeProfileMenu();alert("עריכת פרופיל תתווסף במסך נפרד בשלב הבא.");});
  changePasswordAction.addEventListener("click",()=>{closeProfileMenu();window.location.href="./#password-recovery";});
  sessionAction.addEventListener("click",async()=>{sessionAction.disabled=true;try{const {data,error}=await client.auth.refreshSession();if(error) throw error;if(data.session) await updateActiveUser(data.session);closeProfileMenu();}catch(error){alert(`רענון ההתחברות נכשל: ${error.message}`);}finally{sessionAction.disabled=false;}});
  refreshBtn.addEventListener("click",()=>window.location.reload());
})();