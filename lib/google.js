/**
 * Google Ads API — daily campaign metrics via GAQL.
 *
 * Docs: https://developers.google.com/google-ads/api/docs/query/overview
 *
 * Google needs more pieces than Meta: an OAuth client, a refresh token, and a
 * developer token that Google must approve before it works on live accounts.
 */

const VERSION = process.env.GOOGLE_ADS_API_VERSION || "v18";

let cachedToken = null; // { value, expiresAt }

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Google OAuth: ${body.error_description || body.error || res.statusText}`);
  }

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in || 3600) * 1000,
  };
  return cachedToken.value;
}

const digits = (s) => String(s).replace(/\D/g, "");

/**
 * @param {object} acct   entry from config/accounts.js
 * @param {string} since  YYYY-MM-DD
 * @param {string} until  YYYY-MM-DD
 */
export async function fetchGoogle(acct, since, until) {
  const devToken = process.env.GOOGLE_DEVELOPER_TOKEN;
  if (!devToken) throw new Error("Missing GOOGLE_DEVELOPER_TOKEN in environment");

  const accessToken = await getAccessToken();
  const customerId = digits(acct.id);

  const query = `
    SELECT
      segments.date,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND metrics.impressions > 0
  `;

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": devToken,
    "Content-Type": "application/json",
  };
  if (acct.loginCustomerId) headers["login-customer-id"] = digits(acct.loginCustomerId);

  const res = await fetch(
    `https://googleads.googleapis.com/${VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: "POST", headers, body: JSON.stringify({ query }) }
  );

  const body = await res.json();
  if (!res.ok) {
    const err = Array.isArray(body) ? body[0]?.error : body.error;
    throw new Error(`Google ${acct.id}: ${err?.message || res.statusText}`);
  }

  // searchStream returns an array of chunks, each holding a results array.
  const chunks = Array.isArray(body) ? body : [body];
  const rows = [];

  for (const chunk of chunks) {
    for (const r of chunk.results || []) {
      const m = r.metrics || {};
      // Google reports one blended conversion count unless you segment by
      // conversion action. See README for splitting leads from orders.
      const conversions = parseFloat(m.conversions) || 0;

      rows.push({
        date: r.segments?.date,
        client: acct.client,
        account: acct.account,
        platform: "Google",
        campaign: r.campaign?.name || "—",
        spend: (parseInt(m.costMicros, 10) || 0) / 1_000_000,
        impressions: parseInt(m.impressions, 10) || 0,
        clicks: parseInt(m.clicks, 10) || 0,
        leads: conversions,
        consults: 0,
        orders: conversions,
        revenue: parseFloat(m.conversionsValue) || 0,
      });
    }
  }

  return rows;
}
