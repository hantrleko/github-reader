import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

const SITE = "https://eugenefinance.tech";
const DEFAULT_OG = `${SITE}/og-image.jpg`;

interface SeoProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
  /** Optional OpenGraph overrides (default to title/description). */
  ogTitle?: string;
  ogDescription?: string;
}

/**
 * Per-route SEO: <title>, meta description, canonical, og/twitter, JSON-LD.
 * Use on every top-level page. Falls back to sitewide tags in index.html.
 */
export function Seo({
  title,
  description,
  path = "/",
  image = DEFAULT_OG,
  type = "website",
  jsonLd,
  noindex = false,
  ogTitle,
  ogDescription,
}: SeoProps) {
  const { i18n } = useTranslation();
  const url = `${SITE}${path}`;
  const lang = i18n.language?.startsWith("en") ? "en" : "zh";
  const ldArr = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const ogT = ogTitle ?? title;
  const ogD = ogDescription ?? description;

  return (
    <Helmet>
      <html lang={lang} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:title" content={ogT} />
      <meta property="og:description" content={ogD} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content={lang === "zh" ? "zh_CN" : "en_US"} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogT} />
      <meta name="twitter:description" content={ogD} />
      <meta name="twitter:image" content={image} />

      <link rel="alternate" hrefLang="zh" href={url} />
      <link rel="alternate" hrefLang="en" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      {ldArr.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
}

export default Seo;