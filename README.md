# Performance Console — live data version

Same dashboard, but it pulls from Meta and Google Ads on its own instead of waiting for a CSV.

## How it works

```
Browser  ──GET /api/data──▶  Serverless function  ──▶  Meta Marketing API
(no tokens here)             (tokens live here)    ──▶  Google Ads API
```

The browser never sees a token. It only ever receives finished numbers.

The response is cached at the edge for an hour, and stale copies are served for
up to a day while a fresh one loads in the background. So the page is instant for
visitors, and the ad platforms get called about once an hour regardless of how
many people are looking. The **Refresh** button forces a live pull.

If the API is unreachable — you haven't deployed it yet, or every account failed —
the page falls back to sample data and the CSV importer keeps working. If *some*
accounts fail, the rest still load and a banner names the ones that broke.

## What you need before any of this works

This is the slow part. Budget days, not hours, mostly waiting on approvals.

### Meta

1. A **Meta Business Manager** account for your agency.
2. Each client grants your business **partner access** to their ad account with
   at least the Analyst role. They do this from their own Business Manager —
   you cannot do it for them.
3. In Business Settings → Users → **System Users**, create a system user, assign
   it to the ad accounts, and generate a token with the **`ads_read`** permission.
   System user tokens do not expire, which is what you want for a server.
4. Your app needs Advanced Access to `ads_read`, which requires business
   verification. Development mode works on accounts you own while you build.

Put the token in `META_ACCESS_TOKEN`. If different clients sit under different
business managers, generate one token each and point to it with `tokenEnv` in
`config/accounts.js`.

### Google Ads

Heavier. Four separate credentials:

1. **Developer token** — request from your Google Ads manager (MCC) account under
   Tools → API Center. It starts in test mode and only works against test
   accounts until Google approves it for basic access. Approval takes days and
   they ask what you're building.
2. **OAuth client** — create one in Google Cloud Console (type: Desktop app).
   Gives you `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
3. **Refresh token** — generate once by authorizing that OAuth client against the
   Google account that can see the ad accounts. Google's OAuth Playground is the
   usual way; scope is `https://www.googleapis.com/auth/adwords`.
4. **Login customer ID** — your MCC account ID, set per account in
   `config/accounts.js`.

## Adding your accounts

Edit `config/accounts.js`. One entry per ad account, tagged with the client it
belongs to. That mapping is what powers the client filter in the dashboard.
No secrets go in this file, so it is safe to commit.

## Deploying

```bash
npm install
npm run build     # confirms it compiles
```

Push to a GitHub repo, then import it at vercel.com. Vercel serves the page and
runs `api/data.js` as a function automatically — no configuration needed.

Then add every variable from `.env.example` under
**Project → Settings → Environment Variables** and redeploy.

To run locally with the API working, use `npx vercel dev` rather than `npm run dev`
— plain Vite serves the page but not the `/api` folder.

## Two things that will bite you

**Conversion mapping.** Meta returns conversions as an untyped list, and the
action names depend on how each client's pixel was set up. `lib/meta.js` has an
ordered preference list per metric; pull one real response, see what action types
actually appear, and reorder. Google is worse: it reports one blended
`conversions` number, so leads and orders currently get the same value. To split
them, add `segments.conversion_action_name` to the GAQL query in `lib/google.js`
and bucket by name.

**Put a login on it.** The moment real client numbers load automatically, that URL
exposes every client's performance to anyone who has it. Cloudflare Access or
Vercel's password protection both handle this; check current pricing since plans
change. If clients get their own logins, the filtering has to happen server-side
in `api/data.js` based on who is signed in — the filters in the React page are
convenience, not security, and can be bypassed in devtools.

## Adding another platform

Write a function with the same signature as `fetchMeta` — takes an account entry
plus a date range, returns rows shaped
`{date, client, account, platform, campaign, spend, impressions, clicks, leads, consults, orders, revenue}` —
then register it in the `FETCHERS` map in `api/data.js`. TikTok, LinkedIn, and
Bing all fit this pattern.
# gg-dash
