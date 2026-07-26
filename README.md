# BeautiX Live Report

Live, authenticated financial report for BeautiX.

## Files

- `index.html` — fixed report structure and login screen
- `styles.css` — responsive RTL design
- `config.js` — Supabase project URL, publishable key, RPC name, refresh interval
- `app.js` — email/password login, report loading, 30-day forecast cards, auto refresh

## Required Supabase setup

The frontend calls this RPC after login:

```text
get_business_status_report
```

The RPC must:

1. Return the current report as JSON.
2. Be executable by the `authenticated` role.
3. Not be executable by the `anon` role.
4. Respect the intended data-access rules.

## Publish with GitHub Pages

In the repository:

1. Open **Settings**.
2. Open **Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`.
5. Click **Save**.

The site should become available at:

```text
https://maorlasri.github.io/beautix-live-report/
```

## Security

The repository contains only the Supabase publishable key. Never add a service-role key, database password, JWT secret, or another private credential.
