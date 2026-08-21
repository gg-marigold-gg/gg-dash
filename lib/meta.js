/**
 * Meta Marketing API — daily insights, rate-limit aware.
 *
 * Meta throttles per app, not per account. Asking for 120 days of ad-level
 * data across a dozen accounts at once reliably trips it. This module:
 *   - splits long date ranges into smaller windows
 *   - retries transient failures with exponential backoff
 *   - reads Meta's own usage headers and slows down before being cut off
 *
 * Error codes worth knowing:
 *   1   unknown / usually a query too heavy to complete
 *   2   service temporarily unavailable
 *   4   app-level call limit reached
 *   17  per-user call limit reached
 *   613 custom rate limit
 */

const VERSION = process.env.META_API_VERSION || "v21.0";

/** "campaign", "adset", or "ad". Lower levels mean far more rows. */
const LEVEL = process.env.META_LEVEL || "ad";

/**
 * What an ad name links to:
 *   "preview"     shareable ad preview — viewable without ad account access
 *   "post"        the public Facebook post, when the ad is a real page post
 *   "adsmanager"  Ads Manager, filtered to that ad (needs account access)
 *
 * "preview" falls back to "post", then to Ads Manager, whenever a link is
 * unavailable — so you always get something clickable.
 */
const LINK_MODE = process.env.META_LINK_MODE || "preview";

/** Days per request. Smaller windows are lighter and less likely to fail. */
const CHUNK_DAYS = Math.max(1, parseInt(process.env.META_CHUNK_DAYS || "30", 10));

const MAX_ATTEMPTS = 5;
const RETRYABLE = new Set([1, 2, 4, 17, 32, 341, 613]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
 * Meta reports how much of your quota you have burned on every response.
 * Slow down as it climbs rather than waiting to be blocked.
 */
function usagePauseMs(res) {
  const parse = (h) => {
    try {
      return h ? JSON.parse(h) : null;
    } catch {
      return null;
    }
  };

  let worst = 0;

  const app = parse(res.headers.get("x-app-usage"));
  if (app) {
    worst = Math.max(worst, app.call_count || 0, app.total_cputime || 0, app.total_time || 0);
  }

  const buc = parse(res.headers.get("x-business-use-case-usage"));
  if (buc) {
    for (const entries of Object.values(buc)) {
      for (const e of entries || []) {
        // Meta tells us outright how long until access returns.
        if (e.estimated_time_to_regain_access) {
          return Math.min(e.estimated_time_to_regain_access * 60_000, 120_000);
        }
        worst = Math.max(worst, e.call_count || 0, e.total_cputime || 0, e.total_time || 0);
      }
    }
  }

  if (worst >= 95) return 60_000;
  if (worst >= 75) return 15_000;
  if (worst >= 50) return 3_000;
  return 0;
}

const stats = { requests: 0, retries: 0, throttledMs: 0 };

async function getJson(url, label) {
  for (let attempt = 0; ; attempt++) {
    stats.requests++;
    const res = await fetch(url);

    let body;
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    const err = body?.error;
    const pause = usagePauseMs(res);

    if (!res.ok || err) {
      const code = err?.code;
      if (RETRYABLE.has(code) && attempt < MAX_ATTEMPTS) {
        stats.retries++;
        // Exponential backoff with jitter, never shorter than what the usage
        // headers are asking for.
        const backoff = Math.min(60_000, 2_000 * 2 ** attempt) + Math.random() * 1_000;
        const wait = Math.max(backoff, pause);
        stats.throttledMs += wait;
        await sleep(wait);
        continue;
      }
      throw new Error(
        `${label}: ${err?.message || res.statusText} (code ${code ?? res.status}` +
          (attempt ? `, after ${attempt} retries` : "") +
          ")"
      );
    }

    if (pause) {
      stats.throttledMs += pause;
      await sleep(pause);
    }
    return body;
  }
}

/**
 * Insights does not return creative details, so look them up separately.
 * Batched 50 ads per call and cached for the life of the invocation, which
 * keeps this to a handful of extra requests per sync.
 */
const linkCache = new Map();

async function fetchAdLinks(adIds, token) {
  const missing = adIds.filter((id) => id && !linkCache.has(id));

  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50);
    const params = new URLSearchParams({
      ids: batch.join(","),
      fields: "preview_shareable_link,creative{effective_object_story_id}",
      access_token: token,
    });

    let body;
    try {
      body = await getJson(`https://graph.facebook.com/${VERSION}/?${params}`, "Meta ad links");
    } catch {
      // Creative lookups are a nice-to-have. If they fail, fall back to
      // Ads Manager links rather than failing the whole account.
      batch.forEach((id) => linkCache.set(id, {}));
      continue;
    }

    for (const id of batch) {
      const entry = body?.[id] || {};
      const storyId = entry.creative?.effective_object_story_id;
      let postUrl = null;
      if (storyId && storyId.includes("_")) {
        const [pageId, postId] = storyId.split("_");
        // Dark posts (never published to the page) will 404 here for anyone
        // who is not a page admin. Nothing we can do about that.
        postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
      }
      linkCache.set(id, { preview: entry.preview_shareable_link || null, post: postUrl });
    }
  }

  return linkCache;
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

