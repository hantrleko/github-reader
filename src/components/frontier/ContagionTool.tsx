import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, makeRng, tooltipStyle } from "./ui";

const N = 14; // banks in the interbank network

/**
 * DebtRank-style distress propagation on an interbank network.
 *   W[i][j] = min(1, exposure_{i←j} / capital_i)  — relative impact of j's default on i
 *   h_i ∈ [0,1] distress; states U(ndistressed) → D(istressed) → I(nactive)
 *   propagation:  h_i += Σ_{j∈D} W[i][j] · h_j   (capped at 1)
 * DebtRank R = Σ v_i·h_i(final) − Σ v_i·h_i(0)   with economic weight v_i.
 */
function simulate(opts: {
  seed: number;
  density: number; // prob of an interbank edge
  capitalRatio: number; // equity / total assets
  lgd: number; // loss given default
  shock: number; // initial distress on the trigger bank
}) {
  const { seed, density, capitalRatio, lgd, shock } = opts;
  const rng = makeRng(seed);

  // total assets per bank (economic weight v_i)
  const assets = Array.from({ length: N }, () => 50 + rng() * 150);
  const capital = assets.map((a) => a * capitalRatio);

  // raw interbank exposure matrix e[i][j] (i is creditor exposed to j)
  const e: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i !== j && rng() < density) {
        e[i][j] = (0.05 + rng() * 0.25) * assets[i];
      }
    }
  }

  // impact matrix W[i][j] = min(1, lgd·e[i][j]/capital_i)
  const W: number[][] = e.map((row, i) => row.map((v) => Math.min(1, (lgd * v) / capital[i])));

  const totalV = assets.reduce((s, a) => s + a, 0);
  const v = assets.map((a) => a / totalV);

  // trigger = largest bank
  let trigger = 0;
  for (let i = 1; i < N; i++) if (assets[i] > assets[trigger]) trigger = i;

  const h = Array(N).fill(0);
  const state = Array(N).fill("U") as ("U" | "D" | "I")[];
  h[trigger] = shock;
  state[trigger] = "D";
  const h0 = [...h];

  let rounds = 0;
  while (state.includes("D") && rounds < 50) {
    rounds++;
    const distressed = state.map((s, i) => (s === "D" ? i : -1)).filter((i) => i >= 0);
    for (const i of distressed) {
      for (let k = 0; k < N; k++) {
        if (state[k] === "I") continue;
        const add = W[k][i] * h[i];
        if (add > 0) {
          const nh = Math.min(1, h[k] + add);
          if (nh > h[k]) {
            h[k] = nh;
            if (state[k] === "U") state[k] = "D";
          }
        }
      }
    }
    for (const i of distressed) state[i] = "I";
  }

  const debtRank = h.reduce((s, hi, i) => s + v[i] * hi, 0) - h0.reduce((s, hi, i) => s + v[i] * hi, 0);
  const defaulted = h.filter((hi) => hi >= 0.999).length;
  const stressed = h.filter((hi) => hi > 0.01).length;

  const bars = h
    .map((hi, i) => ({ name: i === trigger ? `B${i}*` : `B${i}`, distress: +(hi * 100).toFixed(1), trigger: i === trigger }))
    .sort((a, b) => b.distress - a.distress);

  return { debtRank, defaulted, stressed, rounds, bars, trigger };
}

export const ContagionTool = () => {
  const [seed, setSeed] = useState(7);
  const [density, setDensity] = useState(0.3);
  const [capitalRatio, setCapitalRatio] = useState(0.08);
  const [lgd, setLgd] = useState(0.6);
  const [shock, setShock] = useState(1);

  const sim = useMemo(
    () => simulate({ seed, density, capitalRatio, lgd, shock }),
    [seed, density, capitalRatio, lgd, shock]
  );

  return (
    <div className="space-y-5">
      <PresetButtons
        presets={[
          { name: "稳健系统", description: "高资本/低LGD", apply: () => { setCapitalRatio(0.14); setLgd(0.4); setDensity(0.25); setShock(1); } },
          { name: "脆弱系统", description: "薄资本/高密度", apply: () => { setCapitalRatio(0.05); setLgd(0.75); setDensity(0.45); setShock(1); } },
          { name: "2008 式传染", description: "高杠杆+紧密互联", apply: () => { setCapitalRatio(0.04); setLgd(0.8); setDensity(0.5); setShock(1); setSeed(13); } },
          { name: "局部冲击", description: "shock=0.4", apply: () => { setShock(0.4); } },
          { name: "换一个网络", description: "重新随机", apply: () => { setSeed((s) => (s % 99) + 1); } },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">网络与冲击参数</p>
          <Slider label="网络密度 d" sub="边出现概率" value={density} min={0.05} max={0.7} step={0.01} onChange={setDensity} />
          <Slider label="资本充足率" sub="equity/assets" value={capitalRatio} min={0.02} max={0.2} step={0.005} onChange={setCapitalRatio} />
          <Slider label="违约损失率 LGD" value={lgd} min={0.2} max={1} step={0.05} onChange={setLgd} />
          <Slider label="初始冲击 (触发行)" value={shock} min={0.1} max={1} step={0.05} onChange={setShock} />
          <Slider label="网络随机种子" value={seed} min={1} max={99} step={1} fmt={(v) => v.toFixed(0)} onChange={setSeed} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="DebtRank" value={(sim.debtRank * 100).toFixed(1) + "%"} color={C.red} sub="系统价值受损" />
          <Stat label="违约机构" value={`${sim.defaulted} / ${N}`} color={C.red} />
          <Stat label="受压机构" value={`${sim.stressed} / ${N}`} color={C.gold} />
          <Stat label="传染轮数" value={sim.rounds.toFixed(0)} color={C.blue} />
          <Stat label="触发行" value={`B${sim.trigger}`} color={C.teal} sub="最大机构" />
          <Stat label="系统重要性" value={sim.debtRank > 0.3 ? "高" : sim.debtRank > 0.1 ? "中" : "低"} color={sim.debtRank > 0.3 ? C.red : C.gold} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">各机构最终困境度 (B{sim.trigger}* = 触发行)</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sim.bars}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 9 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="distress" name="困境度 %">
                {sim.bars.map((b, i) => (
                  <Cell key={i} fill={b.trigger ? C.gold : b.distress >= 99.9 ? C.red : C.blue} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">DebtRank (Battiston 2012)：</span>度量单一机构困境沿敞口网络传播后造成的系统总价值损失。</p>
        <p><span className="text-gold">传导：</span>h_i += Σ_j min(1, LGD·e_ij/capital_i)·h_j；资本越薄、网络越密、LGD 越高，级联越剧烈。</p>
      </div>
    </div>
  );
};

export default ContagionTool;