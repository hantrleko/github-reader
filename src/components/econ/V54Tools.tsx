import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, BarChart, Bar, Cell, ReferenceLine, ScatterChart, Scatter, ErrorBar, ComposedChart,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "../frontier/ui";
import {
  weakIVLab, heckmanTwoStep, simulateSelection, waldLrLm, simulateTrinity,
  seCoverageLab, feReHausman, simulatePanel, fwlDecompose, simulateCollinear,
  pdsLasso, hteDiagnostics, simulateHte,
} from "@/lib/quant/econAdvanced";

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

/* ═══════════ 1. 弱工具变量诊断 ═══════════ */

export const WeakIVTool = () => {
  const { t } = useTranslation();
  const [pi, setPi] = useState(0.3);
  const [rho, setRho] = useState(0.6);
  const [m, setM] = useState(1);
  const [n, setN] = useState(400);
  const [seed, setSeed] = useState(7);

  const res = useMemo(
    () => weakIVLab({ n, pi, rho, nInstruments: m, seed, beta: 1 }),
    [n, pi, rho, m, seed]
  );

  const curve = res.arGrid.map((g) => ({ b0: +g.b0.toFixed(2), p: +g.p.toFixed(4) }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text000", { defaultValue: "强工具" }), description: "π=0.8 → F≫10", apply: () => { setPi(0.8); setM(1); setN(400); } },
        { name: t("labs.econV54.text001", { defaultValue: "弱工具" }), description: t("labs.econV54.text002", { defaultValue: "π=0.05 → 2SLS 崩塌" }), apply: () => { setPi(0.05); setM(1); } },
        { name: t("labs.econV54.text003", { defaultValue: "多弱工具" }), description: t("labs.econV54.text004", { defaultValue: "m=8 偏向 OLS" }), apply: () => { setPi(0.05); setM(8); } },
        { name: t("labs.econV54.text005", { defaultValue: "强内生性" }), description: "ρ=0.9", apply: () => { setRho(0.9); } },
        { name: t("labs.econV54.text006", { defaultValue: "小样本" }), description: "n=120", apply: () => { setN(120); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">DGP：d = Zπ + v，y = βd + u</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV54.text007", { defaultValue: "π 一阶段强度" })} value={pi} min={0} max={1} step={0.01} onChange={setPi} />
            <Slider label={t("labs.econV54.text008", { defaultValue: "ρ 内生性" })} sub="corr(u,v)" value={rho} min={0} max={0.95} step={0.05} onChange={setRho} />
            <Slider label={t("labs.econV54.text009", { defaultValue: "工具个数 m" })} value={m} min={1} max={10} step={1} fmt={(v) => v.toFixed(0)} onChange={setM} />
            <Slider label={t("labs.econV54.text010", { defaultValue: "样本量 n" })} value={n} min={100} max={2000} step={50} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label={t("labs.econV54.text011", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.econV54.text012", { defaultValue: "一阶段 F / Cragg-Donald" })} value={res.firstStageF.toFixed(1)} color={res.weak ? C.red : C.green} sub={t("labs.econV54.text013", { defaultValue: "Stock-Yogo 10% 临界 {{v0}}", v0: res.stockYogo.toFixed(2) })} />
          <Stat label={t("labs.econV54.text014", { defaultValue: "工具强度判定" })} value={res.weak ? t("labs.econV54.text015", { defaultValue: "弱工具" }) : t("labs.econV54.text016", { defaultValue: "合格" })} color={res.weak ? C.red : C.green} sub={t("labs.econV54.text017", { defaultValue: "F < 临界值 ⇒ 弱" })} />
          <Stat label="OLS β̂" value={res.olsBeta.toFixed(3)} color={C.blue} sub={t("labs.econV54.text018", { defaultValue: "真值 1.000（内生偏误）" })} />
          <Stat label="2SLS β̂" value={res.tslsBeta.toFixed(3)} color={C.gold} sub={`SE ${res.tslsSE.toFixed(3)}`} />
          <Stat
            label={t("labs.econV54.text019", { defaultValue: "Anderson-Rubin 95% 集" })}
            value={res.arCI ? `[${res.arCI[0].toFixed(2)}, ${res.arCI[1].toFixed(2)}]` : t("labs.econV54.text020", { defaultValue: "空集" })}
            color={C.teal}
            sub={t("labs.econV54.text021", { defaultValue: "弱工具稳健，可为无界" })}
          />
          <Stat label="Wald 95% CI" value={`[${(res.tslsBeta - 1.96 * res.tslsSE).toFixed(2)}, ${(res.tslsBeta + 1.96 * res.tslsSE).toFixed(2)}]`} color={C.teal} sub={t("labs.econV54.text022", { defaultValue: "弱工具下失真" })} />
        </div>
      </div>

      <Panel title={t("labs.econV54.text023", { defaultValue: "Anderson-Rubin 检验曲线 — 反转检验得到稳健置信集" })}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="b0" stroke={C.text} tick={{ fontSize: 10 }} label={{ value: "β₀", position: "insideBottom", offset: -2, fontSize: 10, fill: C.text }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={[0, 1]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="p" name={t("labs.econV54.text024", { defaultValue: "AR p 值" })} stroke={C.gold} strokeWidth={2} dot={false} />
              <ReferenceLine y={0.05} stroke={C.red} strokeDasharray="4 3" />
              <ReferenceLine x={1} stroke={C.teal} strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">{t("labs.econV54.text025", { defaultValue: "识别的第一性问题：" })}</span>{t("labs.econV54.text026", { defaultValue: "2SLS 只有在一阶段真的有信号时才可信。经验法则 F&gt;10、更严格用 Stock-Yogo 临界值；多工具会把 2SLS 拉回 OLS 偏误（bias ≈ ρ·m/F）。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text027", { defaultValue: "弱工具稳健推断：" })}</span>{t("labs.econV54.text028", { defaultValue: "Anderson-Rubin 检验 H₀: β=β₀ 等价于「y−β₀d 与 Z 无关」，在任意工具强度下都有正确水平，弱工具时置信集会变宽甚至无界——这是诚实的表现。" })}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 2. Heckman 样本选择 ═══════════ */

export const HeckmanTool = () => {
  const { t } = useTranslation();
  const [rho, setRho] = useState(0.7);
  const [gz, setGz] = useState(1);
  const [n, setN] = useState(1200);
  const [seed, setSeed] = useState(13);

  const res = useMemo(() => {
    const sim = simulateSelection({ n, rho, exclusionStrength: gz, seed, beta: 1 });
    const fit = heckmanTwoStep(sim.W, sim.s, sim.X, sim.y);
    return { fit, betaTrue: sim.betaTrue, rate: fit.nSelected / n };
  }, [n, rho, gz, seed]);

  const { fit } = res;
  const bars = [
    { label: t("labs.econV54.text029", { defaultValue: "真值 β" }), v: res.betaTrue, fill: C.teal },
    { label: t("labs.econV54.text030", { defaultValue: "朴素 OLS（选中样本）" }), v: fit.naiveBeta[1], fill: C.red },
    { label: t("labs.econV54.text031", { defaultValue: "Heckman 两步" }), v: fit.beta[1], fill: C.gold },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text032", { defaultValue: "严重选择偏误" }), description: "ρ=0.9", apply: () => { setRho(0.9); setGz(1); } },
        { name: t("labs.econV54.text033", { defaultValue: "随机缺失" }), description: t("labs.econV54.text034", { defaultValue: "ρ=0 → 无需修正" }), apply: () => { setRho(0); } },
        { name: t("labs.econV54.text035", { defaultValue: "弱排除约束" }), description: t("labs.econV54.text036", { defaultValue: "识别靠函数形式" }), apply: () => { setGz(0.05); } },
        { name: t("labs.econV54.text037", { defaultValue: "强排除约束" }), description: t("labs.econV54.text038", { defaultValue: "z 显著影响参与" }), apply: () => { setGz(2); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">
            {t("labs.econV54.text039", { defaultValue: "选择方程 s=1" })}{"{"}0.2+0.5x+γz+ε&gt;0{"}"}{t("labs.econV54.text040", { defaultValue: "，结果方程 y=1+βx+u\n          " })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV54.text041", { defaultValue: "ρ 误差相关" })} sub="corr(ε,u)" value={rho} min={-0.9} max={0.9} step={0.05} onChange={setRho} />
            <Slider label={t("labs.econV54.text042", { defaultValue: "γ 排除约束强度" })} value={gz} min={0} max={2.5} step={0.05} onChange={setGz} />
            <Slider label={t("labs.econV54.text043", { defaultValue: "样本量 n" })} value={n} min={300} max={4000} step={100} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label={t("labs.econV54.text044", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.econV54.text045", { defaultValue: "观测率" })} value={(res.rate * 100).toFixed(1) + "%"} color={C.blue} sub={t("labs.econV54.text046", { defaultValue: "选中 {{v0}} 个", v0: fit.nSelected })} />
          <Stat label={t("labs.econV54.text047", { defaultValue: "逆米尔斯比系数 ρσ" })} value={fit.lambdaCoef.toFixed(3)} color={C.gold} sub={`p = ${fit.lambdaP.toFixed(4)}`} />
          <Stat label={t("labs.econV54.text048", { defaultValue: "估计 ρ̂" })} value={fit.rho.toFixed(3)} color={Math.abs(fit.rho) > 0.2 ? C.red : C.green} sub={`σ̂ = ${fit.sigma.toFixed(3)}`} />
          <Stat label={t("labs.econV54.text049", { defaultValue: "选择性判定" })} value={fit.lambdaP < 0.05 ? t("labs.econV54.text050", { defaultValue: "存在选择偏误" }) : t("labs.econV54.text051", { defaultValue: "无证据" })} color={fit.lambdaP < 0.05 ? C.red : C.green} sub={t("labs.econV54.text052", { defaultValue: "λ 显著性检验" })} />
          <Stat label={t("labs.econV54.text053", { defaultValue: "朴素 OLS β̂" })} value={fit.naiveBeta[1].toFixed(3)} color={C.red} sub={t("labs.econV54.text054", { defaultValue: "偏误 {{v0}}", v0: (fit.naiveBeta[1] - res.betaTrue).toFixed(3) })} />
          <Stat label="Heckman β̂" value={fit.beta[1].toFixed(3)} color={C.gold} sub={t("labs.econV54.text055", { defaultValue: "偏误 {{v0}}", v0: (fit.beta[1] - res.betaTrue).toFixed(3) })} />
        </div>
      </div>

      <Panel title={t("labs.econV54.text056", { defaultValue: "估计量对比 — 只用被观测样本会低估/高估斜率" })}>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis type="number" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="label" stroke={C.text} tick={{ fontSize: 10 }} width={150} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={res.betaTrue} stroke={C.teal} strokeDasharray="4 3" />
              <Bar dataKey="v" name="β̂">
                {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">{t("labs.econV54.text057", { defaultValue: "机制：" })}</span>{t("labs.econV54.text058", { defaultValue: "只观测 s=1 的样本时 E[u|s=1] = ρσ·λ(w'γ) ≠ 0，遗漏了逆米尔斯比 λ = φ/Φ。两步法先 probit 估 γ，再把 λ̂ 作为额外回归元放进结果方程。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text059", { defaultValue: "识别关键：" })}</span>{t("labs.econV54.text060", { defaultValue: "必须有排除约束 z（影响是否被观测、不直接影响 y）。γ→0 时识别只靠 λ 的非线性，多重共线严重、结果极不稳定——把滑块拉到 0.05 亲眼看看。" })}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 3. Wald / LR / LM 三位一体 ═══════════ */

export const TrinityTool = () => {
  const { t } = useTranslation();
  const [signal, setSignal] = useState(0.25);
  const [q, setQ] = useState(2);
  const [n, setN] = useState(150);
  const [noise, setNoise] = useState(1);
  const [seed, setSeed] = useState(17);

  const res = useMemo(() => {
    const sim = simulateTrinity({ n, q, signal, noise, seed });
    return waldLrLm(sim.Xd, sim.y, sim.restrict);
  }, [n, q, signal, noise, seed]);

  const data = [
    { name: "Wald", stat: res.wald, p: res.waldP, fill: C.gold },
    { name: "LR", stat: res.lr, p: res.lrP, fill: C.teal },
    { name: "LM (Score)", stat: res.lm, p: res.lmP, fill: C.blue },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text061", { defaultValue: "小样本分歧" }), description: t("labs.econV54.text062", { defaultValue: "n=40 三统计量差异大" }), apply: () => { setN(40); setSignal(0.5); } },
        { name: t("labs.econV54.text063", { defaultValue: "大样本收敛" }), description: t("labs.econV54.text064", { defaultValue: "n=2000 渐近等价" }), apply: () => { setN(2000); setSignal(0.1); } },
        { name: t("labs.econV54.text065", { defaultValue: "真原假设" }), description: "signal=0", apply: () => { setSignal(0); } },
        { name: t("labs.econV54.text066", { defaultValue: "多重约束" }), description: "q=4", apply: () => { setQ(4); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.econV54.text067", { defaultValue: "H₀：最后 q 个系数同时为 0" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV54.text068", { defaultValue: "真实信号" })} sub={t("labs.econV54.text069", { defaultValue: "被约束系数大小" })} value={signal} min={0} max={1} step={0.01} onChange={setSignal} />
            <Slider label={t("labs.econV54.text070", { defaultValue: "约束个数 q" })} value={q} min={1} max={5} step={1} fmt={(v) => v.toFixed(0)} onChange={setQ} />
            <Slider label={t("labs.econV54.text071", { defaultValue: "样本量 n" })} value={n} min={30} max={3000} step={10} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label={t("labs.econV54.text072", { defaultValue: "噪声 σ" })} value={noise} min={0.3} max={3} step={0.1} onChange={setNoise} />
            <Slider label={t("labs.econV54.text073", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="Wald" value={res.wald.toFixed(3)} color={C.gold} sub={`p = ${res.waldP.toFixed(4)}`} />
          <Stat label="LR" value={res.lr.toFixed(3)} color={C.teal} sub={`p = ${res.lrP.toFixed(4)}`} />
          <Stat label="LM (Score)" value={res.lm.toFixed(3)} color={C.blue} sub={`p = ${res.lmP.toFixed(4)}`} />
          <Stat label={t("labs.econV54.text074", { defaultValue: "χ² 自由度" })} value={res.df.toFixed(0)} color={C.text} sub={t("labs.econV54.text075", { defaultValue: "5% 临界值 {{v0}}", v0: [3.84, 5.99, 7.81, 9.49, 11.07][res.df - 1]?.toFixed(2) })} />
          <Stat label="Wald ≥ LR ≥ LM" value={res.ordered ? t("labs.econV54.text076", { defaultValue: "成立" }) : t("labs.econV54.text077", { defaultValue: "数值反转" })} color={res.ordered ? C.green : C.red} sub={t("labs.econV54.text078", { defaultValue: "线性模型下的经典排序" })} />
          <Stat label={t("labs.econV54.text079", { defaultValue: "三者结论" })} value={[res.waldP, res.lrP, res.lmP].every((p) => p < 0.05) ? t("labs.econV54.text080", { defaultValue: "一致拒绝" }) : [res.waldP, res.lrP, res.lmP].every((p) => p >= 0.05) ? t("labs.econV54.text081", { defaultValue: "一致不拒绝" }) : t("labs.econV54.text082", { defaultValue: "结论冲突" }) } color={[res.waldP, res.lrP, res.lmP].every((p) => p < 0.05) || [res.waldP, res.lrP, res.lmP].every((p) => p >= 0.05) ? C.green : C.red} sub={t("labs.econV54.text083", { defaultValue: "5% 水平" })} />
        </div>
      </div>

      <Panel title={t("labs.econV54.text084", { defaultValue: "三大检验统计量 — 同一个原假设的三种几何视角" })}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={[3.84, 5.99, 7.81, 9.49, 11.07][res.df - 1] ?? 3.84} stroke={C.red} strokeDasharray="4 3" label={{ value: t("labs.econV54.text085", { defaultValue: "5% 临界" }), fontSize: 10, fill: C.red }} />
              <Bar dataKey="stat" name={t("labs.econV54.text086", { defaultValue: "统计量" })}>
                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">{t("labs.econV54.text087", { defaultValue: "三种视角：" })}</span>{t("labs.econV54.text088", { defaultValue: "Wald 只估无约束模型、看 β̂ 离约束多远；LM 只估受约束模型、看得分是否为零；LR 两个都估、比较拟合。渐近等价，有限样本下经典排序 W ≥ LR ≥ LM。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text089", { defaultValue: "实务选择：" })}</span>{t("labs.econV54.text090", { defaultValue: "无约束模型难估（如非线性/受限模型）时用 LM；无约束容易、约束难写时用 Wald；Wald 不具参数化不变性（同一约束不同写法结论可能不同），LR 则不受影响。" })}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 4. 标准误实验室 ═══════════ */

export const SELabTool = () => {
  const { t } = useTranslation();
  const [G, setG] = useState(10);
  const [per, setPer] = useState(25);
  const [rhoC, setRhoC] = useState(0.6);
  const [het, setHet] = useState(1);
  const [reps, setReps] = useState(120);
  const [seed, setSeed] = useState(3);

  const res = useMemo(
    () => seCoverageLab({ nClusters: G, perCluster: per, rhoCluster: rhoC, hetero: het, reps, bootB: 79, seed }),
    [G, per, rhoC, het, reps, seed]
  );

  const data = res.results.map((r) => ({
    name: r.label,
    coverage: +(r.coverage * 100).toFixed(1),
    se: +r.meanSE.toFixed(4),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text091", { defaultValue: "少簇灾难" }), description: t("labs.econV54.text092", { defaultValue: "G=6 聚类失效" }), apply: () => { setG(6); setRhoC(0.8); } },
        { name: t("labs.econV54.text093", { defaultValue: "簇多则安全" }), description: "G=50", apply: () => { setG(50); setPer(10); } },
        { name: t("labs.econV54.text094", { defaultValue: "纯异方差" }), description: t("labs.econV54.text095", { defaultValue: "无簇内相关" }), apply: () => { setRhoC(0); setHet(2); } },
        { name: t("labs.econV54.text096", { defaultValue: "同方差基准" }), description: t("labs.econV54.text097", { defaultValue: "各估计量应一致" }), apply: () => { setRhoC(0); setHet(0); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.econV54.text098", { defaultValue: "蒙特卡洛：95% 置信区间的真实覆盖率" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV54.text099", { defaultValue: "簇数 G" })} value={G} min={4} max={60} step={1} fmt={(v) => v.toFixed(0)} onChange={setG} />
            <Slider label={t("labs.econV54.text100", { defaultValue: "簇内样本" })} value={per} min={5} max={60} step={5} fmt={(v) => v.toFixed(0)} onChange={setPer} />
            <Slider label={t("labs.econV54.text101", { defaultValue: "簇内相关 ρ" })} value={rhoC} min={0} max={0.9} step={0.05} onChange={setRhoC} />
            <Slider label={t("labs.econV54.text102", { defaultValue: "异方差强度" })} value={het} min={0} max={3} step={0.1} onChange={setHet} />
            <Slider label={t("labs.econV54.text103", { defaultValue: "重复次数" })} value={reps} min={40} max={400} step={20} fmt={(v) => v.toFixed(0)} onChange={setReps} />
            <Slider label={t("labs.econV54.text104", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.econV54.text105", { defaultValue: "样本量" })} value={res.nObs.toFixed(0)} color={C.blue} sub={t("labs.econV54.text106", { defaultValue: "{{v0}} 簇 × {{v1}}", v0: G, v1: per })} />
          <Stat label={t("labs.econV54.text107", { defaultValue: "β̂ 的真实标准差" })} value={res.sdBeta.toFixed(4)} color={C.teal} sub={t("labs.econV54.text108", { defaultValue: "蒙特卡洛基准" })} />
          {res.results.map((r) => (
            <Stat
              key={r.label}
              label={r.label + t("labs.econV54.text109", { defaultValue: " 覆盖率" })}
              value={(r.coverage * 100).toFixed(1) + "%"}
              color={r.coverage >= 0.92 ? C.green : r.coverage >= 0.85 ? C.gold : C.red}
              sub={t("labs.econV54.text110", { defaultValue: "平均 SE {{v0}}", v0: r.meanSE.toFixed(4) })}
            />
          ))}
        </div>
      </div>

      <Panel title={t("labs.econV54.text111", { defaultValue: "覆盖率 vs 名义 95% — 低于红线即推断过度自信" })}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ bottom: 24 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 9 }} interval={0} angle={-12} textAnchor="end" height={50} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={[50, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={95} stroke={C.red} strokeDasharray="4 3" />
              <Bar dataKey="coverage" name={t("labs.econV54.text112", { defaultValue: "覆盖率 %" })} fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">{t("labs.econV54.text113", { defaultValue: "结论顺序：" })}</span>{t("labs.econV54.text114", { defaultValue: "簇内相关下同方差 SE 严重低估 → 覆盖率崩塌；HC1/HC3 只修异方差、不修簇内相关；聚类稳健渐近正确，但簇数少时仍偏小；Wild cluster bootstrap-t（Rademacher、施加 H₀）在 G&lt;15 时最可靠。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text115", { defaultValue: "经验法则：" })}</span>{t("labs.econV54.text116", { defaultValue: "处理变量在簇层面变动就必须按簇聚类；G &lt; 30 时报告 wild bootstrap p 值。" })}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 5. FE vs RE 与 Hausman ═══════════ */

export const HausmanTool = () => {
  const { t } = useTranslation();
  const [corr, setCorr] = useState(0.7);
  const [N, setN] = useState(120);
  const [T, setT] = useState(6);
  const [sigmaU, setSigmaU] = useState(1);
  const [seed, setSeed] = useState(23);

  const res = useMemo(() => {
    const sim = simulatePanel({ N, T, corrAlphaX: corr, sigmaU, seed, beta: 1 });
    return { fit: feReHausman(sim.y, sim.x), betaTrue: sim.beta };
  }, [N, T, corr, sigmaU, seed]);

  const f = res.fit;
  const bars = [
    { name: t("labs.econV54.text117", { defaultValue: "混合 OLS" }), v: f.pooled, se: f.pooledSE, fill: C.red },
    { name: t("labs.econV54.text118", { defaultValue: "组间 (Between)" }), v: f.between, se: f.betweenSE, fill: C.blue },
    { name: t("labs.econV54.text119", { defaultValue: "随机效应 RE" }), v: f.re, se: f.reSE, fill: C.teal },
    { name: t("labs.econV54.text120", { defaultValue: "固定效应 FE" }), v: f.within, se: f.withinSE, fill: C.gold },
  ].map((b) => ({ ...b, err: 1.96 * b.se }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text121", { defaultValue: "RE 适用" }), description: t("labs.econV54.text122", { defaultValue: "α 与 x 无关" }), apply: () => { setCorr(0); } },
        { name: t("labs.econV54.text123", { defaultValue: "FE 必需" }), description: t("labs.econV54.text124", { defaultValue: "强相关个体效应" }), apply: () => { setCorr(0.85); setSigmaU(1.5); } },
        { name: t("labs.econV54.text125", { defaultValue: "短面板" }), description: "T=3", apply: () => { setT(3); } },
        { name: t("labs.econV54.text126", { defaultValue: "长面板" }), description: "T=20", apply: () => { setT(20); setN(60); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.econV54.text127", { defaultValue: "y = 0.5 + βx + αᵢ + εᵢₜ，corr(αᵢ, xᵢₜ) 可调" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="corr(α, x)" value={corr} min={0} max={0.95} step={0.05} onChange={setCorr} />
            <Slider label={t("labs.econV54.text128", { defaultValue: "σ_α 个体异质性" })} value={sigmaU} min={0.1} max={3} step={0.1} onChange={setSigmaU} />
            <Slider label={t("labs.econV54.text129", { defaultValue: "个体数 N" })} value={N} min={30} max={400} step={10} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label={t("labs.econV54.text130", { defaultValue: "期数 T" })} value={T} min={2} max={20} step={1} fmt={(v) => v.toFixed(0)} onChange={setT} />
            <Slider label={t("labs.econV54.text131", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="FE (Within)" value={f.within.toFixed(3)} color={C.gold} sub={t("labs.econV54.text132", { defaultValue: "SE {{v0}}｜真值 {{v1}}", v0: f.withinSE.toFixed(3), v1: res.betaTrue.toFixed(2) })} />
          <Stat label="RE (GLS)" value={f.re.toFixed(3)} color={C.teal} sub={`SE ${f.reSE.toFixed(3)}｜θ = ${f.theta.toFixed(3)}`} />
          <Stat label="Hausman χ²(1)" value={f.hausman.toFixed(2)} color={f.rejectRE ? C.red : C.green} sub={`p = ${f.hausmanP.toFixed(4)}`} />
          <Stat label={t("labs.econV54.text133", { defaultValue: "模型选择" })} value={f.rejectRE ? t("labs.econV54.text134", { defaultValue: "用固定效应" }) : t("labs.econV54.text135", { defaultValue: "可用随机效应" })} color={f.rejectRE ? C.red : C.green} sub={t("labs.econV54.text136", { defaultValue: "H₀: RE 一致且有效" })} />
          <Stat label={t("labs.econV54.text137", { defaultValue: "Mundlak δ̄ (x̄ᵢ 系数)" })} value={f.mundlak.deltaBar.toFixed(3)} color={C.blue} sub={t("labs.econV54.text138", { defaultValue: "p = {{v0}}（等价检验）", v0: f.mundlak.p.toFixed(4) })} />
          <Stat label={t("labs.econV54.text139", { defaultValue: "方差分解" })} value={`σ²_α ${f.sigmaU2.toFixed(2)} / σ²_ε ${f.sigmaE2.toFixed(2)}`} color={C.text} sub={t("labs.econV54.text140", { defaultValue: "组内相关 {{v0}}", v0: (f.sigmaU2 / (f.sigmaU2 + f.sigmaE2)).toFixed(2) })} />
        </div>
      </div>

      <Panel title={t("labs.econV54.text141", { defaultValue: "四种估计量与 95% 区间 — 只有 FE 对相关个体效应免疫" })}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={bars} margin={{ bottom: 20 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={res.betaTrue} stroke={C.green} strokeDasharray="4 3" label={{ value: t("labs.econV54.text142", { defaultValue: "真值" }), fontSize: 10, fill: C.green }} />
              <Bar dataKey="v" name="β̂">
                {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
                <ErrorBar dataKey="err" width={6} stroke={C.text} />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">{t("labs.econV54.text143", { defaultValue: "Hausman 的逻辑：" })}</span>{t("labs.econV54.text144", { defaultValue: "H₀ 下 RE 一致且有效、FE 一致但低效，两者差异只来自抽样误差；H₁（α 与 x 相关）下 RE 不一致，差异系统性变大。统计量 (β̂_FE − β̂_RE)² / (V_FE − V_RE)。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text145", { defaultValue: "Mundlak 等价式：" })}</span>{t("labs.econV54.text146", { defaultValue: "把组均值 x̄ᵢ 加进 RE 回归，检验其系数是否为 0，与 Hausman 渐近等价，而且可以直接用聚类稳健标准误——现代实证更推荐这条路。" })}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 6. FWL 与共线性几何 ═══════════ */

export const FWLTool = () => {
  const { t } = useTranslation();
  const [rho, setRho] = useState(0.9);
  const [n, setN] = useState(200);
  const [noise, setNoise] = useState(1);
  const [seed, setSeed] = useState(29);

  const res = useMemo(() => {
    const sim = simulateCollinear({ n, rho, noise, seed, b1: 1, b2: 0.5 });
    const fwl = fwlDecompose(sim.X, sim.y, 0);
    const raw = sim.X.map((r, i) => ({ x: +r[0].toFixed(3), y: +sim.y[i].toFixed(3) }));
    const resid = fwl.xTilde.map((v, i) => ({ x: +v.toFixed(3), y: +fwl.yTilde[i].toFixed(3) }));
    return { fwl, raw, resid, b1: sim.b1 };
  }, [n, rho, noise, seed]);

  const f = res.fwl;

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text147", { defaultValue: "近似正交" }), description: "ρ=0.1，VIF≈1", apply: () => { setRho(0.1); } },
        { name: t("labs.econV54.text148", { defaultValue: "严重共线" }), description: "ρ=0.98", apply: () => { setRho(0.98); } },
        { name: t("labs.econV54.text149", { defaultValue: "大样本救场" }), description: "n=2000", apply: () => { setN(2000); setRho(0.95); } },
        { name: t("labs.econV54.text150", { defaultValue: "高噪声" }), description: "σ=3", apply: () => { setNoise(3); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">y = 0.2 + 1·x₁ + 0.5·x₂ + ε，corr(x₁,x₂)=ρ</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV54.text151", { defaultValue: "ρ 回归元相关" })} value={rho} min={0} max={0.99} step={0.01} onChange={setRho} />
            <Slider label={t("labs.econV54.text152", { defaultValue: "样本量 n" })} value={n} min={50} max={3000} step={50} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label={t("labs.econV54.text153", { defaultValue: "噪声 σ" })} value={noise} min={0.2} max={4} step={0.1} onChange={setNoise} />
            <Slider label={t("labs.econV54.text154", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.econV54.text155", { defaultValue: "多元回归 β̂₁" })} value={f.fullBeta.toFixed(4)} color={C.gold} sub={t("labs.econV54.text156", { defaultValue: "真值 {{v0}}", v0: res.b1.toFixed(2) })} />
          <Stat label={t("labs.econV54.text157", { defaultValue: "FWL 残差回归斜率" })} value={f.fwlBeta.toFixed(4)} color={C.teal} sub={t("labs.econV54.text158", { defaultValue: "与上式完全相同" })} />
          <Stat label={t("labs.econV54.text159", { defaultValue: "R²(x₁ ~ 其他)" })} value={f.r2XonOthers.toFixed(3)} color={C.blue} sub={t("labs.econV54.text160", { defaultValue: "被解释掉的信息" })} />
          <Stat label="VIF" value={f.vif.toFixed(2)} color={f.vif > 10 ? C.red : f.vif > 5 ? C.gold : C.green} sub="1/(1−R²)" />
          <Stat label={t("labs.econV54.text161", { defaultValue: "实际 SE(β̂₁)" })} value={f.seFull.toFixed(4)} color={C.red} sub={t("labs.econV54.text162", { defaultValue: "共线性放大后" })} />
          <Stat label={t("labs.econV54.text163", { defaultValue: "若正交时的 SE" })} value={f.seOrthogonal.toFixed(4)} color={C.green} sub={t("labs.econV54.text164", { defaultValue: "方差膨胀 ×{{v0}}", v0: Math.sqrt(f.vif).toFixed(2) })} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title={t("labs.econV54.text165", { defaultValue: "原始散点 y ~ x₁（混入 x₂ 的影响）" })}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="x₁" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="y" stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={res.raw} fill={C.blue} fillOpacity={0.5} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title={t("labs.econV54.text166", { defaultValue: "残差化散点 ỹ ~ x̃₁（净效应，斜率 = β̂₁）" })}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name="x̃₁" stroke={C.text} tick={{ fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="ỹ" stroke={C.text} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Scatter data={res.resid} fill={C.gold} fillOpacity={0.55} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Note>
        <p><span className="text-gold">{t("labs.econV54.text167", { defaultValue: "FWL 定理：" })}</span>{t("labs.econV54.text168", { defaultValue: "多元回归系数 = 「把其他解释变量都剔干净之后」两组残差的简单回归斜率。这正是固定效应去均值、DID 双向固定效应、部分线性模型背后的同一台机器。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text169", { defaultValue: "共线性不是偏误：" })}</span>{t("labs.econV54.text170", { defaultValue: "β̂ 依然无偏，只是可用的残差变异变少 → 方差膨胀 VIF 倍。解决办法是更多变异（样本、实验设计），而不是随便删变量。" })}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 7. 双重选择 LASSO ═══════════ */

export const PDSLassoTool = () => {
  const { t } = useTranslation();
  const [p, setP] = useState(60);
  const [n, setN] = useState(250);
  const [conf, setConf] = useState(1.2);
  const [lambda, setLambda] = useState(0.15);
  const [sparsity, setSparsity] = useState(5);
  const [seed, setSeed] = useState(11);

  const res = useMemo(
    () => pdsLasso({ n, p, alpha: 0.5, confounding: conf, lambda, sparsity, seed }),
    [n, p, conf, lambda, sparsity, seed]
  );

  const bars = [
    { name: t("labs.econV54.text171", { defaultValue: "无控制变量" }), v: res.noControls.beta, fill: C.red },
    { name: t("labs.econV54.text172", { defaultValue: "朴素单次选择" }), v: res.naive.beta, fill: C.blue },
    { name: t("labs.econV54.text173", { defaultValue: "双重选择 PDS" }), v: res.pds.beta, fill: C.gold },
    { name: t("labs.econV54.text174", { defaultValue: "Oracle（已知真集）" }), v: res.oracle.beta, fill: C.teal },
  ];

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text175", { defaultValue: "强混淆" }), description: t("labs.econV54.text176", { defaultValue: "遗漏偏误明显" }), apply: () => { setConf(2); setLambda(0.15); } },
        { name: t("labs.econV54.text177", { defaultValue: "高维 p>n" }), description: "p=300", apply: () => { setP(300); setN(200); } },
        { name: t("labs.econV54.text178", { defaultValue: "过度惩罚" }), description: t("labs.econV54.text179", { defaultValue: "λ=0.35 漏选" }), apply: () => { setLambda(0.35); } },
        { name: t("labs.econV54.text180", { defaultValue: "弱惩罚" }), description: t("labs.econV54.text181", { defaultValue: "λ=0.05 全选" }), apply: () => { setLambda(0.05); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.econV54.text182", { defaultValue: "y = α·d + X'β + ε，d = X'γ + v（α 真值 0.5）" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV54.text183", { defaultValue: "控制变量个数 p" })} value={p} min={20} max={400} step={10} fmt={(v) => v.toFixed(0)} onChange={setP} />
            <Slider label={t("labs.econV54.text184", { defaultValue: "样本量 n" })} value={n} min={100} max={800} step={25} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label={t("labs.econV54.text185", { defaultValue: "混淆强度" })} value={conf} min={0} max={3} step={0.1} onChange={setConf} />
            <Slider label={t("labs.econV54.text186", { defaultValue: "稀疏度 s" })} sub={t("labs.econV54.text187", { defaultValue: "真混淆个数" })} value={sparsity} min={1} max={15} step={1} fmt={(v) => v.toFixed(0)} onChange={setSparsity} />
            <Slider label={t("labs.econV54.text188", { defaultValue: "LASSO 惩罚 λ" })} value={lambda} min={0.02} max={0.5} step={0.01} onChange={setLambda} />
            <Slider label={t("labs.econV54.text189", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.econV54.text190", { defaultValue: "双重选择 α̂" })} value={res.pds.beta.toFixed(3)} color={C.gold} sub={t("labs.econV54.text191", { defaultValue: "SE {{v0}}｜偏误 {{v1}}", v0: res.pds.se.toFixed(3), v1: (res.pds.beta - res.betaTrue).toFixed(3) })} />
          <Stat label={t("labs.econV54.text192", { defaultValue: "朴素选择 α̂" })} value={res.naive.beta.toFixed(3)} color={C.blue} sub={t("labs.econV54.text193", { defaultValue: "偏误 {{v0}}", v0: (res.naive.beta - res.betaTrue).toFixed(3) })} />
          <Stat label={t("labs.econV54.text194", { defaultValue: "无控制 α̂" })} value={res.noControls.beta.toFixed(3)} color={C.red} sub={t("labs.econV54.text195", { defaultValue: "遗漏变量偏误 {{v0}}", v0: (res.noControls.beta - res.betaTrue).toFixed(3) })} />
          <Stat label="Oracle α̂" value={res.oracle.beta.toFixed(3)} color={C.teal} sub={t("labs.econV54.text196", { defaultValue: "已知真实混淆集" })} />
          <Stat label={t("labs.econV54.text197", { defaultValue: "PDS 选中变量" })} value={res.pds.selected.length.toFixed(0)} color={C.gold} sub={t("labs.econV54.text198", { defaultValue: "y 方程 ∪ d 方程" })} />
          <Stat label={t("labs.econV54.text199", { defaultValue: "朴素选中变量" })} value={res.naive.selected.length.toFixed(0)} color={C.blue} sub={t("labs.econV54.text200", { defaultValue: "仅 y 方程" })} />
        </div>
      </div>

      <Panel title={t("labs.econV54.text201", { defaultValue: "α̂ 对比 — 只用一次 LASSO 会漏掉「弱预测 y、强预测 d」的混淆变量" })}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ bottom: 20 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 9 }} interval={0} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={res.betaTrue} stroke={C.green} strokeDasharray="4 3" label={{ value: t("labs.econV54.text202", { defaultValue: "真值 0.5" }), fontSize: 10, fill: C.green }} />
              <Bar dataKey="v" name="α̂">
                {bars.map((b, i) => <Cell key={i} fill={b.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">Belloni-Chernozhukov-Hansen：</span>{t("labs.econV54.text203", { defaultValue: "先对 y 做 LASSO 选一组控制变量，再对处理变量 d 做一次 LASSO，取两次选择的并集重新做 OLS。这样即使模型选择犯错，对 α 的推断仍近似有效（immunized / Neyman 正交）。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text204", { defaultValue: "为什么朴素法失败：" })}</span>{t("labs.econV54.text205", { defaultValue: "对 y 影响弱、但强烈决定 d 的变量会被单次 LASSO 剔除，遗漏它们造成的偏误却被 d 的强关联放大——把「混淆强度」调大就能看到蓝柱系统性偏离真值。" })}</p>
      </Note>
    </div>
  );
};

/* ═══════════ 8. 异质性处理效应诊断 ═══════════ */

export const HteDiagTool = () => {
  const { t } = useTranslation();
  const [het, setHet] = useState(1);
  const [noise, setNoise] = useState(0.4);
  const [n, setN] = useState(2000);
  const [groups, setGroups] = useState(5);
  const [seed, setSeed] = useState(21);

  const res = useMemo(() => {
    const sim = simulateHte({ n, hetero: het, learnerNoise: noise, baseAte: 0.5, seed });
    return hteDiagnostics(sim.y, sim.d, sim.cate, groups);
  }, [n, het, noise, groups, seed]);

  const data = res.gates.map((g) => ({
    name: `G${g.group}`,
    actual: +g.actual.toFixed(3),
    predicted: +g.predicted.toFixed(3),
    err: +(1.96 * g.se).toFixed(3),
  }));

  return (
    <div className="space-y-6">
      <PresetButtons presets={[
        { name: t("labs.econV54.text206", { defaultValue: "真实异质性" }), description: t("labs.econV54.text207", { defaultValue: "学习器有效" }), apply: () => { setHet(1); setNoise(0.3); } },
        { name: t("labs.econV54.text208", { defaultValue: "纯噪声学习器" }), description: t("labs.econV54.text209", { defaultValue: "无可利用异质性" }), apply: () => { setHet(0); setNoise(1.5); } },
        { name: t("labs.econV54.text210", { defaultValue: "弱信号" }), description: t("labs.econV54.text211", { defaultValue: "学习器噪声大" }), apply: () => { setNoise(1.5); setHet(0.6); } },
        { name: t("labs.econV54.text212", { defaultValue: "小样本" }), description: t("labs.econV54.text213", { defaultValue: "n=500 区间变宽" }), apply: () => { setN(500); } },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">{t("labs.econV54.text214", { defaultValue: "τ(x) = 0.5 + κ·x，CATE 学习器带噪声" })}</p>
          <div className="grid grid-cols-2 gap-3">
            <Slider label={t("labs.econV54.text215", { defaultValue: "κ 异质性强度" })} value={het} min={0} max={2} step={0.05} onChange={setHet} />
            <Slider label={t("labs.econV54.text216", { defaultValue: "学习器噪声" })} value={noise} min={0} max={2} step={0.05} onChange={setNoise} />
            <Slider label={t("labs.econV54.text217", { defaultValue: "样本量 n" })} value={n} min={400} max={5000} step={100} fmt={(v) => v.toFixed(0)} onChange={setN} />
            <Slider label={t("labs.econV54.text218", { defaultValue: "分组数" })} value={groups} min={3} max={8} step={1} fmt={(v) => v.toFixed(0)} onChange={setGroups} />
            <Slider label={t("labs.econV54.text219", { defaultValue: "随机种子" })} value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label={t("labs.econV54.text220", { defaultValue: "BLP 平均效应 β₁" })} value={res.blpAte.toFixed(3)} color={C.gold} sub={`SE ${res.blpAteSE.toFixed(3)}`} />
          <Stat label={t("labs.econV54.text221", { defaultValue: "BLP 异质性系数 β₂" })} value={res.blpHet.toFixed(3)} color={Math.abs(res.blpHet) > 0.2 ? C.green : C.text} sub={`SE ${res.blpHetSE.toFixed(3)}`} />
          <Stat label={t("labs.econV54.text222", { defaultValue: "异质性检验 p" })} value={res.blpHetP.toFixed(4)} color={res.blpHetP < 0.05 ? C.green : C.red} sub={t("labs.econV54.text223", { defaultValue: "H₀: 学习器无预测力" })} />
          <Stat label={t("labs.econV54.text224", { defaultValue: "校准判定" })} value={res.blpHetP < 0.05 ? t("labs.econV54.text225", { defaultValue: "学习器有效" }) : t("labs.econV54.text226", { defaultValue: "不优于常数效应" })} color={res.blpHetP < 0.05 ? C.green : C.red} sub={t("labs.econV54.text227", { defaultValue: "β₂ = 1 表示完美校准" })} />
          <Stat label={t("labs.econV54.text228", { defaultValue: "GATES 单调" })} value={res.monotone ? t("labs.econV54.text229", { defaultValue: "是" }) : t("labs.econV54.text230", { defaultValue: "否" })} color={res.monotone ? C.green : C.gold} sub={t("labs.econV54.text231", { defaultValue: "分位组效应递增" })} />
          <Stat label={t("labs.econV54.text232", { defaultValue: "最高−最低组差" })} value={(res.effectRange[1] - res.effectRange[0]).toFixed(3)} color={C.teal} sub={t("labs.econV54.text233", { defaultValue: "可用于目标化投放" })} />
        </div>
      </div>

      <Panel title={t("labs.econV54.text234", { defaultValue: "GATES — 按预测 CATE 分位分组的实际处理效应（95% 区间）" })}>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke={C.text} />
              <Bar dataKey="actual" name={t("labs.econV54.text235", { defaultValue: "实际组效应" })} fill={C.gold}>
                <ErrorBar dataKey="err" width={6} stroke={C.text} />
              </Bar>
              <Line type="monotone" dataKey="predicted" name={t("labs.econV54.text236", { defaultValue: "学习器预测" })} stroke={C.teal} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Note>
        <p><span className="text-gold">GATES：</span>{t("labs.econV54.text237", { defaultValue: "用样本外 CATE 预测把人群排序分组，再在每组内做简单实验对比。若组效应随分位单调上升，说明学习器抓到了真实异质性，可用于目标化政策。" })}</p>
        <p><span className="text-gold">{t("labs.econV54.text238", { defaultValue: "BLP 校准回归：" })}</span>{t("labs.econV54.text239", { defaultValue: "Y ~ a + β₁(D−p̂) + β₂(D−p̂)(τ̂−τ̄)。β₁ 是 ATE，β₂ 是校准斜率：β₂≈1 为完美校准，β₂≈0 说明预测毫无信息——把学习器噪声调大即可复现。" })}</p>
      </Note>
    </div>
  );
};