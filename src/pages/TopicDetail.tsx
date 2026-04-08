import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen } from "lucide-react";
import { topicsData } from "@/data/topicsData";

const TopicDetail = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const topic = topicsData.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">未找到该学科</p>
          <Link to="/" className="text-gold hover:underline text-sm font-mono">
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  const Icon = topic.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative py-20 px-6 border-b border-border overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[300px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
        <div className="container relative z-10 max-w-4xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <Icon className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">
                  {topic.title}
                </h1>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  {topic.subtitle}
                </p>
              </div>
            </div>
            <p className="text-lg text-secondary-foreground leading-relaxed max-w-3xl">
              {topic.heroDesc}
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {topic.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-mono rounded-md bg-secondary text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Knowledge points */}
      <section className="py-16 px-6">
        <div className="container max-w-4xl space-y-8">
          {topic.knowledgePoints.map((kp, i) => (
            <motion.article
              key={i}
              className="rounded-2xl border border-border bg-card p-8 md:p-10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="w-5 h-5 text-gold shrink-0" />
                <h3 className="text-xl font-display font-semibold text-foreground">
                  {kp.title}
                </h3>
              </div>

              <p className="text-secondary-foreground leading-relaxed mb-6">
                {kp.content}
              </p>

              {/* Formula */}
              {kp.formula && (
                <div className="my-6 py-5 px-6 rounded-xl bg-secondary/50 border border-border">
                  <p className="text-xl md:text-2xl font-mono text-gold text-center tracking-wide mb-3">
                    {kp.formula}
                  </p>
                  {kp.formulaExplain && (
                    <p className="text-sm text-muted-foreground text-center">
                      {kp.formulaExplain}
                    </p>
                  )}
                </div>
              )}

              {/* Derivation */}
              {kp.derivation && (
                <div className="mt-6 p-5 rounded-xl border border-gold/15 bg-gold/[0.02]">
                  <p className="text-xs font-mono text-gold mb-3 uppercase tracking-wider">
                    推导过程
                  </p>
                  <ol className="space-y-2">
                    {kp.derivation.map((step, j) => (
                      <li
                        key={j}
                        className="text-sm text-secondary-foreground leading-relaxed pl-1"
                      >
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </section>

      {/* Footer nav */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container max-w-4xl flex justify-between items-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-gold transition-colors font-mono"
          >
            ← 全部学科
          </Link>
          <p className="text-xs text-muted-foreground font-mono">
            {topic.knowledgePoints.length} 个知识点
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TopicDetail;
