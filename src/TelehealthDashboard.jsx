import React, { useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Design tokens + styles                                             */
/* ------------------------------------------------------------------ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.tvd {
  --ground:#E7ECEF;
  --panel:#FBFCFD;
  --ink:#10222E;
  --muted:#5C7080;
  --line:#CBD5DB;
  --line-soft:#E4E9EC;
  --signal:#0F7B8A;
  --signal-soft:#DEEFF1;
  --plum:#5B3E72;
  --good:#2F7D5D;
  --alert:#B3453A;
  --display:'IBM Plex Sans Condensed', system-ui, sans-serif;
  --body:'IBM Plex Sans', system-ui, sans-serif;
  --mono:'IBM Plex Mono', ui-monospace, monospace;

  background:var(--ground);
  color:var(--ink);
  font-family:var(--body);
  font-size:14px;
  line-height:1.45;
  min-height:100%;
  padding:0 0 48px;
  -webkit-font-smoothing:antialiased;
}
.tvd *,.tvd *::before,.tvd *::after{box-sizing:border-box;}
.tvd button{font:inherit;color:inherit;cursor:pointer;}
.tvd :focus-visible{outline:2px solid var(--signal);outline-offset:2px;}

.tvd .wrap{max-width:1440px;margin:0 auto;padding:0 20px;}

/* --- masthead --- */
.tvd .mast{
  display:flex;align-items:flex-end;justify-content:space-between;gap:16px;
  flex-wrap:wrap;padding:22px 0 14px;border-bottom:1px solid var(--line);
}
.tvd .eyebrow{
  font-family:var(--display);font-size:11px;font-weight:600;letter-spacing:.16em;
  text-transform:uppercase;color:var(--muted);
}
.tvd .mast h1{
  font-family:var(--display);font-weight:600;font-size:27px;letter-spacing:-.01em;
  margin:2px 0 0;
}
.tvd .mast .sub{color:var(--muted);font-size:13px;margin-top:3px;}
.tvd .mast-actions{display:flex;gap:8px;align-items:center;}

/* --- buttons --- */
.tvd .btn{
  background:var(--panel);border:1px solid var(--line);border-radius:2px;
  padding:7px 12px;font-size:13px;transition:border-color .12s, background .12s;
}
.tvd .btn:hover{border-color:var(--signal);}
.tvd .btn-primary{background:var(--signal);border-color:var(--signal);color:#fff;}
.tvd .btn-primary:hover{background:#0B6874;border-color:#0B6874;}
.tvd .btn-ghost{background:transparent;border-color:transparent;color:var(--muted);padding:6px 8px;}
.tvd .btn-ghost:hover{color:var(--ink);border-color:var(--line);}

/* --- filter rail --- */
.tvd .rail{
  position:sticky;top:0;z-index:30;background:var(--ground);
  border-bottom:1px solid var(--line);padding:10px 0;
}
.tvd .rail-inner{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.tvd .seg{display:inline-flex;border:1px solid var(--line);border-radius:2px;overflow:hidden;background:var(--panel);}
.tvd .seg button{
  border:0;background:transparent;padding:6px 11px;font-size:12.5px;color:var(--muted);
  border-right:1px solid var(--line-soft);
}
.tvd .seg button:last-child{border-right:0;}
.tvd .seg button[aria-pressed="true"]{background:var(--signal-soft);color:#0B5A64;font-weight:500;}
.tvd .ms{position:relative;}
.tvd .ms-btn{
  background:var(--panel);border:1px solid var(--line);border-radius:2px;padding:6px 11px;
  font-size:12.5px;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;
}
.tvd .ms-btn[data-active="true"]{border-color:var(--signal);background:var(--signal-soft);}
.tvd .ms-count{
  font-family:var(--mono);font-size:11px;background:var(--signal);color:#fff;
  border-radius:2px;padding:0 4px;line-height:16px;
}
.tvd .ms-caret{color:var(--muted);font-size:9px;}
.tvd .ms-pop{
  position:absolute;top:calc(100% + 5px);left:0;z-index:60;min-width:246px;max-height:302px;
  overflow:auto;background:var(--panel);border:1px solid var(--line);
  box-shadow:0 8px 26px rgba(16,34,46,.14);border-radius:2px;padding:6px;
}
.tvd .ms-head{display:flex;justify-content:space-between;padding:2px 6px 7px;border-bottom:1px solid var(--line-soft);margin-bottom:5px;}
.tvd .ms-head span{font-family:var(--display);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);}
.tvd .ms-opt{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:2px;cursor:pointer;font-size:13px;}
.tvd .ms-opt:hover{background:var(--signal-soft);}
.tvd .ms-opt input{accent-color:var(--signal);margin:0;}
.tvd .backdrop{position:fixed;inset:0;z-index:50;}
.tvd .search{
  background:var(--panel);border:1px solid var(--line);border-radius:2px;padding:6px 10px;
  font-size:12.5px;font-family:var(--body);width:186px;color:var(--ink);
}
.tvd .search::placeholder{color:#8FA1AC;}
.tvd .spacer{flex:1;}
.tvd .rail-note{font-size:12px;color:var(--muted);font-family:var(--mono);}

/* --- vitals strip (signature) --- */
.tvd .vitals{
  margin-top:18px;background:var(--panel);border:1px solid var(--line);border-radius:2px;
  display:grid;grid-template-columns:repeat(6,1fr);position:relative;overflow:hidden;
}
.tvd .vitals::before{
  content:"";position:absolute;top:0;left:0;right:0;height:5px;
  background-image:repeating-linear-gradient(to right,var(--line) 0 1px,transparent 1px 11px);
}
.tvd .vital{padding:20px 16px 15px;border-right:1px solid var(--line-soft);min-width:0;}
.tvd .vital:last-child{border-right:0;}
.tvd .vital-label{
  font-family:var(--display);font-size:10.5px;font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted);
}
.tvd .vital-row{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-top:7px;}
.tvd .vital-val{font-family:var(--mono);font-size:22px;font-weight:500;letter-spacing:-.02em;white-space:nowrap;}
.tvd .vital-foot{display:flex;align-items:center;gap:7px;margin-top:8px;font-size:11.5px;color:var(--muted);}
.tvd .delta{font-family:var(--mono);font-size:11.5px;padding:1px 4px;border-radius:2px;}
.tvd .delta.up{color:var(--good);background:#E6F1EB;}
.tvd .delta.down{color:var(--alert);background:#F6E6E4;}
.tvd .delta.flat{color:var(--muted);background:#EDF1F3;}

/* --- panels --- */
.tvd .panel{background:var(--panel);border:1px solid var(--line);border-radius:2px;margin-top:16px;}
.tvd .panel-head{
  display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  padding:13px 16px;border-bottom:1px solid var(--line-soft);
}
.tvd .panel-title{font-family:var(--display);font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;}
.tvd .panel-body{padding:16px;}

/* --- table --- */
.tvd .tscroll{overflow-x:auto;}
.tvd table{border-collapse:collapse;width:100%;font-size:13px;}
.tvd thead th{
  font-family:var(--display);font-size:10.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;
  color:var(--muted);text-align:right;padding:9px 12px;border-bottom:1px solid var(--line);
  white-space:nowrap;cursor:pointer;user-select:none;background:var(--panel);
}
.tvd thead th:first-child{text-align:left;position:sticky;left:0;z-index:2;}
.tvd thead th:hover{color:var(--ink);}
.tvd thead th .arrow{color:var(--signal);margin-left:3px;}
.tvd tbody td{
  padding:9px 12px;text-align:right;border-bottom:1px solid var(--line-soft);
  font-family:var(--mono);font-size:12.5px;white-space:nowrap;
}
.tvd tbody td:first-child{
  text-align:left;font-family:var(--body);font-size:13px;position:sticky;left:0;
  background:var(--panel);z-index:1;min-width:230px;
}
.tvd tbody tr:hover td{background:#F2F6F7;}
.tvd tbody tr:hover td:first-child{background:#F2F6F7;}
.tvd tr.child td{background:#F6F8F9;color:var(--muted);}
.tvd tr.child td:first-child{background:#F6F8F9;padding-left:34px;font-size:12.5px;}
.tvd tr.total td{
  border-top:1px solid var(--ink);border-bottom:0;font-weight:600;background:var(--panel);
  position:sticky;bottom:0;
}
.tvd .twist{
  border:0;background:transparent;padding:0 7px 0 0;color:var(--muted);font-size:10px;width:20px;
}
.tvd .sharebar{display:block;height:3px;background:var(--signal);opacity:.5;margin-top:4px;border-radius:1px;}
.tvd .cell-neg{color:var(--alert);}

/* --- data source panel --- */
.tvd .src{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.tvd .map-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(212px,1fr));gap:10px;margin-top:14px;}
.tvd .map-item label{
  display:block;font-family:var(--display);font-size:10.5px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted);margin-bottom:3px;
}
.tvd .map-item select{
  width:100%;padding:6px 8px;font-size:12.5px;font-family:var(--body);
  border:1px solid var(--line);border-radius:2px;background:#fff;color:var(--ink);
}
.tvd .map-item[data-req="true"] select[data-empty="true"]{border-color:var(--alert);}
.tvd .note{font-size:12.5px;color:var(--muted);}
.tvd .warn{
  font-size:12.5px;color:var(--alert);background:#F9EDEC;border:1px solid #E9CFCC;
  padding:8px 11px;border-radius:2px;margin-top:12px;
}
.tvd .empty{padding:52px 20px;text-align:center;color:var(--muted);}
.tvd .empty strong{display:block;font-family:var(--display);font-size:15px;color:var(--ink);margin-bottom:5px;}

/* --- live sync --- */
.tvd .live{
  display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12px;
  color:var(--muted);
}
.tvd .dot{width:6px;height:6px;border-radius:50%;background:var(--good);flex-shrink:0;}
.tvd .dot[data-state="loading"]{background:var(--signal);animation:tvdpulse 1.1s ease-in-out infinite;}
.tvd .dot[data-state="stale"]{background:#B07A16;}
.tvd .dot[data-state="off"]{background:var(--line);}
@keyframes tvdpulse{0%,100%{opacity:.3}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.tvd .dot[data-state="loading"]{animation:none;opacity:.7}}
.tvd .banner{
  margin-top:16px;border:1px solid #E9CFCC;background:#F9EDEC;border-radius:2px;
  padding:11px 14px;font-size:12.5px;color:var(--ink);
}
.tvd .banner strong{font-family:var(--display);letter-spacing:.04em;}
.tvd .banner ul{margin:6px 0 0;padding-left:18px;color:var(--alert);}
.tvd .banner li{margin-top:2px;font-family:var(--mono);font-size:11.5px;}

.tvd .fade{animation:tvdfade .18s ease-out;}
@keyframes tvdfade{from{opacity:.45}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.tvd .fade{animation:none}}

@media (max-width:1080px){
  .tvd .vitals{grid-template-columns:repeat(3,1fr);}
  .tvd .vital:nth-child(3){border-right:0;}
  .tvd .vital:nth-child(-n+3){border-bottom:1px solid var(--line-soft);}
}
@media (max-width:640px){
  .tvd .vitals{grid-template-columns:repeat(2,1fr);}
  .tvd .vital:nth-child(odd){border-right:1px solid var(--line-soft);}
  .tvd .vital:nth-child(even){border-right:0;}
  .tvd .vital-val{font-size:18px;}
  .tvd .mast h1{font-size:22px;}
  .tvd .search{width:100%;}
}
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const usd = (n) =>
  n == null || !isFinite(n)
    ? "—"
    : "$" + Math.round(n).toLocaleString("en-US");
const usd2 = (n) =>
  n == null || !isFinite(n)
    ? "—"
    : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n) => (n == null || !isFinite(n) ? "—" : Math.round(n).toLocaleString("en-US"));
const pct = (n) => (n == null || !isFinite(n) ? "—" : n.toFixed(2) + "%");
const x2 = (n) => (n == null || !isFinite(n) ? "—" : n.toFixed(2) + "×");
const compact = (n) =>
  Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.abs(n) >= 1e3 ? Math.round(n / 1e3) + "k" : String(Math.round(n));

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const parseNum = (v) => {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (v == null) return 0;
  const s = String(v).replace(/[$,%\s]/g, "").replace(/[()]/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
const parseDate = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : iso(d);
};
const weekOf = (dstr) => {
  const d = new Date(dstr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
};
const uniq = (arr) => Array.from(new Set(arr)).sort();

/* ------------------------------------------------------------------ */
/*  Metric definitions                                                 */
/* ------------------------------------------------------------------ */

const BASE = ["spend", "impressions", "clicks", "leads", "consults", "orders", "revenue"];

function derive(t) {
  return {
    ...t,
    ctr: t.impressions ? (t.clicks / t.impressions) * 100 : null,
    cpc: t.clicks ? t.spend / t.clicks : null,
    cpm: t.impressions ? (t.spend / t.impressions) * 1000 : null,
    cvr: t.clicks ? (t.leads / t.clicks) * 100 : null,
    cpl: t.leads ? t.spend / t.leads : null,
    showRate: t.leads ? (t.consults / t.leads) * 100 : null,
    cpa: t.orders ? t.spend / t.orders : null,
    aov: t.orders ? t.revenue / t.orders : null,
    roas: t.spend ? t.revenue / t.spend : null,
  };
}
const emptyTotals = () => BASE.reduce((a, k) => ((a[k] = 0), a), {});
function sum(rows) {
  const t = emptyTotals();
  for (const r of rows) for (const k of BASE) t[k] += r[k] || 0;
  return t;
}

const COLS = [
  { key: "spend", label: "Spend", fmt: usd, share: true },
  { key: "impressions", label: "Impr", fmt: num },
  { key: "clicks", label: "Clicks", fmt: num },
  { key: "ctr", label: "CTR", fmt: pct },
  { key: "cpc", label: "CPC", fmt: usd2, lowerBetter: true },
  { key: "leads", label: "Leads", fmt: num },
  { key: "cpl", label: "CPL", fmt: usd2, lowerBetter: true },
  { key: "consults", label: "Consults", fmt: num },
  { key: "orders", label: "Orders", fmt: num },
  { key: "cpa", label: "CPA", fmt: usd2, lowerBetter: true },
  { key: "revenue", label: "Revenue", fmt: usd },
  { key: "roas", label: "ROAS", fmt: x2 },
];

const VITALS = [
  { key: "spend", label: "Spend", fmt: usd },
  { key: "revenue", label: "Revenue", fmt: usd },
  { key: "roas", label: "ROAS", fmt: x2 },
  { key: "leads", label: "Leads", fmt: num },
  { key: "cpa", label: "CPA", fmt: usd2, lowerBetter: true },
  { key: "ctr", label: "CTR", fmt: pct },
];

const TREND_MODES = {
  revenue: { bar: "spend", line: "revenue", barLabel: "Spend", lineLabel: "Revenue", lineFmt: usd },
  leads: { bar: "leads", line: "cpl", barLabel: "Leads", lineLabel: "CPL", lineFmt: usd2 },
  orders: { bar: "orders", line: "cpa", barLabel: "Orders", lineLabel: "CPA", lineFmt: usd2 },
};

/* ------------------------------------------------------------------ */
/*  Sample data                                                        */
/* ------------------------------------------------------------------ */

const CLIENTS = [
  {
    name: "Vireo Weight Care",
    scale: 1.9,
    aov: 249,
    accounts: [
      { name: "Vireo · Meta Prospecting", platform: "Meta", campaigns: ["GLP-1 Broad", "UGC Testimonials", "LAL 2% Purchasers"] },
      { name: "Vireo · Google Search", platform: "Google", campaigns: ["Brand", "Semaglutide Non-Brand"] },
      { name: "Vireo · TikTok", platform: "TikTok", campaigns: ["Creator Whitelist"] },
    ],
  },
  {
    name: "Nomad Men's Health",
    scale: 1.25,
    aov: 132,
    accounts: [
      { name: "Nomad · Meta Acquisition", platform: "Meta", campaigns: ["ED Broad", "Hair Retargeting"] },
      { name: "Nomad · Google Search", platform: "Google", campaigns: ["Brand", "Competitor Conquest"] },
    ],
  },
  {
    name: "Calla Mental Health",
    scale: 1.0,
    aov: 96,
    accounts: [
      { name: "Calla · Meta Core", platform: "Meta", campaigns: ["Therapy Intake", "Anxiety Creative Test"] },
      { name: "Calla · Google Search", platform: "Google", campaigns: ["Online Therapy NB"] },
    ],
  },
  {
    name: "Derma Direct",
    scale: 0.7,
    aov: 78,
    accounts: [
      { name: "Derma · Meta Retargeting", platform: "Meta", campaigns: ["Acne Rx Retarget"] },
      { name: "Derma · TikTok Creators", platform: "TikTok", campaigns: ["Before/After UGC", "Derm POV"] },
    ],
  },
  {
    name: "Solace Hormone Health",
    scale: 0.85,
    aov: 184,
    accounts: [
      { name: "Solace · Meta Core", platform: "Meta", campaigns: ["Perimenopause Broad"] },
      { name: "Solace · Google Search", platform: "Google", campaigns: ["HRT Non-Brand", "Brand"] },
    ],
  },
];

const PLAT = {
  Meta: { cpm: 19, ctr: 0.0125, cvr: 0.085, show: 0.55, close: 0.42 },
  Google: { cpm: 46, ctr: 0.052, cvr: 0.125, show: 0.62, close: 0.5 },
  TikTok: { cpm: 9.5, ctr: 0.0085, cvr: 0.052, show: 0.44, close: 0.33 },
};

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSample(days = 120) {
  const rnd = mulberry32(20260821);
  const rows = [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = addDays(end, -(days - 1));
  let i = 0;
  for (const c of CLIENTS) {
    for (const acct of c.accounts) {
      const p = PLAT[acct.platform];
      for (const camp of acct.campaigns) {
        const base = 180 + rnd() * 520;
        const trend = 0.75 + rnd() * 0.7;
        for (let d = 0; d < days; d++) {
          const day = addDays(start, d);
          const dow = day.getDay();
          const season = dow === 0 || dow === 6 ? 0.82 : 1 + (dow === 1 ? 0.08 : 0);
          const ramp = 1 + ((trend - 1) * d) / days;
          const noise = 0.72 + rnd() * 0.56;
          const spend = base * c.scale * season * ramp * noise;
          const impressions = (spend / p.cpm) * 1000 * (0.9 + rnd() * 0.2);
          const clicks = impressions * p.ctr * (0.85 + rnd() * 0.3);
          const leads = clicks * p.cvr * (0.8 + rnd() * 0.4);
          const consults = leads * p.show * (0.9 + rnd() * 0.2);
          const orders = consults * p.close * (0.85 + rnd() * 0.3);
          const revenue = orders * c.aov * (0.9 + rnd() * 0.28);
          rows.push({
            id: i++,
            date: iso(day),
            client: c.name,
            account: acct.name,
            platform: acct.platform,
            campaign: camp,
            spend: +spend.toFixed(2),
            impressions: Math.round(impressions),
            clicks: Math.round(clicks),
            leads: Math.round(leads),
            consults: Math.round(consults),
            orders: Math.round(orders),
            revenue: +revenue.toFixed(2),
          });
        }
      }
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/*  CSV mapping                                                        */
/* ------------------------------------------------------------------ */

const FIELDS = [
  { key: "date", label: "Date", req: true, aliases: ["date", "day", "date_start", "reporting_starts", "reportingstarts"] },
  { key: "client", label: "Client", req: true, aliases: ["client", "brand", "customer", "advertiser", "account_name_client"] },
  { key: "account", label: "Ad account", req: false, aliases: ["account", "ad_account", "adaccount", "account_name", "ad_account_name"] },
  { key: "platform", label: "Platform", req: false, aliases: ["platform", "channel", "source", "publisher", "network"] },
  { key: "campaign", label: "Campaign", req: false, aliases: ["campaign", "campaign_name", "campaignname"] },
  { key: "spend", label: "Spend", req: true, aliases: ["spend", "cost", "amount_spent", "amountspent", "cost_micros"] },
  { key: "impressions", label: "Impressions", req: false, aliases: ["impressions", "impr", "impressions_total"] },
  { key: "clicks", label: "Clicks", req: false, aliases: ["clicks", "link_clicks", "linkclicks", "clicks_all"] },
  { key: "leads", label: "Leads", req: false, aliases: ["leads", "lead", "conversions", "results", "signups"] },
  { key: "consults", label: "Consults", req: false, aliases: ["consults", "consultations", "appointments", "visits", "bookings"] },
  { key: "orders", label: "Orders", req: false, aliases: ["orders", "purchases", "subscriptions", "patients", "sales"] },
  { key: "revenue", label: "Revenue", req: false, aliases: ["revenue", "conversion_value", "purchase_value", "value", "sales_amount"] },
];
const TEXT_FIELDS = ["date", "client", "account", "platform", "campaign"];

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "_");
function autoMap(headers) {
  const map = {};
  const used = new Set();
  for (const f of FIELDS) {
    const hit = headers.find((h) => !used.has(h) && f.aliases.includes(norm(h)));
    if (hit) {
      map[f.key] = hit;
      used.add(hit);
    } else map[f.key] = "";
  }
  return map;
}
function applyMap(raw, map) {
  const out = [];
  raw.forEach((r, i) => {
    const date = parseDate(r[map.date]);
    if (!date) return;
    const row = { id: i, date };
    for (const k of ["client", "account", "platform", "campaign"]) {
      row[k] = map[k] && r[map[k]] != null && String(r[map[k]]).trim() !== "" ? String(r[map[k]]).trim() : "";
    }
    if (!row.client) row.client = "Unassigned";
    if (!row.account) row.account = row.client;
    if (!row.platform) row.platform = "Unspecified";
    if (!row.campaign) row.campaign = "—";
    for (const k of BASE) row[k] = map[k] ? parseNum(r[map[k]]) : 0;
    out.push(row);
  });
  return out;
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const all = selected.length === 0;
  return (
    <div className="ms">
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}
      <button className="ms-btn" data-active={!all} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {label}
        {all ? <span style={{ color: "var(--muted)" }}>All</span> : <span className="ms-count">{selected.length}</span>}
        <span className="ms-caret">▼</span>
      </button>
      {open && (
        <div className="ms-pop" role="listbox">
          <div className="ms-head">
            <span>{label}</span>
            <button className="btn-ghost" style={{ fontSize: 11, padding: 0, background: "none", border: 0 }} onClick={() => onChange([])}>
              Show all
            </button>
          </div>
          {options.length === 0 && <div className="note" style={{ padding: 6 }}>Nothing to show yet.</div>}
          {options.map((o) => (
            <label className="ms-opt" key={o}>
              <input
                type="checkbox"
                checked={selected.includes(o)}
                onChange={() =>
                  onChange(selected.includes(o) ? selected.filter((s) => s !== o) : [...selected, o])
                }
              />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function Spark({ data, color }) {
  if (!data || data.length < 2) return <div style={{ width: 74, height: 24 }} />;
  const w = 74, h = 24, pad = 3;
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - pad - ((v - min) / rng) * (h - pad * 2),
  ]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${line} ${w},${h} 0,${h}`;
  return (
    <svg width={w} height={h} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <polygon points={area} fill={color} opacity="0.1" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0] - 1} cy={pts[pts.length - 1][1]} r="1.9" fill={color} />
    </svg>
  );
}

function Delta({ cur, prev, lowerBetter }) {
  if (prev == null || cur == null || !isFinite(prev) || !isFinite(cur) || prev === 0)
    return <span className="delta flat">n/a</span>;
  const change = ((cur - prev) / Math.abs(prev)) * 100;
  const good = lowerBetter ? change < 0 : change > 0;
  const cls = Math.abs(change) < 0.5 ? "flat" : good ? "up" : "down";
  return (
    <span className={"delta " + cls}>
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function TelehealthDashboard() {
  const sample = useMemo(() => makeSample(120), []);
  const [rows, setRows] = useState(sample);
  const [source, setSource] = useState("Sample data · 5 clients · 120 days");
  const [rawCsv, setRawCsv] = useState(null); // {data, headers}
  const [map, setMap] = useState(null);
  const [csvError, setCsvError] = useState("");
  const fileRef = useRef(null);

  // Live sync state: "loading" | "live" | "off"
  const [sync, setSync] = useState({ state: "loading", at: null, errors: [] });

  const loadLive = async (force = false) => {
    setSync((s) => ({ ...s, state: "loading" }));
    try {
      const res = await fetch("/api/data" + (force ? "?refresh=1&t=" + Date.now() : ""));
      if (!res.ok) throw new Error("HTTP " + res.status);
      const payload = await res.json();
      if (!payload.rows?.length) throw new Error("no rows returned");

      setRows(payload.rows);
      setRawCsv(null);
      setMap(null);
      setSync({ state: "live", at: payload.generatedAt, errors: payload.errors || [] });
      setSource(
        `Live · ${payload.rows.length.toLocaleString()} rows · ${payload.accountsRequested -
          payload.accountsFailed}/${payload.accountsRequested} accounts`
      );
    } catch (err) {
      // No API deployed yet, or every account failed. Sample data keeps the
      // page usable and the CSV importer still works.
      setSync({ state: "off", at: null, errors: [] });
    }
  };

  useEffect(() => {
    loadLive(false);
  }, []);

  const [days, setDays] = useState(30);
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [q, setQ] = useState("");
  const [groupBy, setGroupBy] = useState("client");
  const [gran, setGran] = useState("day");
  const [trend, setTrend] = useState("revenue");
  const [sort, setSort] = useState({ key: "spend", dir: "desc" });
  const [openRows, setOpenRows] = useState([]);

  /* ---- date window ---- */
  const { start, end, prevStart, prevEnd, maxDate } = useMemo(() => {
    const maxD = rows.length ? rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0].date) : iso(new Date());
    const e = new Date(maxD + "T00:00:00");
    const s = addDays(e, -(days - 1));
    return {
      maxDate: maxD,
      end: iso(e),
      start: iso(s),
      prevEnd: iso(addDays(s, -1)),
      prevStart: iso(addDays(s, -days)),
    };
  }, [rows, days]);

  /* ---- option lists (dependent) ---- */
  const clientOpts = useMemo(() => uniq(rows.map((r) => r.client)), [rows]);
  const accountOpts = useMemo(
    () => uniq(rows.filter((r) => !clients.length || clients.includes(r.client)).map((r) => r.account)),
    [rows, clients]
  );
  const platformOpts = useMemo(() => uniq(rows.map((r) => r.platform)), [rows]);

  useEffect(() => {
    setAccounts((a) => a.filter((x) => accountOpts.includes(x)));
  }, [accountOpts]);

  /* ---- filtering ---- */
  const matchesDims = (r) =>
    (!clients.length || clients.includes(r.client)) &&
    (!accounts.length || accounts.includes(r.account)) &&
    (!platforms.length || platforms.includes(r.platform)) &&
    (!q || (r.campaign + " " + r.account + " " + r.client).toLowerCase().includes(q.toLowerCase()));

  const filtered = useMemo(
    () => rows.filter((r) => r.date >= start && r.date <= end && matchesDims(r)),
    [rows, start, end, clients, accounts, platforms, q]
  );
  const prevRows = useMemo(
    () => rows.filter((r) => r.date >= prevStart && r.date <= prevEnd && matchesDims(r)),
    [rows, prevStart, prevEnd, clients, accounts, platforms, q]
  );

  const totals = useMemo(() => derive(sum(filtered)), [filtered]);
  const prevTotals = useMemo(() => derive(sum(prevRows)), [prevRows]);

  /* ---- time series ---- */
  const series = useMemo(() => {
    const buckets = new Map();
    for (const r of filtered) {
      const k = gran === "week" ? weekOf(r.date) : r.date;
      if (!buckets.has(k)) buckets.set(k, emptyTotals());
      const b = buckets.get(k);
      for (const m of BASE) b[m] += r[m] || 0;
    }
    return Array.from(buckets.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => ({ bucket: k, ...derive(v) }));
  }, [filtered, gran]);

  const sparkFor = (key) => series.map((s) => (isFinite(s[key]) && s[key] != null ? s[key] : 0));

  /* ---- grouped table ---- */
  const CHILD = { client: "account", account: "campaign", platform: "client", campaign: "account" };
  const grouped = useMemo(() => {
    const g = new Map();
    for (const r of filtered) {
      const k = r[groupBy] || "—";
      if (!g.has(k)) g.set(k, { key: k, rows: [] });
      g.get(k).rows.push(r);
    }
    let out = Array.from(g.values()).map((grp) => {
      const childKey = CHILD[groupBy];
      const cm = new Map();
      for (const r of grp.rows) {
        const ck = r[childKey] || "—";
        if (!cm.has(ck)) cm.set(ck, []);
        cm.get(ck).push(r);
      }
      const children = Array.from(cm.entries())
        .map(([ck, crs]) => ({ key: ck, ...derive(sum(crs)) }))
        .sort((a, b) => b.spend - a.spend);
      return { key: grp.key, children, ...derive(sum(grp.rows)) };
    });
    const dir = sort.dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av - bv) * dir;
    });
    return out;
  }, [filtered, groupBy, sort]);

  const maxSpend = grouped.length ? Math.max(...grouped.map((g) => g.spend)) : 0;

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

  /* ---- CSV in ---- */
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = (res.meta.fields || []).filter(Boolean);
        if (!headers.length || !res.data.length) {
          setCsvError("That file came through empty. Check that row 1 holds the column names.");
          return;
        }
        const m = autoMap(headers);
        setRawCsv({ data: res.data, headers, name: file.name });
        setMap(m);
        const mapped = applyMap(res.data, m);
        if (!mapped.length) {
          setCsvError("No usable rows. Pick the right Date and Spend columns below, then load again.");
          return;
        }
        setRows(mapped);
        setSource(`${file.name} · ${mapped.length.toLocaleString()} rows`);
        setClients([]); setAccounts([]); setPlatforms([]); setQ("");
        setDays(30);
      },
      error: () => setCsvError("Could not read that file. CSV only for now."),
    });
    e.target.value = "";
  };

  const remap = (fieldKey, header) => {
    const m = { ...map, [fieldKey]: header };
    setMap(m);
    if (!rawCsv) return;
    const mapped = applyMap(rawCsv.data, m);
    if (mapped.length) {
      setRows(mapped);
      setSource(`${rawCsv.name} · ${mapped.length.toLocaleString()} rows`);
      setCsvError("");
    } else {
      setCsvError("No rows parsed with that mapping — check the Date column.");
    }
  };

  const useSample = () => {
    setRows(sample);
    setRawCsv(null);
    setMap(null);
    setCsvError("");
    setSource("Sample data · 5 clients · 120 days");
    setClients([]); setAccounts([]); setPlatforms([]); setQ(""); setDays(30);
  };

  /* ---- CSV out ---- */
  const exportCsv = () => {
    const head = [groupBy, ...COLS.map((c) => c.label)];
    const lines = [head.join(",")];
    for (const g of grouped) {
      lines.push(
        [`"${String(g.key).replace(/"/g, '""')}"`, ...COLS.map((c) => (g[c.key] == null ? "" : Number(g[c.key]).toFixed(2)))].join(",")
      );
      for (const ch of g.children) {
        lines.push(
          [`"  ${String(ch.key).replace(/"/g, '""')}"`, ...COLS.map((c) => (ch[c.key] == null ? "" : Number(ch[c.key]).toFixed(2)))].join(",")
        );
      }
    }
    lines.push([`"Total"`, ...COLS.map((c) => (totals[c.key] == null ? "" : Number(totals[c.key]).toFixed(2)))].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_by_${groupBy}_${start}_to_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tm = TREND_MODES[trend];
  const activeFilters = clients.length + accounts.length + platforms.length + (q ? 1 : 0);

  return (
    <div className="tvd">
      <style>{CSS}</style>

      <div className="wrap">
        <header className="mast">
          <div>
            <div className="eyebrow">Paid media · telehealth portfolio</div>
            <h1>Performance Console</h1>
            <div className="sub">
              {start} → {end} · compared with {prevStart} → {prevEnd}
            </div>
          </div>
          <div className="mast-actions">
            <span className="live">
              <span className="dot" data-state={sync.state === "live" ? "ok" : sync.state} />
              {sync.state === "loading"
                ? "Syncing…"
                : sync.state === "live"
                ? `Synced ${new Date(sync.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : source}
            </span>
            {sync.state !== "loading" && (
              <button className="btn" onClick={() => loadLive(true)}>Refresh</button>
            )}
            <button className="btn" onClick={exportCsv}>Export view</button>
          </div>
        </header>
      </div>

      <div className="rail">
        <div className="wrap rail-inner">
          <div className="seg" role="group" aria-label="Date range">
            {[7, 14, 30, 90].map((d) => (
              <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>
                {d}d
              </button>
            ))}
          </div>
          <MultiSelect label="Client" options={clientOpts} selected={clients} onChange={setClients} />
          <MultiSelect label="Ad account" options={accountOpts} selected={accounts} onChange={setAccounts} />
          <MultiSelect label="Platform" options={platformOpts} selected={platforms} onChange={setPlatforms} />
          <input
            className="search"
            placeholder="Search campaigns…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {activeFilters > 0 && (
            <button
              className="btn-ghost"
              onClick={() => { setClients([]); setAccounts([]); setPlatforms([]); setQ(""); }}
            >
              Clear filters
            </button>
          )}
          <div className="spacer" />
          <span className="rail-note">{filtered.length.toLocaleString()} rows in view</span>
        </div>
      </div>

      <div className="wrap">
        {sync.errors.length > 0 && (
          <div className="banner">
            <strong>
              {sync.errors.length} account{sync.errors.length > 1 ? "s" : ""} did not sync.
            </strong>{" "}
            Everything below excludes them, so totals are short until they're fixed.
            <ul>
              {sync.errors.map((e, i) => (
                <li key={i}>
                  {e.account} — {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="panel">
            <div className="empty">
              <strong>Nothing matches these filters.</strong>
              Widen the date range or clear a filter to bring rows back.
            </div>
          </div>
        ) : (
          <>
            {/* Vitals strip */}
            <section className="vitals fade" key={`${start}-${activeFilters}-${rows.length}`}>
              {VITALS.map((v) => (
                <div className="vital" key={v.key}>
                  <div className="vital-label">{v.label}</div>
                  <div className="vital-row">
                    <div className="vital-val">{v.fmt(totals[v.key])}</div>
                    <Spark data={sparkFor(v.key)} color={v.lowerBetter ? "#5B3E72" : "#0F7B8A"} />
                  </div>
                  <div className="vital-foot">
                    <Delta cur={totals[v.key]} prev={prevTotals[v.key]} lowerBetter={v.lowerBetter} />
                    <span>vs prior {days}d</span>
                  </div>
                </div>
              ))}
            </section>

            {/* Trend */}
            <section className="panel">
              <div className="panel-head">
                <div className="panel-title">Trend</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div className="seg">
                    <button aria-pressed={trend === "revenue"} onClick={() => setTrend("revenue")}>Spend / Revenue</button>
                    <button aria-pressed={trend === "leads"} onClick={() => setTrend("leads")}>Leads / CPL</button>
                    <button aria-pressed={trend === "orders"} onClick={() => setTrend("orders")}>Orders / CPA</button>
                  </div>
                  <div className="seg">
                    <button aria-pressed={gran === "day"} onClick={() => setGran("day")}>Daily</button>
                    <button aria-pressed={gran === "week"} onClick={() => setGran("week")}>Weekly</button>
                  </div>
                </div>
              </div>
              <div className="panel-body" style={{ height: 288 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#E4E9EC" vertical={false} />
                    <XAxis
                      dataKey="bucket"
                      tick={{ fill: "#5C7080", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                      tickLine={false}
                      axisLine={{ stroke: "#CBD5DB" }}
                      tickFormatter={(v) => v.slice(5)}
                      minTickGap={26}
                    />
                    <YAxis
                      yAxisId="l"
                      tick={{ fill: "#5C7080", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tickFormatter={compact}
                    />
                    <YAxis
                      yAxisId="r"
                      orientation="right"
                      tick={{ fill: "#5B3E72", fontSize: 11, fontFamily: "IBM Plex Mono, monospace" }}
                      tickLine={false}
                      axisLine={false}
                      width={52}
                      tickFormatter={compact}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#FBFCFD",
                        border: "1px solid #CBD5DB",
                        borderRadius: 2,
                        fontFamily: "IBM Plex Mono, monospace",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#5C7080", fontSize: 11 }}
                      formatter={(val, name) =>
                        name === tm.lineLabel ? tm.lineFmt(val) : name === "Spend" ? usd(val) : num(val)
                      }
                    />
                    <Bar yAxisId="l" dataKey={tm.bar} name={tm.barLabel} fill="#0F7B8A" fillOpacity={0.68} maxBarSize={26} />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey={tm.line}
                      name={tm.lineLabel}
                      stroke="#5B3E72"
                      strokeWidth={1.8}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Breakdown */}
            <section className="panel">
              <div className="panel-head">
                <div className="panel-title">Breakdown</div>
                <div className="seg">
                  {["client", "account", "platform", "campaign"].map((g) => (
                    <button key={g} aria-pressed={groupBy === g} onClick={() => { setGroupBy(g); setOpenRows([]); }}>
                      {g === "account" ? "Ad account" : g[0].toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tscroll">
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => toggleSort("spend")}>
                        {groupBy === "account" ? "Ad account" : groupBy[0].toUpperCase() + groupBy.slice(1)}
                      </th>
                      {COLS.map((c) => (
                        <th key={c.key} onClick={() => toggleSort(c.key)} title={`Sort by ${c.label}`}>
                          {c.label}
                          {sort.key === c.key && <span className="arrow">{sort.dir === "desc" ? "▼" : "▲"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map((g) => {
                      const open = openRows.includes(g.key);
                      return (
                        <React.Fragment key={g.key}>
                          <tr>
                            <td>
                              <button
                                className="twist"
                                aria-expanded={open}
                                aria-label={`${open ? "Hide" : "Show"} ${CHILD[groupBy]}s for ${g.key}`}
                                onClick={() =>
                                  setOpenRows((o) => (o.includes(g.key) ? o.filter((k) => k !== g.key) : [...o, g.key]))
                                }
                              >
                                {open ? "▼" : "▶"}
                              </button>
                              {g.key}
                              <span
                                className="sharebar"
                                style={{ width: maxSpend ? `${Math.max(2, (g.spend / maxSpend) * 100)}%` : 0 }}
                              />
                            </td>
                            {COLS.map((c) => (
                              <td key={c.key}>{c.fmt(g[c.key])}</td>
                            ))}
                          </tr>
                          {open &&
                            g.children.map((ch) => (
                              <tr className="child" key={g.key + "::" + ch.key}>
                                <td>{ch.key}</td>
                                {COLS.map((c) => (
                                  <td key={c.key}>{c.fmt(ch[c.key])}</td>
                                ))}
                              </tr>
                            ))}
                        </React.Fragment>
                      );
                    })}
                    <tr className="total">
                      <td>Total · {grouped.length} {groupBy === "account" ? "accounts" : groupBy + "s"}</td>
                      {COLS.map((c) => (
                        <td key={c.key}>{c.fmt(totals[c.key])}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* Data source */}
        <section className="panel">
          <div className="panel-head">
            <div className="panel-title">Data source</div>
          </div>
          <div className="panel-body">
            <div className="src">
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>Load a CSV</button>
              <button className="btn" onClick={useSample}>Use sample data</button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} style={{ display: "none" }} />
              <span className="note">
                One row per day per campaign works best. Columns are matched by name — correct any of them below.
              </span>
            </div>

            {csvError && <div className="warn">{csvError}</div>}

            {rawCsv && map && (
              <div className="map-grid">
                {FIELDS.map((f) => (
                  <div className="map-item" key={f.key} data-req={f.req}>
                    <label htmlFor={"map-" + f.key}>
                      {f.label}
                      {f.req ? " ·  required" : ""}
                    </label>
                    <select
                      id={"map-" + f.key}
                      value={map[f.key] || ""}
                      data-empty={!map[f.key]}
                      onChange={(e) => remap(f.key, e.target.value)}
                    >
                      <option value="">
                        {TEXT_FIELDS.includes(f.key) ? "Not in file" : "Not in file (counts as 0)"}
                      </option>
                      {rawCsv.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
