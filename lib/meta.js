/**
 * Meta Marketing API — daily campaign insights.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/insights
 */

const VERSION = process.env.META_API_VERSION || "v21.0";

/**
 * Meta returns conversions as an untyped array of {action_type, value}.
 * Which action_type carries your leads/purchases depends on how the pixel
 * and custom conversions were set up, so these are ordered preferences:
 * the first one present wins. Check a real response and adjust.
 */
const LEAD_ACTIONS = [
  "offsite_conversion.fct.lead",
  "lead",
  "onsite_conversion.lead_grouped",
  "leadgen.other",
];
const CONSULT_ACTIONS = [
  "offsite_conversion.fct.schedule",
  "schedule",
  "onsite_conversion.flow_complete",
];
const ORDER_ACTIONS = [
  "offsite_conversion.fct.purchase",
  "purchase",
  "onsite_web_purchase",
  "omni_purchase",
];
const SUBSCRIBE_ACTIONS = ["offsite_conversion.fct.subscribe", "subscribe", "start_trial"];

function pickAction(arr, preferences) {
  if (!Array.isArray(arr)) return 0;
  for (const type of preferences) {
    const hit = arr.find((a) => a.action_type === type);
    if (hit) return parseFloat(hit.value) || 0;
  }
  return 0;
}

/**
 * @param {object} acct   entry from config/accounts.js
 * @param {string} since  YYYY-MM-DD
 * @param {string} until  YYYY-MM-DD
 * @returns {Promise<Array>} normalized daily rows
 */
export async function fetchMeta(acct, since, until) {
  const token = process.env[acct.tokenEnv || "META_ACCESS_TOKEN"];
  if (!token) {
    throw new Error(`Missing ${acct.tokenEnv || "META_ACCESS_TOKEN"} in environment`);
  }

  const id = String(acct.id).startsWith("act_") ? acct.id : `act_${acct.id}`;
  const params = new URLSearchParams({
    level: "campaign",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    fields: [
      "date_start",
      "campaign_name",
      "spend",
      "impressions",
      "clicks",
      "inline_link_clicks",
      "actions",
      "action_values",
    ].join(","),
    limit: "500",
    access_token: token,
  });

  let url = `https://graph.facebook.com/${VERSION}/${id}/insights?${params}`;
  const rows = [];
  let pages = 0;

  while (url && pages < 60) {
    const res = await fetch(url);
    const body = await res.json();

    if (!res.ok || body.error) {
      const e = body.error || {};
      throw new Error(`Meta ${id}: ${e.message || res.statusText} (code ${e.code ?? res.status})`);
    }

    for (const r of body.data || []) {
      const actions = r.actions;
      const values = r.action_values;
      const orders =
        pickAction(actions, ORDER_ACTIONS) || pickAction(actions, SUBSCRIBE_ACTIONS);

      rows.push({
        date: r.date_start,
        client: acct.client,
        account: acct.account,
        platform: "Meta",
        campaign: r.campaign_name || "—",
        spend: parseFloat(r.spend) || 0,
        impressions: parseInt(r.impressions, 10) || 0,
        // Link clicks track intent better than all clicks (which include
        // reactions and profile taps). Swap to r.clicks if you prefer.
        clicks: parseInt(r.inline_link_clicks ?? r.clicks, 10) || 0,
        leads: pickAction(actions, LEAD_ACTIONS),
        consults: pickAction(actions, CONSULT_ACTIONS),
        orders,
        revenue:
          pickAction(values, ORDER_ACTIONS) || pickAction(values, SUBSCRIBE_ACTIONS),
      });
    }

    url = body.paging?.next || null;
    pages++;
  }

  return rows;
}
