/**
 * V5.8 — Risk management completion labs.
 * 1 CoherenceTool 2 VolFhsTool 3 IrbCapitalTool 4 CreditMetricsTool
 * 5 FundingSpiralTool 6 BaselStackTool 7 ModelRiskTool 8 ResilienceTool
 */
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, BarChart, Bar, Area, ComposedChart, Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "../frontier/ui";
import {
  subadditivityDemo, spectralRisk, distortionRisk, pinballLoss, varOf, esOf,
  ewmaVol, garch11Fit, garch11Filter, harVol, filteredHistoricalSim,
  irbCapital, vasicekLossQuantile, pitPd,
  matPow, generatorFromP, SP_MIGRATION, RATING_LABELS, creditMetrics,
  deleveragingSpiral, survivalHorizon,
  baselCapitalStack, modelRiskBand, capitalTrajectory,
  makeRng, randn,
} from "@/lib/quant/riskFrontier";

const pct = (x: number, d = 2) => (x * 100).toFixed(d) + "%";

const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed space-y-1">
    {children}
  </div>
);

const Panel = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-4">
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    {children}
  </div>
);

/** Student-t / normal mixture loss sample used across the measure labs. */
function lossSample(n: number, sigma: number, df: number, seed: number) {
  const rng = makeRng(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let chi = 0;
    for (let k = 0; k < df; k++) { const z = randn(rng); chi += z * z; }
    out.push(-(randn(rng) / Math.sqrt(chi / df)) * sigma);
  }
  return out;
}

