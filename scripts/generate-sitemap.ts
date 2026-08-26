import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://my-repo-mind.lovable.app";

interface Entry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
}

const entries: Entry[] = [
  { path: "/",           changefreq: "weekly",  priority: "1.0" },
  { path: "/tools",      changefreq: "weekly",  priority: "0.9" },
  { path: "/workflows",  changefreq: "weekly",  priority: "0.85" },
  { path: "/s/backtest", changefreq: "weekly",  priority: "0.8" },
  { path: "/s/calibration", changefreq: "weekly", priority: "0.8" },
  { path: "/notebook",   changefreq: "weekly",  priority: "0.9" },
  { path: "/notebook/templates", changefreq: "weekly", priority: "0.95" },
  { path: "/strategies", changefreq: "weekly",  priority: "0.8" },
  { path: "/papers",     changefreq: "monthly", priority: "0.8" },
  { path: "/glossary",   changefreq: "monthly", priority: "0.7" },
  { path: "/data",       changefreq: "weekly",  priority: "0.75" },
  { path: "/s/tv-screener", changefreq: "daily", priority: "0.75" },
  { path: "/review",     changefreq: "weekly",  priority: "0.7" },
  { path: "/gallery",    changefreq: "daily",   priority: "0.75" },
  { path: "/github",     changefreq: "monthly", priority: "0.5" },
  { path: "/changelog",  changefreq: "monthly", priority: "0.4" },
];

// Domain hub pages (/d/:groupId) — keep in sync with NAV_GROUPS in src/lib/sections.ts
const DOMAIN_IDS = [
  "overview",
  "foundations",
  "pricing",
  "fixed-income",
  "asset-portfolio",
  "econometrics",
  "risk",
  "data",
  "frontier",
];
for (const id of DOMAIN_IDS) {
  entries.push({ path: `/d/${id}`, changefreq: "weekly", priority: "0.85" });
}

// Topic knowledge pages (/topic/:id) — keep in sync with src/data/topicsData.ts
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

const today = new Date().toISOString().slice(0, 10);

const urls = entries
  .map(
    (e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <lastmod>${today}</lastmod>
    ${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}
    ${e.priority ? `<priority>${e.priority}</priority>` : ""}
  </url>`
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

mkdirSync(resolve("public"), { recursive: true });
writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} entries)`);