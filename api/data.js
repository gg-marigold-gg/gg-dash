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
import { fetchMeta } from "../lib/meta.js";
import { fetchGoogle } from "../lib/google.js";

const FETCHERS = { Meta: fetchMeta, Google: fetchGoogle };

const iso = (d) => d.toISOString().slice(0, 10);

export default async function handler(req, res) {
  const refresh = "refresh" in (req.query || {});
  const lookback = Math.min(parseInt(process.env.LOOKBACK_DAYS || "120", 10), 365);

  const until = new Date();
  const since = new Date(until.getTime() - (lookback - 1) * 86400000);

  const jobs = accounts.map(async (acct) => {
    const fetcher = FETCHERS[acct.platform];
    if (!fetcher) throw new Error(`No connector for platform "${acct.platform}"`);
    return fetcher(acct, iso(since), iso(until));
  });

  const settled = await Promise.allSettled(jobs);

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
  });
}
