/**
 * GET /api/data
 *
 * Pulls every account listed in config/accounts.js, normalizes the rows into
 * one shape, and returns them as JSON. Tokens are read from environment
 * variables and never leave this function.
 *
 * Caching: the response is cached at the CDN edge for an hour, and stale
 * copies are served for up to a day while a fresh one is fetched in the
 * background. So visitors get an instant page, and the ad platforms get
 * called roughly once an hour no matter how much traffic you have.
 *
 * Add ?refresh=1 to bypass the cache and force a live pull.
 */

import accounts from "../config/accounts.js";
import { fetchMeta, metaStats } from "../lib/meta.js";
import { fetchGoogle } from "../lib/google.js";

const FETCHERS = { Meta: fetchMeta, Google: fetchGoogle };

/**
 * How many accounts to pull at the same time. Meta rate-limits per app, so
 * firing every account at once is the fastest way to trip code 4. Two is a
 * safe default; raise it only if you are well under quota.
 */
const CONCURRENCY = Math.max(1, parseInt(process.env.FETCH_CONCURRENCY || "2", 10));

/**
 * Vercel kills a function at this many seconds. A throttled ad-level pull can
 * take a while, so give it room. Hobby plans cap lower than Pro — if you see
 * 504s, reduce LOOKBACK_DAYS or META_LEVEL rather than raising this.
 */
export const maxDuration = 60;

/** Run jobs with a fixed concurrency limit, never rejecting. */
async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

const iso = (d) => d.toISOString().slice(0, 10);

export default async function handler(req, res) {
  const refresh = "refresh" in (req.query || {});
  const lookback = Math.min(parseInt(process.env.LOOKBACK_DAYS || "120", 10), 365);

  const until = new Date();
  const since = new Date(until.getTime() - (lookback - 1) * 86400000);

  const settled = await pool(accounts, CONCURRENCY, (acct) => {
    const fetcher = FETCHERS[acct.platform];
    if (!fetcher) throw new Error(`No connector for platform "${acct.platform}"`);
    return fetcher(acct, iso(since), iso(until));
  });

  const rows = [];
  const errors = [];

  settled.forEach((result, i) => {
    const acct = accounts[i];
    if (result.status === "fulfilled") {
      rows.push(...result.value);
    } else {
      // One broken account should not blank out the whole dashboard.
      errors.push({
        account: acct.account,
        client: acct.client,
        message: String(result.reason?.message || result.reason),
      });
    }
  });

  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  rows.forEach((r, i) => (r.id = i));

  if (refresh) {
    res.setHeader("Cache-Control", "no-store");
  } else {
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  }

  res.status(200).json({
    rows,
    generatedAt: new Date().toISOString(),
    lookbackDays: lookback,
    accountsRequested: accounts.length,
    accountsFailed: errors.length,
    errors,
    // Useful when tuning rate limits: how many calls were made, how many had
    // to be retried, and how long was spent deliberately waiting.
    meta: metaStats(),
  });
}
