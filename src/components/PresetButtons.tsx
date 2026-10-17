import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";

export interface Preset {
  name: string;
  description?: string;
  apply: () => void;
}

interface PresetButtonsProps {
  presets: Preset[];
}

const PresetButtons = ({ presets }: PresetButtonsProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <BookOpen className="w-3 h-3" /> {t("labs.presetButtons.text1", { defaultValue: "预设" })}
      </span>
      {presets.map((p) => (
        <button
          key={p.name}
          onClick={p.apply}
          title={p.description}
          className="px-2.5 py-1 text-[11px] font-mono rounded-md border border-border bg-secondary/50 text-muted-foreground hover:text-gold hover:border-gold/30 hover:bg-gold/5 transition-all"
        >
          {p.name}
        </button>
      ))}
    </div>
  );
};

export default PresetButtons;
