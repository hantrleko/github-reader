import { Link } from "react-router-dom";
import { topicsData } from "@/data/topicsData";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const TopicCards = () => {
  const { t } = useTranslation();
  return (
    <section className="py-24 px-6">
      <div className="container">
        <div className="text-center mb-16 animate-fade-in">
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-gold mb-3">
            {t("sections.topics.tag")}
          </p>
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground">
            {t("sections.topics.title")}
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-foreground/65 leading-relaxed">
            每个主题都以「核心问题—关键模型—实证应用」组织内容，既适合作为课程复习提纲，也能作为研究选题和模型实现的入口。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border-t border-accent/30">
          {topicsData.map((topic, i) => (
            <div
              key={topic.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Link
                to={`/topic/${topic.id}`}
                className="group relative block p-7 bg-transparent border-b border-r border-accent/30 hover:bg-accent/15 transition-colors duration-300 overflow-hidden h-full"
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] font-mono text-gold tracking-[0.2em] uppercase font-bold">
                      {String(i + 1).padStart(2, "0")} / Topic
                    </span>
                    <topic.icon className="w-3.5 h-3.5 text-gold/70" />
                  </div>
                  <h3 className="text-2xl font-display text-foreground group-hover:text-gold transition-colors mb-1 leading-tight">
                    {topic.title}
                  </h3>
                  <p className="text-[11px] font-mono text-foreground/55 mb-4 italic">
                    {topic.subtitle}
                  </p>
                  <p className="text-sm text-foreground/75 leading-relaxed mb-5">
                    {topic.desc}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {topic.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-mono text-foreground/60 border border-accent/40"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gold/70 group-hover:text-gold inline-flex items-center gap-1 shrink-0 ml-3">
                      Explore <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopicCards;
