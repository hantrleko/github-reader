/**
 * Fallback sitemap generator (plain Node, no tsx/bun required).
 * Used by prebuild/predev when tsx is unavailable.
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://my-repo-mind.lovable.app";

const entries = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/tools", changefreq: "weekly", priority: "0.9" },
  { path: "/workflows", changefreq: "weekly", priority: "0.85" },
  { path: "/s/backtest", changefreq: "weekly", priority: "0.8" },
  { path: "/s/calibration", changefreq: "weekly", priority: "0.8" },
  { path: "/notebook", changefreq: "weekly", priority: "0.9" },
  { path: "/notebook/templates", changefreq: "weekly", priority: "0.95" },
  { path: "/strategies", changefreq: "weekly", priority: "0.8" },
  { path: "/papers", changefreq: "monthly", priority: "0.8" },
  { path: "/glossary", changefreq: "monthly", priority: "0.7" },
  { path: "/github", changefreq: "monthly", priority: "0.5" },
  { path: "/watchlist", changefreq: "weekly", priority: "0.7" },
  { path: "/changelog", changefreq: "monthly", priority: "0.4" },
];

const TOPIC_IDS = [
  "asset-pricing",
  "econometrics",
  "time-series",
  "portfolio",
  "derivatives",
  "risk-management",
  "fixed-income",
  "macroeconomics",
  "behavioral-micro",
];
for (const id of TOPIC_IDS) {
  entries.push({ path: `/topic/${id}`, changefreq: "monthly", priority: "0.75" });
}

const SECTION_IDS = [
  "micro",
  "calculator",
  "implied-vol",
  "mc-pricer",
  "derivatives",
  "bond",
  "rate-model",
  "frontier",
  "asset-pricing",
  "econometrics",
  "risk",
  "quant",
  "macro",
  "fred",
  "worldbank",
  "ecb-bis",
  "coingecko",
  "alphavantage",
  "platform",
  "frontier-concepts",
  "quiz",
  "learning",
  "backtest",
  "calibration",
];
for (const id of SECTION_IDS) {
  entries.push({ path: `/s/${id}`, changefreq: "weekly", priority: "0.7" });
}

const today = new Date().toISOString().slice(0, 10);
const body = entries
  .map(
    (e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq || "monthly"}</changefreq>
    <priority>${e.priority || "0.5"}</priority>
  </url>`
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const outDir = resolve(__dirname, "../public");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "sitemap.xml");
writeFileSync(outPath, xml, "utf8");
console.log(`[sitemap] wrote ${entries.length} urls → ${outPath}`);
