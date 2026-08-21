/**
 * Which ad accounts to pull, and which client each one belongs to.
 *
 * This file contains NO secrets — only IDs and labels. It is safe to commit.
 * Tokens live in environment variables (see .env.example).
 *
 * Add a client by adding one entry per ad account they own.
 */

export default [
  // ---- Meta ----
  {
    client: "1066 - 70209 - readyrx - TN",
    account: "1066 - 70209 - readyrx - TN",
    platform: "Meta",
    // Ad account ID from Meta Ads Manager, with or without the "act_" prefix.
    id: "act_862272646134746",
    account: "Ready Health Account",
    platform: "Meta",
    id: "act_1470178097849809",
    // Optional: use a different token for this account. Defaults to META_ACCESS_TOKEN.
    // tokenEnv: "",
  },

  // ---- Google Ads ----
  {
    client: "Pending",
    account: "Pending",
    platform: "Google",
    // Customer ID as shown in Google Ads, dashes optional.
    id: "NA",
    // Your manager (MCC) account ID, if this account sits under one.
    loginCustomerId: "NA",
  },

  {
    client: "Ready Health Account",
    account: "Ready Health Account",
    platform: "Meta",
    id: "act_1470178097849809",
  },
];