/* ═══════════ 1. Coherence, spectral & elicitability ═══════════ */
export const CoherenceTool = () => {
  const [gamma, setGamma] = useState(25);
  const [alpha, setAlpha] = useState(0.975);
  const [df, setDf] = useState(5);
  const [wang, setWang] = useState(0.4);
  const [pd, setPd] = useState(4);

  const res = useMemo(() => {
    const losses = lossSample(4000, 0.02, df, 13);
    const v = varOf(losses, alpha), e = esOf(losses, alpha);
    const sp = spectralRisk(losses, gamma);
    const measures = [
      { name: "VaR", value: v, coherent: false },
      { name: "ES", value: e, coherent: true },
      { name: `Spectral γ=${gamma}`, value: sp.value, coherent: true },
      { name: `Wang λ=${wang}`, value: distortionRisk(losses, "wang", wang), coherent: true },
      { name: "PH (ρ=2)", value: distortionRisk(losses, "ph", 2), coherent: true },
    ].map((m) => ({ ...m, v: +(m.value * 100).toFixed(3) }));

    const sub = subadditivityDemo(pd / 100, 100, 2, 0.95, 20000, 11);

    // pinball score curve — VaR is elicitable, minimised at the true quantile
    const qStar = v;
    const score: { q: number; pinball: number }[] = [];
    for (let i = -20; i <= 20; i++) {
      const q = qStar * (1 + i * 0.05);
      score.push({ q: +(q * 100).toFixed(3), pinball: +(pinballLoss(losses, q, alpha) * 1e4).toFixed(3) });
    }
    return { measures, sub, score, sp: sp.weights, v, e };
  }, [gamma, alpha, df, wang, pd]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "监管标准 (97.5% ES)", description: "FRTB 基准", apply: () => { setAlpha(0.975); setGamma(25); setDf(5); } },
        { name: "极端厌恶", description: "γ=80 谱测度", apply: () => { setGamma(80); setAlpha(0.99); } },
        { name: "重尾世界", description: "df=3", apply: () => { setDf(3); setGamma(30); } },
        { name: "次可加性反例", description: "违约债组合", apply: () => { setPd(4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">度量参数</p>
          <Slider label="置信水平 α" value={alpha} min={0.9} max={0.999} step={0.005} fmt={(v) => pct(v, 1)} onChange={setAlpha} />
          <Slider label="风险厌恶 γ" sub="谱测度" value={gamma} min={2} max={100} step={1} fmt={(v) => v.toFixed(0)} onChange={setGamma} />
          <Slider label="Wang 变换 λ" value={wang} min={0} max={1.2} step={0.05} onChange={setWang} />
          <Slider label="损失分布自由度 df" value={df} min={2.5} max={20} step={0.5} onChange={setDf} />
          <Slider label="反例违约率 p" value={pd} min={1} max={9} step={0.5} fmt={(v) => v.toFixed(1) + "%"} onChange={setPd} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={`VaR ${pct(alpha, 1)}`} value={pct(res.v)} />
          <Stat label={`ES ${pct(alpha, 1)}`} value={pct(res.e)} color={C.red} />
          <Stat label="VaR 次可加性" value={res.sub.violatesVaR ? "违反 ✗" : "满足 ✓"} color={res.sub.violatesVaR ? C.red : C.green}
            sub={`VaR(A)+VaR(B)=${res.sub.varSum.toFixed(2)} vs VaR(A+B)=${res.sub.varPool.toFixed(2)}`} />
          <Stat label="ES 次可加性" value={res.sub.violatesES ? "违反 ✗" : "满足 ✓"} color={res.sub.violatesES ? C.red : C.green}
            sub="一致性风险测度" />
        </div>
      </div>

      <Panel title="风险测度谱系 — 同一损失分布下的不同尺度 (%)">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={res.measures}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="v" name="风险值 %" radius={[4, 4, 0, 0]}>
                {res.measures.map((m, i) => <Cell key={i} fill={m.coherent ? C.gold : C.red} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">红色 = 非一致性 (VaR 缺少次可加性)；金色 = 满足单调性、平移不变、正齐次与次可加性。</p>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="谱权重 φ(u) — 越靠近 1 越重视尾部">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.sp}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="u" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="phi" name="φ(u)" stroke={C.gold} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="可引出性 — Pinball 打分在真实分位处最小 (×10⁻⁴)">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.score}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="q" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine x={+(res.v * 100).toFixed(3)} stroke={C.red} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="pinball" name="Pinball" stroke={C.blue} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">一致性四公理：</span>单调性、次可加性、正齐次性、平移不变性 (Artzner et al. 1999)。VaR 一般不满足次可加性，因此分散化可能"看起来"增加风险。</p>
        <p><span className="text-gold">可引出性：</span>VaR 可由 pinball 打分单独引出，ES 不可单独引出，但 (VaR, ES) 联合可引出 (Fissler-Ziegel)，这正是 FRTB 用 VaR 回测配合 ES 计量的原因。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 2. Volatility models + FHS ═══════════ */
export const VolFhsTool = () => {
  const [lambda, setLambda] = useState(0.94);
  const [alpha, setAlpha] = useState(0.99);
  const [horizon, setHorizon] = useState(1);
  const [shockSize, setShockSize] = useState(4);
  const [seed, setSeed] = useState(7);

  const res = useMemo(() => {
    // GARCH-like data generator with a volatility burst
    const rng = makeRng(seed);
    const n = 750;
    const rets: number[] = [];
    let v = 0.0001;
    for (let i = 0; i < n; i++) {
      const burst = i > 500 && i < 560 ? shockSize : 1;
      const r = Math.sqrt(v) * randn(rng) * burst;
      rets.push(r);
      v = 0.000002 + 0.09 * r * r + 0.89 * v;
    }
    const ew = ewmaVol(rets, lambda);
    const fit = garch11Fit(rets);
    const g = garch11Filter(rets, fit.omega, fit.alpha, fit.beta);
    const har = harVol(rets);
    const series = rets.map((r, i) => ({
      t: i,
      ret: +(r * 100).toFixed(3),
      ewma: +(ew[i] * 100).toFixed(3),
      garch: +(g.sigma[i] * 100).toFixed(3),
      har: +(har[i] * 100).toFixed(3),
    })).filter((_, i) => i % 2 === 0);

    const sNext = g.sigma[g.sigma.length - 1];
    const fhs = filteredHistoricalSim(rets, g.sigma, sNext, alpha, horizon, 20000, seed);
    const scaled = rets.map((r) => -r * Math.sqrt(horizon));
    const histVar = varOf(scaled, alpha), histEs = esOf(scaled, alpha);
    const normVar = sNext * Math.sqrt(horizon) * (alpha >= 0.99 ? 2.3263 : 1.96);

    const compare = [
      { name: "静态历史法", var: +(histVar * 100).toFixed(3), es: +(histEs * 100).toFixed(3) },
      { name: "条件正态", var: +(normVar * 100).toFixed(3), es: +(normVar * 1.15 * 100).toFixed(3) },
      { name: "FHS", var: +(fhs.var * 100).toFixed(3), es: +(fhs.es * 100).toFixed(3) },
    ];
    return { series, fit, fhs, compare, sNext, ewLast: ew[ew.length - 1], harLast: har[har.length - 1] };
  }, [lambda, alpha, horizon, shockSize, seed]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "RiskMetrics λ=0.94", description: "日频标准", apply: () => { setLambda(0.94); setHorizon(1); } },
        { name: "10 日监管持有期", description: "Basel MRA", apply: () => { setHorizon(10); setAlpha(0.99); } },
        { name: "危机爆发", description: "波动率 6× 冲击", apply: () => { setShockSize(6); } },
        { name: "平静市场", description: "无冲击", apply: () => { setShockSize(1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">建模参数</p>
          <Slider label="EWMA 衰减 λ" value={lambda} min={0.85} max={0.99} step={0.005} onChange={setLambda} />
          <Slider label="置信水平 α" value={alpha} min={0.9} max={0.999} step={0.005} fmt={(v) => pct(v, 1)} onChange={setAlpha} />
          <Slider label="持有期 h (天)" value={horizon} min={1} max={20} step={1} fmt={(v) => v.toFixed(0)} onChange={setHorizon} />
          <Slider label="冲击幅度" sub="制造波动率簇" value={shockSize} min={1} max={8} step={0.5} onChange={setShockSize} />
          <Slider label="随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="GARCH ω / α / β" value={`${res.fit.alpha.toFixed(3)} / ${res.fit.beta.toFixed(3)}`} sub={`持续性 ${res.fit.persistence.toFixed(3)}`} />
          <Stat label="条件波动率预测" value={pct(res.sNext)} color={C.blue} sub="日频 σ_{t+1}" />
          <Stat label={`FHS VaR ${pct(alpha, 1)}`} value={pct(res.fhs.var)} color={C.gold} />
          <Stat label={`FHS ES ${pct(alpha, 1)}`} value={pct(res.fhs.es)} color={C.red} />
        </div>
      </div>

      <Panel title="条件波动率对比 — EWMA / GARCH(1,1) / HAR (%)">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={res.series}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="ret" name="收益率" fill={C.grid} stroke={C.grid} />
              <Line type="monotone" dataKey="ewma" name="EWMA" stroke={C.gold} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="garch" name="GARCH" stroke={C.red} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="har" name="HAR" stroke={C.teal} strokeWidth={1.6} dot={false} strokeDasharray="4 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="FHS 损失分布">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={res.fhs.hist}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 9 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine x={+res.fhs.var.toFixed(4)} stroke={C.red} strokeDasharray="3 3" />
                <Bar dataKey="n" fill={C.blue} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="方法对比 — VaR / ES (%)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={res.compare}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="var" name="VaR" fill={C.gold} radius={[3, 3, 0, 0]} />
                <Bar dataKey="es" name="ES" fill={C.red} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">过滤式历史模拟 (FHS)：</span>用 GARCH 条件波动率标准化历史收益得到 z_t，再自助抽样并用当前 σ_{"{t+1}"} 还原，兼顾"厚尾非参数形状"与"波动率聚集"。</p>
        <p><span className="text-gold">为何静态历史法失灵：</span>平静期样本会低估危机风险，危机后又长期高估——风险度量必须是条件的。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 3. PD / LGD / EAD + IRB ═══════════ */
export const IrbCapitalTool = () => {
  const [pd, setPd] = useState(1.5);
  const [lgd, setLgd] = useState(45);
  const [ead, setEad] = useState(100);
  const [maturity, setMaturity] = useState(2.5);
  const [kind, setKind] = useState<"corporate" | "sme" | "retail_mortgage" | "retail_other">("corporate");
  const [z, setZ] = useState(0);

  const res = useMemo(() => {
    const out = irbCapital({ pd: pd / 100, lgd: lgd / 100, ead, maturity, kind, sales: 25 });
    const curve: { pd: number; k: number; rw: number; corr: number }[] = [];
    for (let p = 0.05; p <= 15; p += 0.25) {
      const r = irbCapital({ pd: p / 100, lgd: lgd / 100, ead: 1, maturity, kind, sales: 25 });
      curve.push({ pd: +p.toFixed(2), k: +(r.k * 100).toFixed(3), rw: +(r.k * 12.5 * 100).toFixed(2), corr: +(r.correlation * 100).toFixed(2) });
    }
    const q: { conf: number; loss: number }[] = [];
    for (const c of [0.9, 0.95, 0.99, 0.995, 0.999, 0.9997]) {
      q.push({ conf: c * 100, loss: +(vasicekLossQuantile(pd / 100, out.correlation, c, lgd / 100) * 100).toFixed(3) });
    }
    const pit = pitPd(pd / 100, out.correlation, z);
    const pitOut = irbCapital({ pd: pit, lgd: lgd / 100, ead, maturity, kind, sales: 25 });
    const cyc: { z: number; pd: number; rwa: number }[] = [];
    for (let zz = -3; zz <= 3; zz += 0.25) {
      const p = pitPd(pd / 100, out.correlation, zz);
      cyc.push({ z: +zz.toFixed(2), pd: +(p * 100).toFixed(3), rwa: +irbCapital({ pd: p, lgd: lgd / 100, ead, maturity, kind, sales: 25 }).rwa.toFixed(2) });
    }
    return { out, curve, q, pit, pitOut, cyc };
  }, [pd, lgd, ead, maturity, kind, z]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "投资级公司 (PD 0.3%)", description: "BBB 区间", apply: () => { setPd(0.3); setLgd(45); setMaturity(2.5); setKind("corporate"); } },
        { name: "高收益 (PD 5%)", description: "B 区间", apply: () => { setPd(5); setLgd(60); setKind("corporate"); } },
        { name: "住房按揭", description: "R=15% 固定", apply: () => { setKind("retail_mortgage"); setPd(1); setLgd(25); } },
        { name: "衰退情景 z=-2", description: "PIT 顺周期", apply: () => { setZ(-2); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">风险参数</p>
          <div className="flex flex-wrap gap-2">
            {([["corporate", "公司"], ["sme", "中小企业"], ["retail_mortgage", "住房按揭"], ["retail_other", "其他零售"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setKind(k)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono transition-colors ${kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                {l}
              </button>
            ))}
          </div>
          <Slider label="违约概率 PD" value={pd} min={0.03} max={15} step={0.01} fmt={(v) => v.toFixed(2) + "%"} onChange={setPd} />
          <Slider label="违约损失率 LGD" value={lgd} min={5} max={100} step={1} fmt={(v) => v.toFixed(0) + "%"} onChange={setLgd} />
          <Slider label="违约风险敞口 EAD" value={ead} min={10} max={500} step={10} fmt={(v) => v.toFixed(0)} onChange={setEad} />
          <Slider label="有效期限 M (年)" value={maturity} min={1} max={5} step={0.25} onChange={setMaturity} />
          <Slider label="宏观状态 z" sub="负值=衰退" value={z} min={-3} max={3} step={0.25} onChange={setZ} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="预期损失 EL" value={res.out.el.toFixed(3)} sub="PD × LGD × EAD" />
          <Stat label="资产相关性 R" value={pct(res.out.correlation)} color={C.teal} />
          <Stat label="条件 PD (99.9%)" value={pct(res.out.conditionalPd)} color={C.red} />
          <Stat label="资本要求 K" value={pct(res.out.k)} color={C.gold} sub={`期限调整 ${res.out.maturityAdj.toFixed(3)}`} />
          <Stat label="RWA" value={res.out.rwa.toFixed(2)} sub={`风险权重 ${pct(res.out.k * 12.5)}`} />
          <Stat label={`PIT PD (z=${z})`} value={pct(res.pit)} color={res.pit > pd / 100 ? C.red : C.green} sub={`RWA ${res.pitOut.rwa.toFixed(1)}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="IRB 风险权重函数 — K(PD) 与相关性 R(PD)">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.curve}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="pd" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "PD %", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="l" type="monotone" dataKey="rw" name="风险权重 %" stroke={C.gold} strokeWidth={2.5} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="corr" name="相关性 R %" stroke={C.teal} strokeWidth={2} dot={false} strokeDasharray="4 3" />
                <ReferenceLine yAxisId="l" x={+pd.toFixed(2)} stroke={C.red} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="顺周期性 — 宏观状态 z 对 PIT PD 与 RWA 的放大">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.cyc}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="z" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="l" type="monotone" dataKey="pd" name="PIT PD %" stroke={C.red} strokeWidth={2.5} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="rwa" name="RWA" stroke={C.blue} strokeWidth={2} dot={false} />
                <ReferenceLine yAxisId="l" x={z} stroke={C.gold} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Vasicek 组合损失分位 (%)">
        <table className="w-full text-xs font-mono border-collapse">
          <thead><tr className="text-gold text-left"><th className="p-2 border-b border-border">置信水平</th><th className="p-2 border-b border-border">组合损失率</th><th className="p-2 border-b border-border">超出 EL 的非预期损失</th></tr></thead>
          <tbody className="text-muted-foreground">
            {res.q.map((r) => (
              <tr key={r.conf}>
                <td className="p-2 border-b border-border/40 text-foreground">{r.conf.toFixed(2)}%</td>
                <td className="p-2 border-b border-border/40">{r.loss.toFixed(3)}%</td>
                <td className="p-2 border-b border-border/40" style={{ color: C.gold }}>{(r.loss - (pd * lgd) / 100).toFixed(3)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Note>
        <p><span className="text-gold">监管资本只覆盖非预期损失：</span>EL 由拨备与定价吸收，K = LGD·[Φ((Φ⁻¹(PD)+√R Φ⁻¹(0.999))/√(1−R)) − PD] × 期限调整，RWA = 12.5·K·EAD。</p>
        <p><span className="text-gold">顺周期陷阱：</span>PIT PD 在衰退中飙升 → RWA 上升 → 资本紧张 → 收缩信贷，这正是逆周期缓冲与 TTC 评级要缓解的问题。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 4. Migration & CreditMetrics ═══════════ */
export const MigrationCreditMetricsTool = () => {
  const [ratingIdx, setRatingIdx] = useState(4);
  const [rho, setRho] = useState(0.2);
  const [n, setN] = useState(50);
  const [lgd, setLgd] = useState(60);
  const [years, setYears] = useState(1);
  const [maturity, setMaturity] = useState(5);

  const res = useMemo(() => {
    const P = matPow(SP_MIGRATION, years);
    const Q = generatorFromP(SP_MIGRATION);
    const cm = creditMetrics({ ratingIdx, n, rho, lgd: lgd / 100, horizonYears: years, maturity, notional: 1, nSims: 3000, seed: 17 });
    const dist = P[ratingIdx].map((p, j) => ({ rating: RATING_LABELS[j], p: +(p * 100).toFixed(3) }));
    const term = [1, 2, 3, 5, 7, 10].map((h) => {
      const Ph = matPow(SP_MIGRATION, h);
      return { h, ...Object.fromEntries([3, 4, 5, 6].map((i) => [RATING_LABELS[i], +(Ph[i][7] * 100).toFixed(3)])) };
    });
    return { P, Q, cm, dist, term };
  }, [ratingIdx, rho, n, lgd, years, maturity]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "投资级组合 (BBB)", description: "低迁移风险", apply: () => { setRatingIdx(3); setRho(0.15); setYears(1); } },
        { name: "高收益组合 (B)", description: "违约主导", apply: () => { setRatingIdx(5); setRho(0.25); setLgd(65); } },
        { name: "危机相关性 ρ=0.6", description: "尾部集中", apply: () => { setRho(0.6); } },
        { name: "5 年展望", description: "迁移累积", apply: () => { setYears(5); setMaturity(8); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">组合设定</p>
          <div className="flex flex-wrap gap-1.5">
            {RATING_LABELS.slice(0, 7).map((r, i) => (
              <button key={r} onClick={() => setRatingIdx(i)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono ${ratingIdx === i ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{r}</button>
            ))}
          </div>
          <Slider label="资产相关性 ρ" value={rho} min={0.01} max={0.7} step={0.01} onChange={setRho} />
          <Slider label="债项数量 N" value={n} min={10} max={200} step={5} fmt={(v) => v.toFixed(0)} onChange={setN} />
          <Slider label="LGD" value={lgd} min={10} max={100} step={5} fmt={(v) => v.toFixed(0) + "%"} onChange={setLgd} />
          <Slider label="持有期 (年)" value={years} min={1} max={7} step={1} fmt={(v) => v.toFixed(0)} onChange={setYears} />
          <Slider label="债券到期 (年)" value={maturity} min={2} max={12} step={1} fmt={(v) => v.toFixed(0)} onChange={setMaturity} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="期望损失" value={res.cm.mean.toFixed(3)} />
          <Stat label="信用 VaR 99%" value={res.cm.creditVar.toFixed(3)} color={C.gold} sub="分位 − 均值" />
          <Stat label="ES 99%" value={res.cm.es99.toFixed(3)} color={C.red} />
          <Stat label="违约 vs 迁移损失" value={`${res.cm.defaultLoss.toFixed(2)} / ${res.cm.migrationLoss.toFixed(2)}`} color={C.teal} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title={`${years} 年后评级分布 (%) — 起始 ${RATING_LABELS[ratingIdx]}`}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={res.dist}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="rating" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="p" name="概率 %" radius={[3, 3, 0, 0]}>
                  {res.dist.map((d, i) => <Cell key={i} fill={i === 7 ? C.red : i === ratingIdx ? C.gold : C.blue} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="累积违约概率期限结构 (%)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.term}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="h" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "年", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="BBB" stroke={C.blue} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="BB" stroke={C.teal} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="B" stroke={C.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="CCC" stroke={C.red} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="组合价值损失分布 (CreditMetrics 阈值模型)">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={res.cm.hist}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="x" stroke={C.text} tick={{ fontSize: 9 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={+res.cm.var99.toFixed(2)} stroke={C.red} strokeDasharray="3 3" />
              <Bar dataKey="n" fill={C.gold} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2">损失分布严重右偏：这是信用组合与市场风险最本质的差别，均值—方差在此失效。</p>
      </Panel>

      <Note>
        <p><span className="text-gold">阈值模型：</span>把评级迁移映射到潜变量 x = √ρ·m + √(1−ρ)·ε 的分割区间，单因子 m 制造相关性；违约只是最差的一档迁移。</p>
        <p><span className="text-gold">生成元 Q = log P：</span>可把年度矩阵一致地插值到任意期限，并保证行和为零、非对角非负 (JLT 正则化)。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 5. Funding liquidity & spiral ═══════════ */
export const FundingSpiralTool = () => {
  const [leverage, setLeverage] = useState(10);
  const [haircut, setHaircut] = useState(8);
  const [haircutShock, setHaircutShock] = useState(3);
  const [impact, setImpact] = useState(0.6);
  const [shock, setShock] = useState(3);
  const [outflow, setOutflow] = useState(3);

  const res = useMemo(() => {
    const assets = 100, equity = assets / leverage;
    const spiral = deleveragingSpiral({
      assets, equity, haircut: haircut / 100, haircutShock: haircutShock / 100,
      priceImpact: impact, shock: shock / 100, rounds: 10,
    });
    const surv = survivalHorizon(5, 40, haircut / 100, outflow, 6, 30);
    const sensitivity = [0.2, 0.5, 1, 1.5, 2].map((pi) => ({
      impact: pi,
      amp: +deleveragingSpiral({ assets, equity, haircut: haircut / 100, haircutShock: haircutShock / 100, priceImpact: pi, shock: shock / 100, rounds: 10 }).amplification.toFixed(3),
    }));
    return { spiral, surv, sensitivity, equity };
  }, [leverage, haircut, haircutShock, impact, shock, outflow]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "LTCM 1998", description: "极高杠杆 + 折扣飙升", apply: () => { setLeverage(25); setHaircut(5); setHaircutShock(6); setImpact(1.2); setShock(4); } },
        { name: "2008 回购挤兑", description: "抵押品折扣冲击", apply: () => { setLeverage(30); setHaircut(3); setHaircutShock(8); setImpact(1.0); setShock(5); } },
        { name: "稳健银行", description: "杠杆 10×", apply: () => { setLeverage(10); setHaircut(10); setHaircutShock(2); setImpact(0.3); setShock(2); } },
        { name: "2020 现金为王", description: "赎回潮", apply: () => { setOutflow(8); setImpact(0.9); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">资产负债表与市场</p>
          <Slider label="初始杠杆 (倍)" value={leverage} min={3} max={40} step={1} fmt={(v) => v.toFixed(0) + "×"} onChange={setLeverage} />
          <Slider label="初始折扣率 haircut" value={haircut} min={1} max={25} step={0.5} fmt={(v) => v.toFixed(1) + "%"} onChange={setHaircut} />
          <Slider label="每轮折扣上升" value={haircutShock} min={0} max={10} step={0.5} fmt={(v) => v.toFixed(1) + "%"} onChange={setHaircutShock} />
          <Slider label="价格冲击系数 λ" value={impact} min={0.05} max={2} step={0.05} onChange={setImpact} />
          <Slider label="初始资产冲击" value={shock} min={0.5} max={10} step={0.5} fmt={(v) => v.toFixed(1) + "%"} onChange={setShock} />
          <Slider label="日均资金流出" value={outflow} min={0.5} max={12} step={0.5} onChange={setOutflow} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="初始权益" value={res.equity.toFixed(2)} sub="资产 100" />
          <Stat label="放大倍数" value={res.spiral.amplification.toFixed(2) + "×"} color={res.spiral.amplification > 2 ? C.red : C.gold} sub="总损失 / 直接损失" />
          <Stat label="被迫抛售总额" value={res.spiral.totalSales.toFixed(2)} color={C.blue} />
          <Stat label="终局状态" value={res.spiral.insolvent ? "资不抵债" : `杠杆 ${res.spiral.finalLeverage.toFixed(1)}×`} color={res.spiral.insolvent ? C.red : C.green} />
          <Stat label="生存天数" value={`${res.surv.survivalDays} 天`} color={res.surv.survivalDays < 30 ? C.red : C.green} sub="30 日压力窗口" />
          <Stat label="终局价格" value={pct(res.spiral.path.at(-1)?.price ?? 1)} color={C.teal} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="去杠杆螺旋 — 权益、抛售与价格">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={res.spiral.path}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="round" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "轮次", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" stroke={C.text} tick={{ fontSize: 10 }} domain={[0, 1]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="l" dataKey="sales" name="被迫抛售" fill={C.blue} radius={[3, 3, 0, 0]} />
                <Line yAxisId="l" type="monotone" dataKey="equity" name="权益" stroke={C.gold} strokeWidth={2.5} dot={false} />
                <Line yAxisId="r" type="monotone" dataKey="price" name="价格" stroke={C.red} strokeWidth={2} dot={false} strokeDasharray="4 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="流动性生存曲线 (30 日压力)">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.surv.path}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={0} stroke={C.red} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="liquidity" name="可用流动性" stroke={C.teal} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="价格冲击敏感度 — 放大倍数">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={res.sensitivity}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="impact" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="amp" name="放大倍数" fill={C.gold} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">两条螺旋：</span>损失螺旋 (亏损 → 杠杆被动上升 → 抛售) 与保证金螺旋 (折扣上升 → 融资能力下降 → 抛售)，二者互相强化 (Brunnermeier & Pedersen 2009)。</p>
        <p><span className="text-gold">启示：</span>流动性风险无法用单一 VaR 数字表达，必须同时看融资结构、抵押品质量与市场深度。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 6. Basel capital stack + LCR / NSFR ═══════════ */
export const BaselStackTool = () => {
  const [cet1, setCet1] = useState(11);
  const [at1, setAt1] = useState(1.8);
  const [t2, setT2] = useState(2.5);
  const [rwa, setRwa] = useState(100);
  const [exposure, setExposure] = useState(320);
  const [ccyb, setCcyb] = useState(1);
  const [gsib, setGsib] = useState(1);
  const [hqla, setHqla] = useState(58);
  const [outflow, setOutflow] = useState(50);
  const [asf, setAsf] = useState(108);
  const [rsf, setRsf] = useState(100);

  const res = useMemo(() => baselCapitalStack({
    cet1, at1, t2, rwa, exposure, ccyb: ccyb / 100, gsib: gsib / 100,
    hqla, netOutflows: outflow, asf, rsf,
  }), [cet1, at1, t2, rwa, exposure, ccyb, gsib, hqla, outflow, asf, rsf]);

  const stack = [
    { name: "最低 CET1", v: 4.5 }, { name: "留存缓冲 CCB", v: 2.5 },
    { name: "逆周期 CCyB", v: ccyb }, { name: "G-SIB 附加", v: gsib },
    { name: "实际 CET1", v: +(res.cet1Ratio * 100).toFixed(2) },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "达标大行", description: "全部通过", apply: () => { setCet1(13); setHqla(65); setAsf(115); } },
        { name: "缓冲被侵蚀", description: "触发 MDA", apply: () => { setCet1(7.5); setCcyb(1); setGsib(1.5); } },
        { name: "流动性告急", description: "LCR < 100%", apply: () => { setHqla(38); setOutflow(55); } },
        { name: "杠杆过高", description: "杠杆率 < 3%", apply: () => { setExposure(500); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">资本与流动性</p>
          <Slider label="CET1 (核心一级)" value={cet1} min={3} max={20} step={0.1} onChange={setCet1} />
          <Slider label="AT1 (其他一级)" value={at1} min={0} max={5} step={0.1} onChange={setAt1} />
          <Slider label="Tier 2 (二级)" value={t2} min={0} max={6} step={0.1} onChange={setT2} />
          <Slider label="RWA" value={rwa} min={60} max={160} step={5} fmt={(v) => v.toFixed(0)} onChange={setRwa} />
          <Slider label="杠杆敞口" value={exposure} min={150} max={600} step={10} fmt={(v) => v.toFixed(0)} onChange={setExposure} />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">缓冲与监管比率</p>
          <Slider label="逆周期缓冲 CCyB" value={ccyb} min={0} max={2.5} step={0.25} fmt={(v) => v.toFixed(2) + "%"} onChange={setCcyb} />
          <Slider label="G-SIB 附加资本" value={gsib} min={0} max={3.5} step={0.25} fmt={(v) => v.toFixed(2) + "%"} onChange={setGsib} />
          <Slider label="HQLA" value={hqla} min={20} max={120} step={2} fmt={(v) => v.toFixed(0)} onChange={setHqla} />
          <Slider label="30 日净现金流出" value={outflow} min={20} max={100} step={2} fmt={(v) => v.toFixed(0)} onChange={setOutflow} />
          <Slider label="可用稳定资金 ASF" value={asf} min={60} max={160} step={2} fmt={(v) => v.toFixed(0)} onChange={setAsf} />
          <Slider label="所需稳定资金 RSF" value={rsf} min={60} max={160} step={2} fmt={(v) => v.toFixed(0)} onChange={setRsf} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="CET1 比率" value={pct(res.cet1Ratio)} color={res.cet1Ratio >= res.cet1Required ? C.green : C.red} sub={`要求 ${pct(res.cet1Required)}`} />
        <Stat label="一级资本比率" value={pct(res.tier1Ratio)} sub={`要求 ${pct(res.tier1Required)}`} />
        <Stat label="总资本比率" value={pct(res.totalRatio)} sub={`要求 ${pct(res.totalRequired)}`} />
        <Stat label="杠杆率" value={pct(res.leverageRatio)} color={res.leverageRatio >= 0.03 ? C.green : C.red} sub="要求 3%" />
        <Stat label="LCR" value={pct(res.lcr, 0)} color={res.lcr >= 1 ? C.green : C.red} />
        <Stat label="NSFR" value={pct(res.nsfr, 0)} color={res.nsfr >= 1 ? C.green : C.red} />
        <Stat label="资本盈余" value={res.surplus.toFixed(2)} color={res.surplus >= 0 ? C.gold : C.red} />
        <Stat label="MDA 分红上限" value={res.mdaTrigger ? pct(res.mdaPayoutCap, 0) : "无限制"} color={res.mdaTrigger ? C.red : C.green} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="资本栈 — 要求 vs 实际 (% RWA)">
          <div className="h-[230px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stack} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} width={90} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="v" name="% RWA" radius={[0, 3, 3, 0]}>
                  {stack.map((s, i) => <Cell key={i} fill={i === stack.length - 1 ? (res.mdaTrigger ? C.red : C.green) : C.blue} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="合规检查表">
          <table className="w-full text-xs font-mono border-collapse">
            <thead><tr className="text-gold text-left"><th className="p-2 border-b border-border">指标</th><th className="p-2 border-b border-border">实际</th><th className="p-2 border-b border-border">要求</th><th className="p-2 border-b border-border">结论</th></tr></thead>
            <tbody className="text-muted-foreground">
              {res.checks.map((c) => (
                <tr key={c.name}>
                  <td className="p-2 border-b border-border/40 text-foreground">{c.name}</td>
                  <td className="p-2 border-b border-border/40">{pct(c.value)}</td>
                  <td className="p-2 border-b border-border/40">{pct(c.required)}</td>
                  <td className="p-2 border-b border-border/40" style={{ color: c.pass ? C.green : C.red }}>{c.pass ? "达标 ✓" : "未达标 ✗"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">Basel III 三条腿：</span>风险加权资本 (质量 + 缓冲)、非风险加权的杠杆率、以及 LCR / NSFR 两个流动性比率——任何一条单独都不足以描述韧性。</p>
        <p><span className="text-gold">MDA：</span>综合缓冲被侵蚀后按四分位限制分红与奖金，把"资本约束"变成可执行的自动机制。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 7. Model risk & robust decisions ═══════════ */
const GOVERNANCE = [
  { line: "第一道防线 · 业务与建模", items: ["模型开发文档与假设登记", "数据质量与代表性检查", "限额内自查与用户培训"] },
  { line: "第二道防线 · 独立验证", items: ["概念稳健性审查", "结果复算与基准模型对比", "持续监控与回测触发点"] },
  { line: "第三道防线 · 内审与治理", items: ["模型清单完整性", "验证独立性与整改跟踪", "董事会风险偏好一致性"] },
];

export const ModelRiskTool = () => {
  const [eps, setEps] = useState(0.15);
  const [stressMult, setStressMult] = useState(1.4);
  const [df, setDf] = useState(4);
  const [window, setWindow] = useState(500);

  const res = useMemo(() => {
    const losses = lossSample(Math.round(window), 0.02, df, 29);
    const alpha = 0.99;
    const hist = varOf(losses, alpha);
    const mean = losses.reduce((a, b) => a + b, 0) / losses.length;
    const sd = Math.sqrt(losses.reduce((s, v) => s + (v - mean) ** 2, 0) / losses.length);
    const models = [
      { name: "正态 VaR", var: mean + 2.3263 * sd, es: mean + 2.665 * sd, weight: 1 },
      { name: "历史模拟", var: hist, es: esOf(losses, alpha), weight: 1.5 },
      { name: "t 分布", var: mean + sd * 2.3263 * Math.sqrt(df / Math.max(1, df - 2)), es: mean + sd * 3.1, weight: 1.2 },
      { name: "EWMA-正态", var: mean + 2.3263 * sd * 1.15, es: mean + 2.665 * sd * 1.15, weight: 1 },
      { name: "EVT-POT", var: hist * 1.25, es: hist * 1.6, weight: 1.3 },
    ];
    const band = modelRiskBand(models, eps, stressMult);
    const chart = models.map((m) => ({ name: m.name, var: +(m.var * 100).toFixed(3), es: +(m.es * 100).toFixed(3) }));
    // model dispersion as a function of sample window
    const disp: { n: number; spread: number }[] = [];
    for (const w of [125, 250, 500, 750, 1000, 1500]) {
      const l = lossSample(w, 0.02, df, 29);
      const h = varOf(l, alpha);
      const m2 = l.reduce((a, b) => a + b, 0) / l.length;
      const s2 = Math.sqrt(l.reduce((s, v) => s + (v - m2) ** 2, 0) / l.length);
      const vs = [m2 + 2.3263 * s2, h, h * 1.25];
      disp.push({ n: w, spread: +(((Math.max(...vs) - Math.min(...vs)) / (vs.reduce((a, b) => a + b, 0) / 3)) * 100).toFixed(2) });
    }
    return { band, chart, disp };
  }, [eps, stressMult, df, window]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "SR 11-7 保守", description: "ε=25%", apply: () => { setEps(0.25); setStressMult(1.6); } },
        { name: "常态治理", description: "ε=10%", apply: () => { setEps(0.1); setStressMult(1.3); } },
        { name: "短样本风险", description: "125 日窗口", apply: () => { setWindow(125); } },
        { name: "极端厚尾", description: "df=2.5", apply: () => { setDf(2.5); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">不确定性设定</p>
          <Slider label="模糊权重 ε" sub="ε-污染" value={eps} min={0} max={0.5} step={0.01} onChange={setEps} />
          <Slider label="压力倍数" value={stressMult} min={1} max={2.5} step={0.05} onChange={setStressMult} />
          <Slider label="损失分布 df" value={df} min={2.5} max={20} step={0.5} onChange={setDf} />
          <Slider label="估计样本窗口" value={window} min={125} max={1500} step={25} fmt={(v) => v.toFixed(0)} onChange={setWindow} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="模型分歧带" value={`${(res.band.min * 100).toFixed(2)}% – ${(res.band.max * 100).toFixed(2)}%`} color={C.blue} />
          <Stat label="相对分歧" value={pct(res.band.relSpread, 1)} color={res.band.relSpread > 0.3 ? C.red : C.gold} />
          <Stat label="加权共识 VaR" value={pct(res.band.weightedAverage)} />
          <Stat label="稳健 (ε-污染) VaR" value={pct(res.band.contaminated)} color={C.red} sub={`模型风险附加 ${pct(res.band.buffer)}`} />
        </div>
      </div>

      <Panel title="竞争模型的 VaR / ES 分歧 (%)">
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={res.chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={+(res.band.contaminated * 100).toFixed(3)} stroke={C.red} strokeDasharray="4 3" label={{ value: "稳健上界", fill: C.red, fontSize: 10 }} />
              <Bar dataKey="var" name="VaR" fill={C.gold} radius={[3, 3, 0, 0]} />
              <Bar dataKey="es" name="ES" fill={C.teal} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="样本长度与估计不确定性 (相对分歧 %)">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={res.disp}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="n" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="spread" name="相对分歧 %" stroke={C.red} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="模型风险治理 — 三道防线 (SR 11-7 / OCC 2011-12)">
          <div className="space-y-2">
            {GOVERNANCE.map((g) => (
              <div key={g.line} className="rounded-lg border border-border bg-secondary/30 p-3">
                <p className="text-[11px] font-mono text-gold mb-1">{g.line}</p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  {g.items.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">ε-污染稳健准则：</span>ρ_ε = (1−ε)·ρ_基准 + ε·ρ_压力，用于把"我们不知道哪个模型对"直接翻译成资本附加，而不是挑一个最好看的数字。</p>
        <p><span className="text-gold">模型即风险源：</span>Knightian 不确定性下，模型分歧带本身就是决策信息；分歧越大，越应降低杠杆、扩大缓冲而不是精修参数。</p>
      </Note>
    </div>
  );
};

/* ═══════════ 8. Resilience & recovery planning ═══════════ */
export const ResilienceTool = () => {
  const [cet1, setCet1] = useState(12);
  const [ppnr, setPpnr] = useState(0.45);
  const [peakLoss, setPeakLoss] = useState(1.8);
  const [rwaGrowth, setRwaGrowth] = useState(1.5);
  const [dividend, setDividend] = useState(40);
  const [buffer, setBuffer] = useState(3.5);
  const [release, setRelease] = useState(0);
  const [actions, setActions] = useState(true);

  const res = useMemo(() => {
    const shape = [0.5, 0.8, 1, 1, 0.85, 0.6, 0.45, 0.3, 0.25];
    const lossPath = shape.map((s) => s * peakLoss);
    const cfg = {
      cet1, rwa: 100, quarters: 9, ppnr, lossPath,
      rwaGrowth: rwaGrowth / 100, dividend: dividend / 100,
      buffer: buffer / 100, ccybRelease: release / 100,
    };
    const base = capitalTrajectory(cfg);
    const managed = capitalTrajectory({ ...cfg, mgmtActions: true });
    const active = actions ? managed : base;
    const chart = active.path.map((p, i) => ({
      q: `Q${p.q}`, ratio: p.ratio, requirement: p.requirement,
      base: base.path[i].ratio, loss: +p.loss.toFixed(2), ppnr: +p.ppnr.toFixed(2),
    }));
    return { active, base, managed, chart };
  }, [cet1, ppnr, peakLoss, rwaGrowth, dividend, buffer, release, actions]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: "CCAR 严重不利", description: "峰值损失 2.5%", apply: () => { setPeakLoss(2.5); setPpnr(0.35); setRwaGrowth(2); } },
        { name: "温和衰退", description: "峰值损失 1.0%", apply: () => { setPeakLoss(1.0); setPpnr(0.5); } },
        { name: "释放逆周期缓冲", description: "CCyB -1.5%", apply: () => { setRelease(1.5); } },
        { name: "停发股息", description: "分红 0", apply: () => { setDividend(0); setActions(true); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">压力路径</p>
          <Slider label="起始 CET1 (% RWA)" value={cet1} min={6} max={18} step={0.25} onChange={setCet1} />
          <Slider label="季度 PPNR (% RWA)" value={ppnr} min={0} max={1.2} step={0.05} onChange={setPpnr} />
          <Slider label="峰值季度损失 (% RWA)" value={peakLoss} min={0.3} max={3.5} step={0.1} onChange={setPeakLoss} />
          <Slider label="RWA 季度增长" value={rwaGrowth} min={-2} max={5} step={0.25} fmt={(v) => v.toFixed(2) + "%"} onChange={setRwaGrowth} />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">缓冲与管理行动</p>
          <Slider label="分红比例" value={dividend} min={0} max={80} step={5} fmt={(v) => v.toFixed(0) + "%"} onChange={setDividend} />
          <Slider label="综合缓冲要求" value={buffer} min={0} max={6} step={0.25} fmt={(v) => v.toFixed(2) + "%"} onChange={setBuffer} />
          <Slider label="逆周期缓冲释放" value={release} min={0} max={2.5} step={0.25} fmt={(v) => v.toFixed(2) + "%"} onChange={setRelease} />
          <button onClick={() => setActions((a) => !a)}
            className={`w-full px-3 py-2 rounded-lg text-xs font-mono transition-colors ${actions ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {actions ? "管理行动：已启用 (停分红 + 缩表)" : "管理行动：关闭"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat label="最低 CET1 (谷底)" value={pct(res.active.trough)} color={res.active.passes ? C.green : C.red} sub={`第 ${res.active.troughQuarter} 季度`} />
        <Stat label="资本回撤" value={`${res.active.drawdownBps.toFixed(0)} bps`} color={C.gold} />
        <Stat label="触发要求" value={pct(res.active.minRequirement)} color={C.teal} />
        <Stat label="压测结论" value={res.active.passes ? "通过" : `${res.active.breaches} 季度突破`} color={res.active.passes ? C.green : C.red} />
      </div>

      <Panel title="资本轨道 — CET1 比率 vs 触发线 (%)">
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={res.chart}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="q" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="r" orientation="right" stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="r" dataKey="loss" name="季度损失" fill={C.red} radius={[3, 3, 0, 0]} opacity={0.6} />
              <Bar yAxisId="r" dataKey="ppnr" name="拨备前利润" fill={C.teal} radius={[3, 3, 0, 0]} opacity={0.6} />
              <Line yAxisId="l" type="monotone" dataKey="ratio" name="CET1 (含行动)" stroke={C.gold} strokeWidth={2.8} dot={{ r: 3 }} />
              <Line yAxisId="l" type="monotone" dataKey="base" name="CET1 (无行动)" stroke={C.blue} strokeWidth={1.8} dot={false} strokeDasharray="4 3" />
              <Line yAxisId="l" type="monotone" dataKey="requirement" name="要求" stroke={C.red} strokeWidth={2} dot={false} strokeDasharray="5 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="恢复计划触发与行动阶梯">
        <table className="w-full text-xs font-mono border-collapse">
          <thead><tr className="text-gold text-left">
            <th className="p-2 border-b border-border">季度</th><th className="p-2 border-b border-border">CET1</th>
            <th className="p-2 border-b border-border">要求</th><th className="p-2 border-b border-border">分红</th>
            <th className="p-2 border-b border-border">状态</th></tr></thead>
          <tbody className="text-muted-foreground">
            {res.active.path.map((p) => (
              <tr key={p.q}>
                <td className="p-2 border-b border-border/40 text-foreground">Q{p.q}</td>
                <td className="p-2 border-b border-border/40">{p.ratio.toFixed(2)}%</td>
                <td className="p-2 border-b border-border/40">{p.requirement.toFixed(2)}%</td>
                <td className="p-2 border-b border-border/40">{p.dividend.toFixed(2)}</td>
                <td className="p-2 border-b border-border/40" style={{ color: p.breach ? C.red : C.green }}>{p.breach ? "触发恢复计划" : "正常"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Note>
        <p><span className="text-gold">韧性 ≠ 更高的静态资本：</span>关键在于损失吸收顺序 (利润 → 分红削减 → 缓冲 → 最低要求) 与行动的及时性。</p>
        <p><span className="text-gold">逆周期性：</span>缓冲在繁荣期累积、危机中释放，才能避免"资本要求在最坏时点最紧"的悖论。</p>
      </Note>
    </div>
  );
};
