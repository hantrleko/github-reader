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
  ReferenceLine,
} from "recharts";
import PresetButtons from "../PresetButtons";
import { C, Slider, Stat, tooltipStyle } from "./ui";

/**
 * Pedagogical Climate VaR across NGFS-style scenarios.
 *   Each scenario s defines a carbon price path and a physical-damage multiplier.
 *   Transition loss = brownShare · carbonIntensity · carbonPrice_s   (normalised)
 *   Physical loss   = physicalSensitivity · damage_s
 *   V_s = V0 · (1 − transitionLoss_s − physicalLoss_s)
 *   Climate VaR (worst) = V0 − min_s V_s ;  Expected loss = Σ p_s (V0 − V_s)
 */
const SCENARIOS = [
  { key: "ordered", name: "有序转型", carbon: 0.4, damage: 0.2, prob: 0.4, color: C.green },
  { key: "disordered", name: "无序转型", carbon: 1.0, damage: 0.45, prob: 0.35, color: C.gold },
  { key: "hothouse", name: "温室世界", carbon: 0.1, damage: 1.0, prob: 0.25, color: C.red },
];

export const ClimateVaRTool = () => {
  const [V0] = useState(100);
  const [brownShare, setBrownShare] = useState(0.4);
  const [carbonIntensity, setCarbonIntensity] = useState(0.5);
  const [physicalSensitivity, setPhysicalSensitivity] = useState(0.3);

  const res = useMemo(() => {
    const rows = SCENARIOS.map((s) => {
      const transition = brownShare * carbonIntensity * s.carbon;
      const physical = physicalSensitivity * s.damage;
      const lossFrac = Math.min(0.95, transition + physical);
      const value = V0 * (1 - lossFrac);
      return { ...s, transition, physical, value: +value.toFixed(2), loss: +(V0 - value).toFixed(2) };
    });
    const expectedLoss = rows.reduce((acc, r) => acc + r.prob * r.loss, 0);
    const worst = rows.reduce((m, r) => (r.loss > m.loss ? r : m), rows[0]);
    return { rows, expectedLoss, worst };
  }, [V0, brownShare, carbonIntensity, physicalSensitivity]);

  return (
    <div className="space-y-5">
      <PresetButtons
        presets={[
          { name: "绿色组合", description: "低棕色/低碳强度", apply: () => { setBrownShare(0.1); setCarbonIntensity(0.2); setPhysicalSensitivity(0.2); } },
          { name: "高碳组合", description: "能源/重工", apply: () => { setBrownShare(0.7); setCarbonIntensity(0.8); setPhysicalSensitivity(0.3); } },
          { name: "实体暴露", description: "高物理敏感", apply: () => { setBrownShare(0.3); setCarbonIntensity(0.4); setPhysicalSensitivity(0.7); } },
          { name: "均衡组合", description: "中性", apply: () => { setBrownShare(0.4); setCarbonIntensity(0.5); setPhysicalSensitivity(0.3); } },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-mono text-gold uppercase tracking-wider">组合气候暴露</p>
          <Slider label="棕色资产占比" sub="高碳行业权重" value={brownShare} min={0} max={1} step={0.05} onChange={setBrownShare} />
          <Slider label="碳强度" sub="单位收入排放" value={carbonIntensity} min={0} max={1} step={0.05} onChange={setCarbonIntensity} />
          <Slider label="物理风险敏感度" sub="实物资产受损" value={physicalSensitivity} min={0} max={1} step={0.05} onChange={setPhysicalSensitivity} />
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Stat label="基准价值 V₀" value={V0.toFixed(0)} />
          <Stat label="期望损失" value={res.expectedLoss.toFixed(2)} color={C.gold} sub="Σ pₛ·lossₛ" />
          <Stat label="Climate VaR (最坏)" value={res.worst.loss.toFixed(2)} color={C.red} sub={res.worst.name} />
          <Stat label="最坏情景剩余" value={res.worst.value.toFixed(2)} color={C.red} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-secondary/20 p-4">
        <h4 className="text-sm font-semibold text-foreground mb-2">各 NGFS 情景下的组合重估价值</h4>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={res.rows}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke={C.text} tick={{ fontSize: 10 }} />
              <YAxis stroke={C.text} tick={{ fontSize: 10 }} domain={[0, V0]} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={V0} stroke={C.text} strokeDasharray="3 3" label={{ value: "V₀", fill: C.text, fontSize: 10 }} />
              <Bar dataKey="value" name="重估价值">
                {res.rows.map((r, i) => (
                  <Cell key={i} fill={r.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {res.rows.map((r) => (
            <div key={r.key} className="rounded-lg bg-secondary/40 border border-border p-2 text-[10px] font-mono">
              <p className="text-foreground" style={{ color: r.color }}>{r.name} · p={r.prob}</p>
              <p className="text-muted-foreground">转型 {(r.transition * 100).toFixed(0)}% · 物理 {(r.physical * 100).toFixed(0)}%</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs font-mono text-muted-foreground p-3 rounded-lg bg-secondary/40 border border-border leading-relaxed">
        <p><span className="text-gold">Climate VaR：</span>对每条情景重估贴现现金流，取分位/最坏损失。</p>
        <p><span className="text-gold">直觉冲突：</span>无序转型对棕色资产冲击最大；温室世界则物理风险主导——不同情景下"最危险资产"不同。</p>
      </div>
    </div>
  );
};

export default ClimateVaRTool;