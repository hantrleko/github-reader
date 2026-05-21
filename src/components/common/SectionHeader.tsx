interface Props {
  chapter: string; // e.g. "SECTION 02"
  kicker: string;  // e.g. "DERIVATIVES"
  title: string;
  subtitle?: string;
}

const SectionHeader = ({ chapter, kicker, title, subtitle }: Props) => (
  <div className="container max-w-6xl pt-20 pb-4 px-6">
    <div className="flex items-center gap-3 mb-3">
      <span className="h-px w-12 bg-gold" />
      <span className="text-[10px] font-mono tracking-[0.3em] text-gold uppercase font-bold">
        {chapter} / {kicker}
      </span>
      <div className="flex-1 h-px bg-accent/30" />
    </div>
    <h2 className="font-display text-3xl md:text-4xl leading-tight text-foreground">
      {title}
    </h2>
    {subtitle && (
      <p className="text-sm text-foreground/65 mt-2 max-w-2xl leading-relaxed">{subtitle}</p>
    )}
  </div>
);

export default SectionHeader;