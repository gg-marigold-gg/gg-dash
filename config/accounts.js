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
    // Optional: use a different token for this account. Defaults to META_ACCESS_TOKEN.
    // tokenEnv: "",
  },

  // ---- Google Ads ----
  {
    client: "Vireo Weight Care",
    account: "Vireo · Google Search",
    platform: "Google",
    // Customer ID as shown in Google Ads, dashes optional.
    id: "123-456-7890",
    // Your manager (MCC) account ID, if this account sits under one.
    loginCustomerId: "987-654-3210",
  },

  {
    client: "Nomad Men's Health",
    account: "Nomad · Meta Acquisition",
    platform: "Meta",
    id: "act_2233445566",
  },
];
