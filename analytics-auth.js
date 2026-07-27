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

  function redirectToLogin() {
    window.location.replace("./");
  }

  async function resolveDisplayName(session) {
    const fallback = session?.user?.email || "משתמש מחובר";
    const userId = session?.user?.id;
    if (!userId) return fallback;
    try {
      const { data, error } = await client
        .from("app_users")
        .select("display_name,is_active")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (data?.is_active === false) return "משתמש לא פעיל";
      return data?.display_name?.trim() || fallback;
    } catch (error) {
      console.warn("Unable to load user profile", error);
      return fallback;
    }
  }

  async function updateActiveUser(session) {
    activeUser.textContent = await resolveDisplayName(session);
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
    else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") updateActiveUser(session);
  });

  authAction.addEventListener("click", async () => {
    await client.auth.signOut();
    localStorage.removeItem("beautix-persisted-session");
    redirectToLogin();
  });
})();