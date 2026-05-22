import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

const KEY = "reading-mode";

const ReadingModeToggle = () => {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) === "1";
    setOn(saved);
    document.documentElement.classList.toggle("reading-mode", saved);
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    document.documentElement.classList.toggle("reading-mode", next);
  };

  return (
    <button
      onClick={toggle}
      className="relative p-1.5 rounded-md text-muted-foreground hover:text-gold hover:bg-accent transition-colors w-7 h-7 flex items-center justify-center"
      title={on ? "关闭长读模式" : "开启长读模式（降饱和 / 增行距）"}
      aria-label={on ? "关闭长读模式" : "开启长读模式"}
      aria-pressed={on}
    >
      <BookOpen className={`w-4 h-4 ${on ? "text-gold" : ""}`} />
    </button>
  );
};

export default ReadingModeToggle;