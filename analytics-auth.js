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

  client.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) {
      redirectToLogin();
      return;
    }
    activeUser.textContent = data.session.user?.email || "משתמש מחובר";
    checkView.hidden = true;
    appView.hidden = false;
  }).catch(redirectToLogin);

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) redirectToLogin();
    else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") activeUser.textContent = session.user?.email || "משתמש מחובר";
  });

  authAction.addEventListener("click", async () => {
    await client.auth.signOut();
    localStorage.removeItem("beautix-persisted-session");
    redirectToLogin();
  });
})();