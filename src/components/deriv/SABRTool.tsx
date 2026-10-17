import { useTranslation } from "react-i18next";
import { useState, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, ScatterChart, Scatter,
} from "recharts";
import "katex/dist/katex.min.css";
import PresetButtons from "../PresetButtons";

const CHART_GOLD = "hsl(43, 80%, 55%)";
const CHART_TEAL = "hsl(180, 50%, 40%)";
const CHART_RED = "hsl(0, 70%, 55%)";
const CHART_BLUE = "hsl(220, 70%, 55%)";
const CHART_GRID = "hsl(var(--border))";
const CHART_TEXT = "hsl(var(--muted-foreground))";

const sliderClass =
  "w-full h-1.5 rounded-full appearance-none cursor-pointer bg-secondary accent-gold [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gold";

const Slider = ({ label, sub, value, min, max, step, onChange }: {
  label: string; sub?: string;
  value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-xs text-secondary-foreground font-medium">
        {label}{sub && <span className="text-muted-foreground ml-1.5 text-[10px]">{sub}</span>}
      </label>
      <span className="text-xs font-mono text-gold tabular-nums">
        {value.toFixed(step >= 1 ? 0 : step >= 0.1 ? 2 : 3)}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))} className={sliderClass} />
  </div>
);

const Stat = ({ label, value, color = "hsl(var(--gold))", sub }: { label: string; value: string; color?: string; sub?: string }) => (
  <div className="rounded-lg bg-secondary/40 border border-border p-3">
    <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-lg font-mono tabular-nums" style={{ color }}>{value}</p>
    {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
  </div>
);

/**
 * Hagan et al. (2002) SABR implied Black volatility (lognormal) approximation.
 * Returns σ_B(K, F, T) for the SABR model:
 *   dF = α F^β dW1, dα = ν α dW2, Corr(dW1,dW2) = ρ.
 */
function sabrIV(F: number, K: number, T: number, alpha: number, beta: number, rho: number, nu: number): number {
  if (F <= 0 || K <= 0 || alpha <= 0) return NaN;
  const eps = 1e-7;
  const oneMb = 1 - beta;
  const FK = F * K;
  const logFK = Math.log(F / K);
  const FKb = Math.pow(FK, oneMb / 2);

  // ATM special case
  if (Math.abs(F - K) < eps * F) {
    const term1 = alpha / Math.pow(F, oneMb);
    const c1 = (oneMb * oneMb / 24) * (alpha * alpha) / Math.pow(F, 2 * oneMb);
    const c2 = 0.25 * (rho * beta * nu * alpha) / Math.pow(F, oneMb);
    const c3 = ((2 - 3 * rho * rho) / 24) * nu * nu;
    return term1 * (1 + (c1 + c2 + c3) * T);
  }

  const z = (nu / alpha) * FKb * logFK;
  const xz = Math.log((Math.sqrt(1 - 2 * rho * z + z * z) + z - rho) / (1 - rho));
  // (1-β)^2 expansion in denominator
  const denom = FKb * (1 + (oneMb * oneMb / 24) * logFK * logFK + (Math.pow(oneMb, 4) / 1920) * Math.pow(logFK, 4));
  const num = alpha;

  const A = num / denom;
  const B = (z / xz);
  const C1 = (oneMb * oneMb / 24) * (alpha * alpha) / Math.pow(FK, oneMb);
  const C2 = 0.25 * (rho * beta * nu * alpha) / Math.pow(FK, oneMb / 2);
  const C3 = ((2 - 3 * rho * rho) / 24) * nu * nu;
  return A * B * (1 + (C1 + C2 + C3) * T);
}

export const SABRTool = () => {
  const { t } = useTranslation();
  const [F, setF] = useState(100);
  const [T, setT] = useState(1.0);
  const [alpha, setAlpha] = useState(0.20);
  const [beta, setBeta] = useState(0.5);
  const [rho, setRho] = useState(-0.4);
  const [nu, setNu] = useState(0.5);

  // ───────── 市场报价标定 ─────────
  // 输入格式：每行 "strike, impliedVol(%)", 例如 "90, 24.5"
  const [quoteText, setQuoteText] = useState(
    "80, 28.5\n90, 25.0\n95, 23.5\n100, 22.0\n105, 21.2\n110, 21.0\n120, 21.8"
  );
  const [calibFixBeta, setCalibFixBeta] = useState(true);
  const [calibStatus, setCalibStatus] = useState<string>("");
  const [calibRMSE, setCalibRMSE] = useState<number | null>(null);
  const [calibFitted, setCalibFitted] = useState<{ K: number; mkt: number; mdl: number }[]>([]);

  const runCalibration = useCallback(() => {
    const quotes = quoteText.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
      const [a, b] = l.split(/[,\s]+/).map(parseFloat);
      return { K: a, ivMkt: b / 100 };
    }).filter(q => isFinite(q.K) && isFinite(q.ivMkt) && q.K > 0 && q.ivMkt > 0);
    if (quotes.length < 3) {
      setCalibStatus(t("labs.deriv.SABR.text230", { defaultValue: "至少需要 3 个有效报价 (K, IV%)" }));
      return;
    }

    // Loss: SSE on IV
    type V = number[]; // [alpha, beta, rho, nu]
    const loss = (p: V): number => {
      const [a, b, r, n] = p;
      if (a <= 0 || n <= 0 || b < 0 || b > 1 || r <= -0.999 || r >= 0.999) return 1e6;
      let s = 0;
      for (const q of quotes) {
        const iv = sabrIV(F, q.K, T, a, b, r, n);
        if (!isFinite(iv)) return 1e6;
        s += (iv - q.ivMkt) ** 2;
      }
      return s;
    };

    // Nelder-Mead simplex
    const nm = (x0: V, maxIter = 400): { x: V; f: number } => {
      const dim = x0.length;
      const simplex: { x: V; f: number }[] = [];
      simplex.push({ x: [...x0], f: loss(x0) });
      const steps = [0.05, 0.1, 0.1, 0.15];
      for (let i = 0; i < dim; i++) {
        const xi = [...x0]; xi[i] += steps[i];
        simplex.push({ x: xi, f: loss(xi) });
      }
      for (let iter = 0; iter < maxIter; iter++) {
        simplex.sort((a, b) => a.f - b.f);
        if (simplex[dim].f - simplex[0].f < 1e-10) break;
        const xc = new Array(dim).fill(0);
        for (let i = 0; i < dim; i++)
          for (let j = 0; j < dim; j++) xc[j] += simplex[i].x[j] / dim;
        const xw = simplex[dim].x;
        const xr = xc.map((c, j) => c + (c - xw[j]));
        const fr = loss(xr);
        if (fr < simplex[0].f) {
          const xe = xc.map((c, j) => c + 2 * (c - xw[j]));
          const fe = loss(xe);
          simplex[dim] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
        } else if (fr < simplex[dim - 1].f) {
          simplex[dim] = { x: xr, f: fr };
        } else {
          const xcontr = xc.map((c, j) => c + 0.5 * (xw[j] - c));
          const fc = loss(xcontr);
          if (fc < simplex[dim].f) simplex[dim] = { x: xcontr, f: fc };
          else {
            const xb = simplex[0].x;
            for (let i = 1; i <= dim; i++) {
              const xi = simplex[i].x.map((v, j) => xb[j] + 0.5 * (v - xb[j]));
              simplex[i] = { x: xi, f: loss(xi) };
            }
          }
        }
      }
      simplex.sort((a, b) => a.f - b.f);
      return simplex[0];
    };

    // Multi-start to escape local minima
    const starts: V[] = [
      [alpha, beta, rho, nu],
      [0.20, beta, -0.3, 0.40],
      [0.30, beta, -0.6, 0.60],
      [0.15, beta,  0.0, 0.30],
      [0.25, beta, -0.8, 0.80],
    ];
    let best: { x: V; f: number } | null = null;
    for (const x0 of starts) {
      // If user wants β fixed: project β back after each NM step by re-optimizing only 3 dims.
      if (calibFixBeta) {
        const fixedBeta = x0[1];
        const lossB = (p3: V) => loss([p3[0], fixedBeta, p3[1], p3[2]]);
        // Nelder-Mead on 3 dims
        const dim = 3;
        const simplex: { x: V; f: number }[] = [];
        const x03: V = [x0[0], x0[2], x0[3]];
        simplex.push({ x: [...x03], f: lossB(x03) });
        const steps = [0.05, 0.1, 0.15];
        for (let i = 0; i < dim; i++) { const xi = [...x03]; xi[i] += steps[i]; simplex.push({ x: xi, f: lossB(xi) }); }
        for (let iter = 0; iter < 400; iter++) {
          simplex.sort((a, b) => a.f - b.f);
          if (simplex[dim].f - simplex[0].f < 1e-10) break;
          const xc = new Array(dim).fill(0);
          for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) xc[j] += simplex[i].x[j] / dim;
          const xw = simplex[dim].x;
          const xr = xc.map((c, j) => c + (c - xw[j]));
          const fr = lossB(xr);
          if (fr < simplex[0].f) {
            const xe = xc.map((c, j) => c + 2 * (c - xw[j]));
            const fe = lossB(xe);
            simplex[dim] = fe < fr ? { x: xe, f: fe } : { x: xr, f: fr };
          } else if (fr < simplex[dim - 1].f) simplex[dim] = { x: xr, f: fr };
          else {
            const xcontr = xc.map((c, j) => c + 0.5 * (xw[j] - c));
            const fc = lossB(xcontr);
            if (fc < simplex[dim].f) simplex[dim] = { x: xcontr, f: fc };
            else {
              const xb = simplex[0].x;
              for (let i = 1; i <= dim; i++) {
                const xi = simplex[i].x.map((v, j) => xb[j] + 0.5 * (v - xb[j]));
                simplex[i] = { x: xi, f: lossB(xi) };
              }
            }
          }
        }
        simplex.sort((a, b) => a.f - b.f);
        const cand = { x: [simplex[0].x[0], fixedBeta, simplex[0].x[1], simplex[0].x[2]] as V, f: simplex[0].f };
        if (!best || cand.f < best.f) best = cand;
      } else {
        const r = nm(x0);
        if (!best || r.f < best.f) best = r;
      }
    }

    if (!best) { setCalibStatus(t("labs.deriv.SABR.text231", { defaultValue: "标定失败" })); return; }
    const [aFit, bFit, rFit, nFit] = best.x;
    setAlpha(+aFit.toFixed(4));
    setBeta(+bFit.toFixed(3));
    setRho(+Math.max(-0.99, Math.min(0.99, rFit)).toFixed(3));
    setNu(+Math.max(0.01, nFit).toFixed(4));
    const fitted = quotes.map(q => ({
      K: q.K,
      mkt: +(q.ivMkt * 100).toFixed(3),
      mdl: +(sabrIV(F, q.K, T, aFit, bFit, rFit, nFit) * 100).toFixed(3),
    }));
    const rmse = Math.sqrt(best.f / quotes.length) * 100;
    setCalibFitted(fitted);
    setCalibRMSE(+rmse.toFixed(4));
    setCalibStatus(t("labs.deriv.SABR.text232", { defaultValue: "✓ 标定完成 · {{value0}} 个报价 · RMSE={{value1}}%", value0: quotes.length, value1: rmse.toFixed(3) }));
  }, [F, T, alpha, beta, rho, nu, quoteText, calibFixBeta, t]);

  const smile = useMemo(() => {
    const out: { k: number; iv: number; betaHi: number; betaLo: number }[] = [];
    for (let i = -25; i <= 25; i++) {
      const k = 0.02 * i;
      const K = F * Math.exp(k);
      const iv = sabrIV(F, K, T, alpha, beta, rho, nu);
      const bHi = sabrIV(F, K, T, alpha, 1.0, rho, nu);   // β=1 (lognormal)
      const bLo = sabrIV(F, K, T, alpha, 0.0, rho, nu);   // β=0 (normal)
      out.push({
        k: +k.toFixed(3),
        iv: isFinite(iv) ? +(iv * 100).toFixed(3) : 0,
        betaHi: isFinite(bHi) ? +(bHi * 100).toFixed(3) : 0,
        betaLo: isFinite(bLo) ? +(bLo * 100).toFixed(3) : 0,
      });
    }
    return out;
  }, [F, T, alpha, beta, rho, nu]);

  const atm = useMemo(() => sabrIV(F, F, T, alpha, beta, rho, nu), [F, T, alpha, beta, rho, nu]);
  const skew25 = useMemo(() => {
    const lo = sabrIV(F, F * Math.exp(-0.10), T, alpha, beta, rho, nu);
    const hi = sabrIV(F, F * Math.exp(+0.10), T, alpha, beta, rho, nu);
    return (lo - hi) * 100;
  }, [F, T, alpha, beta, rho, nu]);

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.deriv.SABR.text233", { defaultValue: "股指 (β=0.5, ρ<0)" }), description: t("labs.deriv.SABR.text234", { defaultValue: "经典左偏 skew" }), apply: () => { setAlpha(0.20); setBeta(0.5); setRho(-0.5); setNu(0.6); } },
        { name: t("labs.deriv.SABR.text235", { defaultValue: "FX 对称微笑" }), description: t("labs.deriv.SABR.text236", { defaultValue: "ρ=0,凸性主导" }), apply: () => { setAlpha(0.12); setBeta(1.0); setRho(0); setNu(0.7); } },
        { name: t("labs.deriv.SABR.text237", { defaultValue: "利率 (β=0)" }), description: t("labs.deriv.SABR.text238", { defaultValue: "Normal SABR,LIBOR 市场" }), apply: () => { setAlpha(0.015); setBeta(0); setRho(-0.2); setNu(0.4); setF(0.03); } },
        { name: t("labs.deriv.SABR.text239", { defaultValue: "Hagan 论文示例" }), description: t("labs.deriv.SABR.text240", { defaultValue: "原始 2002 标定" }), apply: () => { setAlpha(0.20); setBeta(0.5); setRho(-0.3); setNu(0.4); setF(100); setT(1); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.deriv.SABR.text241", { defaultValue: "市场参数" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.deriv.SABR.text242", { defaultValue: "F (远期)" })} value={F} min={0.01} max={200} step={0.01} onChange={setF} />
            <Slider label={t("labs.deriv.SABR.text038", { defaultValue: "T (年)" })} value={T} min={0.1} max={5} step={0.1} onChange={setT} />
          </div>
          <p className="text-xs font-mono text-gold uppercase tracking-wider mt-4">{t("labs.deriv.SABR.text243", { defaultValue: "SABR 四参数" })}</p>
          <Slider label={t("labs.deriv.SABR.text244", { defaultValue: "α (初始波动)" })} sub={t("labs.deriv.SABR.text245", { defaultValue: "决定整体水平" })} value={alpha} min={0.01} max={1.0} step={0.01} onChange={setAlpha} />
          <Slider label={t("labs.deriv.SABR.text246", { defaultValue: "β (CEV 弹性)" })} sub="0=normal, 1=lognormal" value={beta} min={0} max={1} step={0.05} onChange={setBeta} />
          <Slider label={t("labs.deriv.SABR.text247", { defaultValue: "ρ (相关系数)" })} sub={t("labs.deriv.SABR.text248", { defaultValue: "决定 skew 方向" })} value={rho} min={-0.95} max={0.95} step={0.05} onChange={setRho} />
          <Slider label="ν (vol-of-vol)" sub={t("labs.deriv.SABR.text249", { defaultValue: "决定 smile 凸度" })} value={nu} min={0.05} max={2.0} step={0.05} onChange={setNu} />
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="ATM IV (Hagan)" value={`${(atm * 100).toFixed(2)}%`} />
            <Stat label="25Δ Risk Reversal" value={`${skew25.toFixed(2)}%`} color={skew25 >= 0 ? CHART_RED : CHART_TEAL}
              sub={skew25 >= 0 ? t("labs.deriv.SABR.text250", { defaultValue: "OTM put 更贵 (左偏)" }) : t("labs.deriv.SABR.text251", { defaultValue: "OTM call 更贵 (右偏)" })} />
            <Stat label="β" value={beta.toFixed(2)} sub={beta < 0.05 ? "Normal SABR" : beta > 0.95 ? "Lognormal" : "CEV"} />
            <Stat label={t("labs.deriv.SABR.text252", { defaultValue: "ν / α 比" })} value={(nu / Math.max(alpha, 1e-6)).toFixed(2)} sub={t("labs.deriv.SABR.text253", { defaultValue: "vol-of-vol 相对强度" })} />
          </div>
          <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
            <p><span className="text-gold">SABR (Hagan et al. 2002)：</span>{t("labs.deriv.SABR.text254", { defaultValue: "IR/Swaption 行业标准的随机波动率模型。" })}</p>
            <p><span className="text-gold">β：</span>{t("labs.deriv.SABR.text255", { defaultValue: "控制后向远期分布形状 — β=0 高斯、β=1 对数正态、β=0.5 CIR-like。" })}</p>
            <p><span className="text-gold">ρ：</span>{t("labs.deriv.SABR.text256", { defaultValue: "决定 skew 倾斜方向，" })}<span className="text-gold">ν：</span>{t("labs.deriv.SABR.text257", { defaultValue: "决定 smile 曲度。" })}</p>
            <p>{t("labs.deriv.SABR.text258", { defaultValue: "对比 Heston: SABR 是" })}<u>{t("labs.deriv.SABR.text259", { defaultValue: "解析近似" })}</u>{t("labs.deriv.SABR.text260", { defaultValue: "(无 MC)，更适合即时 smile 标定与对冲。" })}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.deriv.SABR.text261", { defaultValue: "SABR 隐含波动率微笑 — β 敏感性对比" })}</h4>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={smile}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="k" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "log-moneyness k = ln(K/F)", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
              <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                label={{ value: "IV %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="iv" name={`SABR (β=${beta.toFixed(2)})`} stroke={CHART_GOLD} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="betaHi" name="β=1 (Lognormal)" stroke={CHART_TEAL} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="betaLo" name="β=0 (Normal)" stroke={CHART_BLUE} strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              <ReferenceLine x={0} stroke={CHART_RED} strokeDasharray="3 3" label={{ value: "ATM", fill: CHART_RED, fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground mt-2 leading-relaxed">
          {t("labs.deriv.SABR.text262", { defaultValue: "Hagan 公式：σ" })}<sub>B</sub>(K,F) = (α / D) · (z/x(z)) · [1 + ((1-β)²α²/24·(FK)<sup>1-β</sup> + ρβνα/(4(FK)<sup>(1-β)/2</sup>{t("labs.deriv.SABR.text263", { defaultValue: ") + (2-3ρ²)ν²/24)·T]\n          其中 z = (ν/α)(FK)" })}<sup>(1-β)/2</sup>·ln(F/K)，x(z) = ln((√(1-2ρz+z²)+z-ρ)/(1-ρ)).
        </p>
      </div>

      {/* 市场报价标定 */}
      <div className="rounded-xl border border-gold/30 bg-secondary/20 p-4 space-y-3">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h4 className="text-sm font-semibold text-foreground">{t("labs.deriv.SABR.text264", { defaultValue: "市场报价标定 (Calibration)" })}</h4>
          <span className="text-[10px] font-mono text-muted-foreground">{t("labs.deriv.SABR.text265", { defaultValue: "Nelder-Mead 多起点最优化 · 损失=SSE(σ" })}<sub>B</sub>−σ<sub>mkt</sub>)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-mono text-gold uppercase tracking-wider">{t("labs.deriv.SABR.text266", { defaultValue: "市场报价 (每行: K, IV%)" })}</label>
            <textarea value={quoteText} onChange={(e) => setQuoteText(e.target.value)} rows={8}
              className="w-full mt-1 px-3 py-2 text-xs font-mono bg-background border border-border rounded focus:border-gold/60 outline-none" />
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-1.5 text-[11px] text-secondary-foreground cursor-pointer">
                <input type="checkbox" checked={calibFixBeta} onChange={(e) => setCalibFixBeta(e.target.checked)} className="accent-gold" />
                {t("labs.deriv.SABR.text267", { defaultValue: "固定 β = " })}{beta.toFixed(2)} {t("labs.deriv.SABR.text268", { defaultValue: "(仅标定 α, ρ, ν)\n              " })}</label>
              <button onClick={runCalibration}
                className="ml-auto px-4 py-1.5 rounded bg-gold text-background text-xs font-mono hover:bg-gold/90 transition-colors">
                {t("labs.deriv.SABR.text269", { defaultValue: "运行标定\n              " })}</button>
            </div>
            {calibStatus && (
              <p className={`mt-2 text-[11px] font-mono ${calibStatus.startsWith("✓") ? "text-gold" : "text-destructive"}`}>{calibStatus}</p>
            )}
          </div>
          <div>
            <label className="text-[11px] font-mono text-gold uppercase tracking-wider">{t("labs.deriv.SABR.text270", { defaultValue: "拟合结果 (市场 vs 模型)" })}</label>
            <div className="h-[200px] mt-1">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="K" stroke={CHART_TEXT} tick={{ fontSize: 10 }}
                    label={{ value: "Strike K", position: "insideBottom", offset: -5, fill: CHART_TEXT, fontSize: 10 }} />
                  <YAxis stroke={CHART_TEXT} tick={{ fontSize: 10 }} domain={["auto", "auto"]}
                    label={{ value: "IV %", angle: -90, position: "insideLeft", fill: CHART_TEXT, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: `1px solid ${CHART_GRID}`, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Scatter name={t("labs.deriv.SABR.text271", { defaultValue: "市场" })} data={calibFitted} dataKey="mkt" fill={CHART_RED} />
                  <Scatter name={t("labs.deriv.SABR.text272", { defaultValue: "SABR 拟合" })} data={calibFitted} dataKey="mdl" fill={CHART_GOLD} shape="cross" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            {calibRMSE !== null && (
              <div className="grid grid-cols-4 gap-1.5 mt-2 text-[10px] font-mono">
                <div className="rounded bg-secondary/40 p-1.5"><span className="text-muted-foreground">α</span> <span className="text-gold">{alpha.toFixed(4)}</span></div>
                <div className="rounded bg-secondary/40 p-1.5"><span className="text-muted-foreground">β</span> <span className="text-gold">{beta.toFixed(3)}</span></div>
                <div className="rounded bg-secondary/40 p-1.5"><span className="text-muted-foreground">ρ</span> <span className="text-gold">{rho.toFixed(3)}</span></div>
                <div className="rounded bg-secondary/40 p-1.5"><span className="text-muted-foreground">ν</span> <span className="text-gold">{nu.toFixed(4)}</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SABRTool;
