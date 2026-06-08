import { Link } from "react-router-dom";

const UNITS = [
  { code: "UNIT_00", name: "Research Ops", desc: "Playbooks · Steps · Deliverables", anchor: "/#research-playbooks" },
  { code: "UNIT_01", name: "Pricing Engine", desc: "Black-Scholes · IV · Monte Carlo", anchor: "/#calculator" },
  { code: "UNIT_02", name: "Derivatives Lab", desc: "SVI · Heston · SABR · Local Vol", anchor: "/#derivatives" },
  { code: "UNIT_03", name: "Fixed Income", desc: "Bonds · Term structure · Frontier", anchor: "/#bond" },
  { code: "UNIT_04", name: "Econometrics", desc: "OLS · IV · DID · Panel · TS", anchor: "/#econometrics" },
  { code: "UNIT_05", name: "Risk Metrics", desc: "VaR · ES · CVA · Copula", anchor: "/#risk" },
  { code: "UNIT_06", name: "Quant Strategy", desc: "Backtest · Factor · Risk Parity", anchor: "/#quant" },
  { code: "UNIT_07", name: "Macro & CorpFin", desc: "Solow · DSGE · Merton DD", anchor: "/#macro" },
  { code: "UNIT_08", name: "Platform", desc: "Notebook · Real data · Compare", anchor: "/#platform" },
];

const HeroToolStrip = () => {
  const handle = (anchor: string) => (e: React.MouseEvent) => {
    if (!anchor.startsWith("/#")) return;
    e.preventDefault();
    const id = anchor.slice(2);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="px-6 -mt-2 pb-12">
      <div className="container max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-0 border border-accent/40 bg-card/30">
          {UNITS.map((u, i) => (
            <Link
              key={u.code}
              to={u.anchor}
              onClick={handle(u.anchor)}
              className={`group p-4 transition-colors hover:bg-accent/25 ${
                i < UNITS.length - 1 ? "border-r border-accent/30" : ""
              } ${i < 6 ? "border-b lg:border-b-0 border-accent/30" : ""}`}
            >
              <span className="block text-[9px] font-mono text-gold tracking-[0.18em] mb-2">
                {u.code}
              </span>
              <h5 className="text-[12px] font-mono font-bold uppercase tracking-wider text-foreground group-hover:text-gold transition-colors mb-1 leading-tight">
                {u.name}
              </h5>
              <p className="text-[10px] text-foreground/55 leading-snug">{u.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroToolStrip;