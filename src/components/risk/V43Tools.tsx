import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, ReferenceLine, Cell, ComposedChart, Area,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "@/components/frontier/ui";
import {
  computeSystemic, simulateJoint, almgrenChriss, exogenousLVaR,
  historicalES, frtbLHScaling, baselTrafficLight, kupiecPOF,
  ldaOpVaR, reverseStress, componentVaR,
} from "@/lib/quant/riskAdvanced";

/* ═════════════════════════════════════════════════════════════
   1. Systemic Risk — CoVaR / MES / SRISK
   ═════════════════════════════════════════════════════════════ */
export const SystemicRiskTool = () => {
  const { t } = useTranslation();
  const [rho, setRho] = useState(0.6);
  const [alpha, setAlpha] = useState(0.05);
  const [mktCap, setMktCap] = useState(80);
  const [debt, setDebt] = useState(320);
  const [k, setK] = useState(0.08);
  const [seed, setSeed] = useState(11);

  const res = useMemo(() => {
    const s = simulateJoint(rho, 1200, seed);
    return { sys: s, out: computeSystemic(s.rs, s.ri, alpha, mktCap, debt, k) };
  }, [rho, alpha, mktCap, debt, k, seed]);

  const rhoCurve = useMemo(() => {
    const out: { rho: number; dCoVaR: number; mes: number }[] = [];
    for (let r = 0; r <= 0.9; r += 0.1) {
      const s = simulateJoint(r, 800, 3);
      const c = computeSystemic(s.rs, s.ri, alpha, mktCap, debt, k);
      out.push({ rho: +r.toFixed(1), dCoVaR: +(c.deltaCoVaR * 100).toFixed(3), mes: +(c.mes * 100).toFixed(3) });
    }
    return out;
  }, [alpha, mktCap, debt, k]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.risk.v43.systemic.presets.gsib.name"), description: "ρ=0.75", apply: () => { setRho(0.75); setMktCap(120); setDebt(600); } },
        { name: t("labs.risk.v43.systemic.presets.regional.name"), description: "ρ=0.45", apply: () => { setRho(0.45); setMktCap(50); setDebt(220); } },
        { name: t("labs.risk.v43.systemic.presets.hedgeFund.name"), description: "ρ=0.3, k=0.06", apply: () => { setRho(0.3); setMktCap(30); setDebt(100); setK(0.06); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.risk.v43.systemic.sliders.rho")} value={rho} min={0} max={0.95} step={0.05} onChange={setRho} />
          <Slider label={t("labs.risk.v43.systemic.sliders.alpha")} sub={t("labs.risk.v43.systemic.sliders.alphaSub")} value={alpha} min={0.01} max={0.10} step={0.005} onChange={setAlpha} />
          <Slider label={t("labs.risk.v43.systemic.sliders.mktCap")} value={mktCap} min={10} max={500} step={5} onChange={setMktCap} />
          <Slider label={t("labs.risk.v43.systemic.sliders.debt")} value={debt} min={10} max={2000} step={10} onChange={setDebt} />
          <Slider label={t("labs.risk.v43.systemic.sliders.k")} sub="Basel Prudential" value={k} min={0.04} max={0.12} step={0.005} onChange={setK} />
          <Slider label={t("labs.risk.v43.systemic.sliders.seed")} value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.risk.v43.systemic.stats.varI")} value={(res.out.varI * 100).toFixed(3) + "%"} />
          <Stat label={t("labs.risk.v43.systemic.stats.varSys")} value={(res.out.varSys * 100).toFixed(3) + "%"} />
          <Stat label={t("labs.risk.v43.systemic.stats.coVaR")} value={(res.out.coVaR * 100).toFixed(3) + "%"} color={C.red} sub="Adrian-Brunnermeier" />
          <Stat label={t("labs.risk.v43.systemic.stats.deltaCoVaR")} value={(res.out.deltaCoVaR * 100).toFixed(3) + "%"} color={C.red} sub={t("labs.risk.v43.systemic.stats.deltaCoVaRSub")} />
          <Stat label={t("labs.risk.v43.systemic.stats.mes")} value={(res.out.mes * 100).toFixed(3) + "%"} color={C.blue} sub="Acharya et al." />
          <Stat label={t("labs.risk.v43.systemic.stats.lrmes")} value={(res.out.lrmes * 100).toFixed(2) + "%"} color={C.blue} />
          <Stat label={t("labs.risk.v43.systemic.stats.srisk")} value={res.out.srisk.toFixed(2)} color={res.out.srisk > 0 ? C.red : C.green} sub={res.out.srisk > 0 ? t("labs.risk.v43.systemic.stats.capitalShortfall") : t("labs.risk.v43.systemic.stats.capitalSurplus")} />
          <Stat label={t("labs.risk.v43.systemic.stats.esSys")} value={(res.out.esSys * 100).toFixed(3) + "%"} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v43.systemic.charts.rhoCurveTitle")}</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rhoCurve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="rho" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "ρ", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="dCoVaR" name="ΔCoVaR (%)" stroke={C.red} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mes" name="MES (%)" stroke={C.blue} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   2. Liquidity-Adjusted VaR & Almgren-Chriss Execution
   ═════════════════════════════════════════════════════════════ */
export const LiquidityVaRTool = () => {
  const { t } = useTranslation();
  const [V, setV] = useState(1000);
  const [sigma, setSigma] = useState(0.02);
  const [alpha, setAlpha] = useState(0.99);
  const [spread, setSpread] = useState(15);
  const [lambda, setLambda] = useState(0.5);
  const [eta, setEta] = useState(0.01);
  const [Tdays, setTdays] = useState(10);
  const [N, setN] = useState(10);

  const lv = useMemo(() => exogenousLVaR(V, sigma, alpha, spread), [V, sigma, alpha, spread]);
  const ac = useMemo(() => almgrenChriss({ X: V, T: Tdays, N, sigma: sigma * V, eta, lambda }), [V, Tdays, N, sigma, eta, lambda]);

  const frontier = useMemo(() => {
    const out: { lam: number; cost: number; risk: number }[] = [];
    for (let l of [1e-8, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8]) {
      const a = almgrenChriss({ X: V, T: Tdays, N, sigma: sigma * V, eta, lambda: l });
      out.push({ lam: l, cost: +a.expCost.toFixed(2), risk: +Math.sqrt(Math.max(a.varCost, 0)).toFixed(2) });
    }
    return out;
  }, [V, Tdays, N, sigma, eta]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.risk.v43.liquidity.presets.largeCap.name"), description: "spread=5bp", apply: () => { setSpread(5); setEta(0.005); setLambda(0.3); } },
        { name: t("labs.risk.v43.liquidity.presets.smallCap.name"), description: "spread=40bp", apply: () => { setSpread(40); setEta(0.03); setLambda(1); } },
        { name: t("labs.risk.v43.liquidity.presets.crisis.name"), description: t("labs.risk.v43.liquidity.presets.crisis.description"), apply: () => { setSpread(80); setEta(0.05); setLambda(4); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.risk.v43.liquidity.sliders.v")} value={V} min={100} max={10000} step={100} onChange={setV} />
          <Slider label={t("labs.risk.v43.liquidity.sliders.sigma")} value={sigma} min={0.005} max={0.05} step={0.001} onChange={setSigma} />
          <Slider label={t("labs.risk.v43.liquidity.sliders.alpha")} value={alpha} min={0.9} max={0.999} step={0.005} onChange={setAlpha} />
          <Slider label={t("labs.risk.v43.liquidity.sliders.spread")} value={spread} min={1} max={200} step={1} onChange={setSpread} />
          <Slider label={t("labs.risk.v43.liquidity.sliders.lambda")} value={lambda} min={0.001} max={8} step={0.05} onChange={setLambda} />
          <Slider label={t("labs.risk.v43.liquidity.sliders.eta")} value={eta} min={0.001} max={0.1} step={0.001} onChange={setEta} />
          <Slider label={t("labs.risk.v43.liquidity.sliders.tdays")} value={Tdays} min={1} max={30} step={1} onChange={setTdays} />
          <Slider label={t("labs.risk.v43.liquidity.sliders.n")} value={N} min={2} max={30} step={1} onChange={setN} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.risk.v43.liquidity.stats.var")} value={lv.var.toFixed(2)} />
          <Stat label={t("labs.risk.v43.liquidity.stats.liquidityCost")} value={lv.liquidityCost.toFixed(2)} color={C.blue} sub={t("labs.risk.v43.liquidity.stats.liquidityCostSub", { spread })} />
          <Stat label={t("labs.risk.v43.liquidity.stats.lvar")} value={lv.lvar.toFixed(2)} color={C.red} sub={t("labs.risk.v43.liquidity.stats.lvarSub")} />
          <Stat label={t("labs.risk.v43.liquidity.stats.kappa")} value={ac.kappa.toFixed(4)} />
          <Stat label={t("labs.risk.v43.liquidity.stats.expCost")} value={ac.expCost.toFixed(2)} color={C.gold} />
          <Stat label={t("labs.risk.v43.liquidity.stats.riskCost")} value={Math.sqrt(Math.max(ac.varCost, 0)).toFixed(2)} color={C.teal} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v43.liquidity.charts.trajectoryTitle")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ac.schedule}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis dataKey="t" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.risk.v43.liquidity.charts.tAxisLabel"), position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="x" name={t("labs.risk.v43.liquidity.charts.remainingPosition")} stroke={C.gold} strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/20 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v43.liquidity.charts.frontierTitle")}</h4>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={frontier}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="risk" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "√Var[C]", position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
                <YAxis type="number" dataKey="cost" stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="cost" stroke={C.red} strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   3. FRTB IMA — 97.5% ES + LH scaling + Basel Traffic Light
   ═════════════════════════════════════════════════════════════ */
export const FRTBTool = () => {
  const { t } = useTranslation();
  const [drift, setDrift] = useState(0.0);
  const [vol, setVol] = useState(0.015);
  const [nDays, setNDays] = useState(500);
  const [alpha, setAlpha] = useState(0.975);
  const [seed, setSeed] = useState(21);
  const [notional, setNotional] = useState(1000);

  // Synthetic P&L series
  const pnl = useMemo(() => {
    let s = seed || 1;
    const rng = () => { s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x9e3779b9) >>> 0; return s / 4294967296; };
    const randn = () => Math.sqrt(-2 * Math.log(rng() || 1e-9)) * Math.cos(2 * Math.PI * (rng() || 1e-9));
    return Array.from({ length: nDays }, () => notional * (drift + vol * randn()));
  }, [drift, vol, nDays, seed, notional]);

  const es = useMemo(() => historicalES(pnl, alpha), [pnl, alpha]);

  // Liquidity-horizon buckets: use base 10d ES scaled by sqrt-time proxy.
  const lhBuckets = [10, 20, 40, 60, 120]; // FRTB horizons
  const esLiq = useMemo(() => {
    const es10 = es.es;
    const esArr = lhBuckets.map((lh) => es10 * Math.sqrt(lh / 10));
    return frtbLHScaling(esArr, [20, 40, 60, 120]);
  }, [es]);

  // Kupiec on 250-day window @ 99%
  const back = useMemo(() => {
    const l99 = historicalES(pnl.slice(0, 250), 0.99).var;
    const ex = pnl.slice(0, 250).filter((p) => -p > l99).length;
    const traffic = baselTrafficLight(ex);
    const kp = kupiecPOF(ex, 250, 0.01);
    return { exceptions: ex, traffic, kupiec: kp };
  }, [pnl]);

  const capital = back.traffic.multiplier * esLiq;

  const bucketData = lhBuckets.map((lh) => ({ lh, es: +(es.es * Math.sqrt(lh / 10)).toFixed(2) }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.risk.v43.frtb.presets.lowVol.name"), description: "vol=1%", apply: () => { setVol(0.01); } },
        { name: t("labs.risk.v43.frtb.presets.highVol.name"), description: "vol=2.5%", apply: () => { setVol(0.025); } },
        { name: t("labs.risk.v43.frtb.presets.fatTail.name"), description: "vol=3%", apply: () => { setVol(0.03); setNDays(500); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.risk.v43.frtb.sliders.drift")} value={drift} min={-0.005} max={0.005} step={0.0005} onChange={setDrift} />
          <Slider label={t("labs.risk.v43.frtb.sliders.vol")} value={vol} min={0.005} max={0.05} step={0.001} onChange={setVol} />
          <Slider label={t("labs.risk.v43.frtb.sliders.alpha")} value={alpha} min={0.95} max={0.99} step={0.005} onChange={setAlpha} />
          <Slider label={t("labs.risk.v43.frtb.sliders.nDays")} value={nDays} min={250} max={1000} step={50} onChange={setNDays} />
          <Slider label={t("labs.risk.v43.frtb.sliders.notional")} value={notional} min={100} max={10000} step={100} onChange={setNotional} />
          <Slider label={t("labs.risk.v43.frtb.sliders.seed")} value={seed} min={1} max={99} step={1} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.risk.v43.frtb.stats.var975")} value={es.var.toFixed(2)} />
          <Stat label={t("labs.risk.v43.frtb.stats.es975")} value={es.es.toFixed(2)} color={C.gold} />
          <Stat label={t("labs.risk.v43.frtb.stats.esLiq")} value={esLiq.toFixed(2)} color={C.red} sub="FRTB IMA" />
          <Stat label={t("labs.risk.v43.frtb.stats.exceptions")} value={String(back.exceptions)} />
          <Stat label={t("labs.risk.v43.frtb.stats.trafficLight")} value={back.traffic.zone.toUpperCase()} color={back.traffic.zone === "green" ? C.green : back.traffic.zone === "yellow" ? C.gold : C.red} sub={`×${back.traffic.multiplier.toFixed(2)}`} />
          <Stat label={t("labs.risk.v43.frtb.stats.kupiecP")} value={back.kupiec.pValue.toFixed(3)} sub={back.kupiec.pValue < 0.05 ? t("labs.risk.v43.frtb.stats.rejectH0") : t("labs.risk.v43.frtb.stats.pass")} />
          <Stat label={t("labs.risk.v43.frtb.stats.capital")} value={capital.toFixed(2)} color={C.red} sub={t("labs.risk.v43.frtb.stats.capitalSub")} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v43.frtb.charts.lhTitle")}</h4>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bucketData}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="lh" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: t("labs.risk.v43.frtb.charts.lhAxisLabel"), position: "insideBottom", offset: -5, fill: C.text, fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="es" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   4. Operational Risk — LDA Poisson × Lognormal
   ═════════════════════════════════════════════════════════════ */
export const OpRiskLDATool = () => {
  const { t } = useTranslation();
  const [lambda, setLambda] = useState(15);
  const [mu, setMu] = useState(4);
  const [sigma, setSigma] = useState(1.2);
  const [nSims, setNSims] = useState(3000);

  const out = useMemo(() => ldaOpVaR({ lambda, mu, sigma, nSims, seed: 21 }), [lambda, mu, sigma, nSims]);

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.risk.v43.opRisk.presets.retailBank.name"), description: t("labs.risk.v43.opRisk.presets.retailBank.description"), apply: () => { setLambda(50); setMu(3); setSigma(0.9); } },
        { name: t("labs.risk.v43.opRisk.presets.investmentBank.name"), description: t("labs.risk.v43.opRisk.presets.investmentBank.description"), apply: () => { setLambda(5); setMu(6); setSigma(1.6); } },
        { name: t("labs.risk.v43.opRisk.presets.cyberSecurity.name"), description: "λ=8, σ=1.8", apply: () => { setLambda(8); setMu(5); setSigma(1.8); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.risk.v43.opRisk.sliders.lambda")} value={lambda} min={1} max={100} step={1} onChange={setLambda} />
          <Slider label={t("labs.risk.v43.opRisk.sliders.mu")} value={mu} min={0} max={10} step={0.1} onChange={setMu} />
          <Slider label={t("labs.risk.v43.opRisk.sliders.sigma")} value={sigma} min={0.2} max={2.5} step={0.05} onChange={setSigma} />
          <Slider label={t("labs.risk.v43.opRisk.sliders.nSims")} value={nSims} min={500} max={10000} step={500} onChange={setNSims} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.risk.v43.opRisk.stats.meanLoss")} value={out.mean.toFixed(0)} />
          <Stat label={t("labs.risk.v43.opRisk.stats.var995")} value={out.var995.toFixed(0)} color={C.gold} />
          <Stat label={t("labs.risk.v43.opRisk.stats.opVar999")} value={out.var999.toFixed(0)} color={C.red} sub="Basel III AMA" />
          <Stat label={t("labs.risk.v43.opRisk.stats.es999")} value={out.es999.toFixed(0)} color={C.red} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v43.opRisk.charts.lossDistTitle")}</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={out.hist}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="bucket" stroke={C.text} tick={{ fontSize: 9 }} tickFormatter={(v) => v.toFixed(0)} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={C.blue} />
              <ReferenceLine x={out.var999} stroke={C.red} strokeDasharray="4 4" label={{ value: "99.9% VaR", fill: C.red, fontSize: 10 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   5. Reverse Stress Testing
   ═════════════════════════════════════════════════════════════ */
export const ReverseStressTool = () => {
  const { t } = useTranslation();
  // 4-factor portfolio: Equity, Rates, Credit, FX
  const [Lstar, setLstar] = useState(50);
  const [wEq, setWEq] = useState(0.6);
  const [wRates, setWRates] = useState(-0.2);
  const [wCredit, setWCredit] = useState(0.3);
  const [wFx, setWFx] = useState(0.1);

  const factors = ["Equity", "Rates(10y)", "Credit Spread", "FX"];
  // Reasonable normalized covariance (percent shocks)
  const Sigma = [
    [4.0, -0.6, 1.8, 0.5],
    [-0.6, 1.2, -0.4, 0.1],
    [1.8, -0.4, 2.5, 0.3],
    [0.5, 0.1, 0.3, 1.5],
  ];
  const b = [wEq, wRates, wCredit, wFx];

  const rs = useMemo(() => reverseStress(Sigma, b, Lstar), [b[0], b[1], b[2], b[3], Lstar]);

  const data = factors.map((f, i) => ({
    name: f,
    shock: +rs.delta[i].toFixed(3),
    contrib: +rs.contributions[i].toFixed(3),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.risk.v43.reverseStress.presets.equityLong.name"), description: "wEq=0.8", apply: () => { setWEq(0.8); setWRates(-0.1); setWCredit(0.2); setWFx(0.1); } },
        { name: t("labs.risk.v43.reverseStress.presets.globalMacro.name"), description: t("labs.risk.v43.reverseStress.presets.globalMacro.description"), apply: () => { setWEq(0.4); setWRates(-0.3); setWCredit(0.2); setWFx(0.3); } },
        { name: t("labs.risk.v43.reverseStress.presets.creditDriven.name"), description: "wCredit=0.7", apply: () => { setWEq(0.2); setWRates(0.1); setWCredit(0.7); setWFx(0.0); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.risk.v43.reverseStress.sliders.lstar")} value={Lstar} min={5} max={200} step={5} onChange={setLstar} />
          <Slider label={t("labs.risk.v43.reverseStress.sliders.wEq")} value={wEq} min={-1} max={1} step={0.05} onChange={setWEq} />
          <Slider label={t("labs.risk.v43.reverseStress.sliders.wRates")} value={wRates} min={-1} max={1} step={0.05} onChange={setWRates} />
          <Slider label={t("labs.risk.v43.reverseStress.sliders.wCredit")} value={wCredit} min={-1} max={1} step={0.05} onChange={setWCredit} />
          <Slider label={t("labs.risk.v43.reverseStress.sliders.wFx")} value={wFx} min={-1} max={1} step={0.05} onChange={setWFx} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.risk.v43.reverseStress.stats.plausibility")} value={rs.plausibility.toFixed(2)} color={rs.plausibility > 25 ? C.red : rs.plausibility > 9 ? C.gold : C.green} sub={t("labs.risk.v43.reverseStress.stats.plausibilitySub")} />
          <Stat label={t("labs.risk.v43.reverseStress.stats.equivSigma")} value={Math.sqrt(rs.plausibility).toFixed(2)} sub={t("labs.risk.v43.reverseStress.stats.mahalanobis")} />
          <Stat label={t("labs.risk.v43.reverseStress.stats.targetLoss")} value={Lstar.toFixed(1)} color={C.red} />
          <Stat label={t("labs.risk.v43.reverseStress.stats.constraintCheck")} value={rs.contributions.reduce((a, b) => a + b, 0).toFixed(2)} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v43.reverseStress.charts.title")}</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" stroke={C.text} tick={{ fontSize: 11 }} width={110} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="shock" name={t("labs.risk.v43.reverseStress.charts.shockLegend")} fill={C.blue} />
              <Bar dataKey="contrib" name={t("labs.risk.v43.reverseStress.charts.contribLegend")} fill={C.red} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════
   6. Concentration & Component VaR
   ═════════════════════════════════════════════════════════════ */
export const ConcentrationTool = () => {
  const { t } = useTranslation();
  const [w1, setW1] = useState(0.4);
  const [w2, setW2] = useState(0.3);
  const [w3, setW3] = useState(0.2);
  // w4 = 1 - w1 - w2 - w3
  const [rho, setRho] = useState(0.3);
  const [alpha, setAlpha] = useState(0.99);

  const w4 = Math.max(1 - w1 - w2 - w3, 0);
  const w = [w1, w2, w3, w4];
  const names = [
    t("labs.risk.v43.concentration.assets.stockA"),
    t("labs.risk.v43.concentration.assets.stockB"),
    t("labs.risk.v43.concentration.assets.bond"),
    t("labs.risk.v43.concentration.assets.commodity"),
  ];
  const sigmas = [0.22, 0.28, 0.05, 0.30];

  const Sigma = useMemo(() => {
    const S: number[][] = [];
    for (let i = 0; i < 4; i++) {
      S.push([]);
      for (let j = 0; j < 4; j++) {
        S[i].push(i === j ? sigmas[i] * sigmas[i] : rho * sigmas[i] * sigmas[j]);
      }
    }
    return S;
  }, [rho]);

  const out = useMemo(() => componentVaR(w, Sigma, alpha), [w1, w2, w3, w4, Sigma, alpha]);

  const rows = names.map((n, i) => ({
    name: n,
    weight: +(w[i] * 100).toFixed(1),
    marginal: +out.marginalVaR[i].toFixed(4),
    component: +out.componentVaR[i].toFixed(4),
    pct: +(out.percentContrib[i] * 100).toFixed(1),
  }));

  return (
    <div className="space-y-5">
      <PresetButtons presets={[
        { name: t("labs.risk.v43.concentration.presets.balanced.name"), description: "25/25/25/25", apply: () => { setW1(0.25); setW2(0.25); setW3(0.25); } },
        { name: t("labs.risk.v43.concentration.presets.equityConcentrated.name"), description: "70/20/10/0", apply: () => { setW1(0.7); setW2(0.2); setW3(0.1); } },
        { name: t("labs.risk.v43.concentration.presets.classic6040.name"), description: t("labs.risk.v43.concentration.presets.classic6040.description"), apply: () => { setW1(0.35); setW2(0.25); setW3(0.4); } },
      ]} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <Slider label={t("labs.risk.v43.concentration.sliders.w1")} value={w1} min={0} max={1} step={0.05} onChange={setW1} />
          <Slider label={t("labs.risk.v43.concentration.sliders.w2")} value={w2} min={0} max={1} step={0.05} onChange={setW2} />
          <Slider label={t("labs.risk.v43.concentration.sliders.w3")} value={w3} min={0} max={1} step={0.05} onChange={setW3} />
          <Slider label={t("labs.risk.v43.concentration.sliders.rho")} value={rho} min={-0.2} max={0.9} step={0.05} onChange={setRho} />
          <Slider label={t("labs.risk.v43.concentration.sliders.alpha")} value={alpha} min={0.9} max={0.999} step={0.005} onChange={setAlpha} />
          <p className="text-[11px] font-mono text-muted-foreground">{t("labs.risk.v43.concentration.sliders.w4Display", { value: (w4 * 100).toFixed(1) })}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.risk.v43.concentration.stats.portSigma")} value={(out.portSigma * 100).toFixed(2) + "%"} />
          <Stat label={t("labs.risk.v43.concentration.stats.varLabel", { pct: (alpha * 100).toFixed(1) })} value={(out.portVar * 100).toFixed(2) + "%"} color={C.gold} />
          <Stat label={t("labs.risk.v43.concentration.stats.hhi")} value={out.hhi.toFixed(3)} color={out.hhi > 0.5 ? C.red : out.hhi > 0.25 ? C.gold : C.green} />
          <Stat label={t("labs.risk.v43.concentration.stats.effectiveN")} value={out.effectiveN.toFixed(2)} />
          <Stat label={t("labs.risk.v43.concentration.stats.eulerCheck")} value={out.componentVaR.reduce((a, b) => a + b, 0).toFixed(4)} sub={t("labs.risk.v43.concentration.stats.eulerCheckSub")} />
          <Stat label={t("labs.risk.v43.concentration.stats.maxContrib")} value={(Math.max(...out.percentContrib) * 100).toFixed(1) + "%"} color={C.red} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">{t("labs.risk.v43.concentration.charts.title")}</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="l" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="r" orientation="right" stroke={C.red} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="component" name="Component VaR" fill={C.gold}>
                {rows.map((r, i) => (<Cell key={i} fill={r.pct > 40 ? C.red : C.gold} />))}
              </Bar>
              <Bar yAxisId="r" dataKey="pct" name={t("labs.risk.v43.concentration.charts.contribLegend")} fill={C.blue} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
