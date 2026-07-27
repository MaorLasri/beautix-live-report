(() => {
  const config = window.BEAUTIX_CONFIG;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  const checkView = document.getElementById("analytics-auth-check");
  const appView = document.getElementById("analytics-app");
  const logoutButton = document.getElementById("analytics-logout");

  function redirectToLogin() {
    window.location.replace("./");
  }

  client.auth.getSession().then(({ data, error }) => {
    if (error || !data.session) {
      redirectToLogin();
      return;
    }
    checkView.hidden = true;
    appView.hidden = false;
  }).catch(redirectToLogin);

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) redirectToLogin();
  });

  logoutButton.addEventListener("click", async () => {
    await client.auth.signOut();
    redirectToLogin();
  });
})();
