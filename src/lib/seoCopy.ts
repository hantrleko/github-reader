import { SECTIONS, type SectionDef } from "@/lib/sections";

/**
 * Centralized, single-source-of-truth SEO / OpenGraph copy for the landing
 * page and every section page. Both the runtime pages and the copy-consistency
 * test import from here, so the "unified editorial style" rules stay enforced.
 */

export const SITE_URL = "https://my-repo-mind.lovable.app";
export const BRAND = "EF Lab";
/** editorial em-dash brand suffix appended to page titles */
export const TITLE_SUFFIX = ` — ${BRAND}`;

/** Unified format rules shared by pages + the consistency checker. */
export const SEO_RULES = {
  /** SEO <title> hard limits (keyword-first, brand-suffixed) */
  title: { max: 60, min: 8 },
  /** meta description / og:description limits */
  description: { max: 160, min: 18 },
  /** section subtitle (editorial 导语) limits */
  subtitle: { max: 80, min: 16 },
  /** kicker must read as an English editorial label (ASCII) */
  kickerAsciiOnly: true,
  /** editorial copy uses full-width Chinese punctuation, never half-width , ; : */
  forbiddenHalfWidthPunct: /[,;]| :/,
  /** section 导语 must end with a full-width period */
  subtitleMustEndWith: "。",
} as const;

export interface SeoCopy {
  title: string;
  description: string;
  /** og:title — brand-free headline, cleaner in social cards */
  ogTitle: string;
  ogDescription: string;
}

/** The primary (pre-" · ") headline of a section, used across title + og. */
export const sectionHeadline = (def: SectionDef): string =>
  def.label.split(" · ")[0].trim();

/** Build unified SEO/OG copy for a section page. */
export function sectionSeo(def: SectionDef): SeoCopy {
  const headline = sectionHeadline(def);
  const description = def.subtitle ?? def.label;
  return {
    title: `${headline}${TITLE_SUFFIX}`,
    description,
    ogTitle: `${headline} · ${def.kicker}`,
    ogDescription: description,
  };
}

/** Unified SEO/OG copy for the landing page. */
export const HOME_SEO: SeoCopy = {
  title: `${BRAND} — 量化金融与计量经济学实验室`,
  description:
    "面向经济金融实证研究的交互式实验室：从资产定价、衍生品、固定收益到计量经济学，用真实数据、公式推导和可调参数打通从理论到结论的完整链路。",
  ogTitle: "把经济金融理论转化为可验证实验",
  ogDescription:
    "从理论推导到参数实验，再到可复现 Notebook：一站式学习资产定价、衍生品、风险管理与计量经济学。",
};

/** A single copy issue found by the consistency checker. */
export interface CopyIssue {
  id: string;
  field: string;
  message: string;
}

const isAscii = (s: string) => /^[\x00-\x7F]+$/.test(s);

/** Validate one section's editorial + SEO copy against SEO_RULES. */
export function validateSection(def: SectionDef): CopyIssue[] {
  const issues: CopyIssue[] = [];
  const push = (field: string, message: string) =>
    issues.push({ id: def.id, field, message });

  if (!def.chapter?.trim()) push("chapter", "chapter 不能为空");
  if (!def.kicker?.trim()) push("kicker", "kicker 不能为空");
  else if (SEO_RULES.kickerAsciiOnly && !isAscii(def.kicker))
    push("kicker", `kicker 应为英文编辑标签(ASCII): "${def.kicker}"`);
  if (!def.label?.trim()) push("label", "label 不能为空");

  const sub = def.subtitle;
  if (!sub?.trim()) {
    push("subtitle", "缺少导语 subtitle");
  } else {
    if (sub.length < SEO_RULES.subtitle.min || sub.length > SEO_RULES.subtitle.max)
      push(
        "subtitle",
        `导语长度 ${sub.length} 超出 [${SEO_RULES.subtitle.min}, ${SEO_RULES.subtitle.max}]`,
      );
    if (!sub.endsWith(SEO_RULES.subtitleMustEndWith))
      push("subtitle", `导语应以 "${SEO_RULES.subtitleMustEndWith}" 结尾`);
    if (SEO_RULES.forbiddenHalfWidthPunct.test(sub))
      push("subtitle", "导语请使用全角标点(，；：)而非半角");
  }

  const seo = sectionSeo(def);
  if (seo.title.length > SEO_RULES.title.max || seo.title.length < SEO_RULES.title.min)
    push("title", `SEO 标题长度 ${seo.title.length} 超出 [${SEO_RULES.title.min}, ${SEO_RULES.title.max}]`);
  if (!seo.title.endsWith(TITLE_SUFFIX))
    push("title", `SEO 标题应以 "${TITLE_SUFFIX}" 结尾`);
  if (
    seo.description.length > SEO_RULES.description.max ||
    seo.description.length < SEO_RULES.description.min
  )
    push(
      "description",
      `meta 描述长度 ${seo.description.length} 超出 [${SEO_RULES.description.min}, ${SEO_RULES.description.max}]`,
    );

  return issues;
}

/** Validate the landing page copy. */
export function validateHome(): CopyIssue[] {
  const issues: CopyIssue[] = [];
  const push = (field: string, message: string) =>
    issues.push({ id: "home", field, message });
  const { title, description } = HOME_SEO;
  if (title.length > SEO_RULES.title.max)
    push("title", `首页标题长度 ${title.length} > ${SEO_RULES.title.max}`);
  if (description.length > SEO_RULES.description.max)
    push("description", `首页描述长度 ${description.length} > ${SEO_RULES.description.max}`);
  return issues;
}

/** Validate every section + the landing page. */
export function validateAllCopy(): CopyIssue[] {
  return [...validateHome(), ...SECTIONS.flatMap(validateSection)];
}
