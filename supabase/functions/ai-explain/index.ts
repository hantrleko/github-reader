// AI Explainer for finance formulas / notebook cells.
// Uses Lovable AI Gateway (no API key required for users).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { latex, expression, params, context, mode, tool, results, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      tool ? `工具: ${tool}` : "",
      latex ? `LaTeX: ${latex}` : "",
      expression ? `表达式: ${expression}` : "",
      params ? `当前参数: ${JSON.stringify(params)}` : "",
      results ? `计算结果: ${JSON.stringify(results).slice(0, 4000)}` : "",
      context ? `上下文: ${context}` : "",
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
      return new Response(JSON.stringify({ error: "请求过于频繁,请稍后重试" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI 配额已用尽,请前往 Lovable 工作区充值" }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway ${resp.status}: ${t.slice(0,200)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const explanation = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});