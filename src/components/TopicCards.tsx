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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topicsData.map((topic, i) => (
            <div
              key={topic.id}
              className="animate-fade-in-up hover:-translate-y-1 transition-transform duration-300"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Link
                to={`/topic/${topic.id}`}
                className="group relative block p-6 rounded-xl bg-card border border-border hover:border-gold/30 transition-all duration-500 overflow-hidden h-full"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gold/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <topic.icon className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-semibold text-foreground">
                        {topic.title}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground">
                        {topic.subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-secondary-foreground leading-relaxed mb-4">
                    {topic.desc}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {topic.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-secondary text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors shrink-0 ml-2" />
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