/** Split a date range into windows of at most CHUNK_DAYS. */
function windows(since, until) {
  const out = [];
  let cursor = new Date(since + "T00:00:00Z");
  const end = new Date(until + "T00:00:00Z");
  while (cursor <= end) {
    const stop = addDays(cursor, CHUNK_DAYS - 1);
    out.push({ since: iso(cursor), until: iso(stop > end ? end : stop) });
    cursor = addDays(stop, 1);
  }
  return out;
}

export async function fetchMeta(acct, since, until) {
  const token = process.env[acct.tokenEnv || "META_ACCESS_TOKEN"];
  if (!token) {
    throw new Error(`Missing ${acct.tokenEnv || "META_ACCESS_TOKEN"} in environment`);
  }

  const id = String(acct.id).startsWith("act_") ? acct.id : `act_${acct.id}`;
  const numericId = id.replace("act_", "");
  const rows = [];

  const fields = [
    "date_start",
    "campaign_name",
    "campaign_id",
    ...(LEVEL === "adset" || LEVEL === "ad" ? ["adset_name", "adset_id"] : []),
    ...(LEVEL === "ad" ? ["ad_name", "ad_id"] : []),
    "spend",
    "impressions",
    "clicks",
    "inline_link_clicks",
    "actions",
    "action_values",
  ].join(",");

  // Windows run one after another, never in parallel — parallel requests to
  // the same app are exactly what triggers code 4.
  for (const w of windows(since, until)) {
    const params = new URLSearchParams({
      level: LEVEL,
      time_increment: "1",
      time_range: JSON.stringify({ since: w.since, until: w.until }),
      fields,
      limit: "500",
      access_token: token,
    });

    let url = `https://graph.facebook.com/${VERSION}/${id}/insights?${params}`;
    let pages = 0;

    while (url && pages < 100) {
      const body = await getJson(url, `Meta ${id} ${w.since}→${w.until}`);

      for (const r of body.data || []) {
        const actions = r.actions;
        const values = r.action_values;
        const orders =
          pickAction(actions, ORDER_ACTIONS) || pickAction(actions, SUBSCRIBE_ACTIONS);

        // Ads Manager link is the baseline; public links get attached below.
        const url_ = r.ad_id
          ? `https://business.facebook.com/adsmanager/manage/ads?act=${numericId}&selected_ad_ids=${r.ad_id}`
          : r.adset_id
          ? `https://business.facebook.com/adsmanager/manage/adsets?act=${numericId}&selected_adset_ids=${r.adset_id}`
          : null;

        rows.push({
          date: r.date_start,
          client: acct.client,
          account: acct.account,
          platform: "Meta",
          campaign: r.campaign_name || "—",
          adset: r.adset_name || "—",
          ad: r.ad_name || "—",
          adId: r.ad_id || null,
          url: url_,
          spend: parseFloat(r.spend) || 0,
          impressions: parseInt(r.impressions, 10) || 0,
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
  }

  // Swap in public links where we can get them.
  if (LEVEL === "ad" && LINK_MODE !== "adsmanager") {
    const ids = [...new Set(rows.map((r) => r.adId).filter(Boolean))];
    if (ids.length) {
      const links = await fetchAdLinks(ids, token);
      for (const r of rows) {
        const l = links.get(r.adId) || {};
        const preferred = LINK_MODE === "post" ? l.post || l.preview : l.preview || l.post;
        if (preferred) r.url = preferred;
      }
    }
  }

  return rows;
}

/** Diagnostics for the current invocation, surfaced in the API response. */
export function metaStats() {
  return { ...stats };
}
