// AI Explainer for finance formulas / notebook cells.
// Uses Lovable AI Gateway (no API key required for users).
// Security: requires a signed-in user (JWT validated in code), per-user+IP
// rate limits (10/min, 100/day), question length cap, origin whitelist CORS.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsHeadersFor,
  getClientIp,
  checkRateLimit,
  rateLimitResponse,
} from "../_shared/security.ts";

const MAX_QUESTION_LEN = 1000;

function json(cors: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1) Auth: require a valid user JWT.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(corsHeaders, { error: "unauthorized", code: "auth_required" }, 401);
    }
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await anon.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json(corsHeaders, { error: "unauthorized", code: "auth_required" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // 2) Rate limits: per-user+IP 10/min, per-user 100/day.
    const ip = getClientIp(req);
    const perMin = await checkRateLimit(`rl:ai-explain:min:${userId}:${ip}`, 10, 60);
    if (!perMin.allowed) return rateLimitResponse(corsHeaders, perMin.retryAfter);
    const perDay = await checkRateLimit(`rl:ai-explain:day:${userId}`, 100, 86400);
    if (!perDay.allowed) return rateLimitResponse(corsHeaders, perDay.retryAfter);

    // 3) Input validation.
    const body = await req.json().catch(() => ({}));
    const { latex, expression, params, context, mode, tool, results, question } = body ?? {};
    if (question != null && (typeof question !== "string" || question.length > MAX_QUESTION_LEN)) {
      return json(
        corsHeaders,
        { error: `question too long (max ${MAX_QUESTION_LEN} chars)`, code: "question_too_long" },
        400,
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json(corsHeaders, { error: "LOVABLE_API_KEY missing" }, 500);
    }

    const sys = mode === "interpret"
      ? `你是一位量化金融与计量经济学研究导师。用户刚在一个交互式工具中得到了计算结果。用简洁中文(≤260字)解读:
1) 这组结果说明了什么(结合具体数值)
2) 哪个参数/输入对结果影响最大,为什么
3) 一个值得警惕的陷阱或下一步实验建议
直接给段落或项目符号,不加标题,不要免责声明。`
      : `你是一位量化金融与计量经济学讲师。用简洁中文(≤180字)解释用户给出的公式:
1) 含义与直觉
2) 关键参数对结果的方向性影响
3) 一个使用场景或注意事项
不要重复 LaTeX,不要加 markdown 标题,直接给段落,可用项目符号。`;

    const user = [
      tool ? `工具: ${String(tool).slice(0, 200)}` : "",
      latex ? `LaTeX: ${String(latex).slice(0, 2000)}` : "",
      expression ? `表达式: ${String(expression).slice(0, 2000)}` : "",
      params ? `当前参数: ${JSON.stringify(params).slice(0, 2000)}` : "",
      results ? `计算结果: ${JSON.stringify(results).slice(0, 4000)}` : "",
      context ? `上下文: ${String(context).slice(0, 1000)}` : "",
      question ? `用户追问: ${question}` : "",
    ].filter(Boolean).join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user || "请解释一个常见金融公式。" },
        ],
      }),
    });

    if (resp.status === 429) {
      return json(corsHeaders, { error: "请求过于频繁,请稍后重试" }, 429);
    }
    if (resp.status === 402) {
      return json(corsHeaders, { error: "AI 配额已用尽,请前往 Lovable 工作区充值" }, 402);
    }
    if (!resp.ok) {
      const t = await resp.text();
      return json(corsHeaders, { error: `AI gateway ${resp.status}: ${t.slice(0, 200)}` }, 502);
    }

    const data = await resp.json();
    const explanation = data?.choices?.[0]?.message?.content ?? "";
    return json(corsHeaders, { explanation });
  } catch (e) {
    return json(corsHeaders, { error: String((e as Error)?.message || e) }, 500);
  }
});
