import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, LogIn, UserPlus } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";



const sanitizeRedirect = (raw: string): string => {
  try {
    const parsed = new URL(raw || "/", window.location.origin);
    if (parsed.origin !== window.location.origin) return "/";
    if (!parsed.pathname.startsWith("/")) return "/";
    if (parsed.pathname === "/auth") return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
};

const AuthPage = () => {
  const { t } = useTranslation();
  const schema = z.object({
  email: z.string().email(t("pages.auth.copy1", { defaultValue: "请输入有效邮箱" })),
  password: z.string().min(6, t("pages.auth.copy2", { defaultValue: "密码至少 6 位" })),
});
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  const next = sanitizeRedirect(params.get("next") || "/");

  const signInWithGoogle = async () => {
  
    setOauthBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${next}`,
    });
    if (result.error) {
      toast({
        title: t("pages.auth.copy3", { defaultValue: "Google 登录失败" }),
        description: result.error instanceof Error ? result.error.message : t("pages.auth.copy4", { defaultValue: "请稍后重试" }),
        variant: "destructive",
      });
      setOauthBusy(false);
      return;
    }
    // result.redirected → 浏览器自动跳转
  };

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, next, navigate]);

  const submit = async (e: React.FormEvent) => {
  
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: t("pages.auth.copy5", { defaultValue: "校验失败" }), description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${next}` },
        });
        if (error) throw error;
        toast({ title: t("pages.auth.copy6", { defaultValue: "注册成功" }), description: t("pages.auth.copy7", { defaultValue: "正在为你登录..." }) });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: t("pages.auth.copy8", { defaultValue: "已登录" }) });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("pages.auth.copy9", { defaultValue: "登录失败" });
      toast({ title: t("pages.auth.copy10", { defaultValue: "操作失败" }), description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-gold transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> BACK
        </Link>
      </header>
      <main id="main-content" className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-2">
              SECTION / ACCESS
            </p>
            <h1 className="font-display text-3xl text-foreground mb-2">
              {mode === "sign-in" ? t("pages.auth.copy11", { defaultValue: "欢迎回到 Lab" }) : t("pages.auth.copy12", { defaultValue: "创建你的 Lab 账号" })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("pages.auth.copy13", { defaultValue: "登录后你的计算历史、术语收藏、GitHub 记录将在所有设备同步。" })}
            </p>
          </div>

          <div className="flex border border-accent rounded-md p-1 bg-card mb-6">
            {(["sign-in", "sign-up"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-[11px] font-mono uppercase tracking-wider rounded transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "sign-in" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-[10px] font-mono uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="pw" className="text-[10px] font-mono uppercase tracking-wider">
                Password
              </Label>
              <Input
                id="pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                required
                minLength={6}
                className="mt-1 font-mono"
              />
              {mode === "sign-up" && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{t("pages.auth.copy14", { defaultValue: "至少 6 位" })}</p>
              )}
            </div>
            <Button type="submit" disabled={busy} className="w-full font-mono uppercase tracking-wider">
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === "sign-in" ? (
                <>
                  <LogIn className="w-4 h-4 mr-2" /> Sign in
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" /> Create account
                </>
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <div className="flex-1 h-px bg-border/60" />
            OR
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={oauthBusy || busy}
            onClick={signInWithGoogle}
            className="w-full font-mono uppercase tracking-wider gap-2"
          >
            {oauthBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.28-4.74 3.28-8.07z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.12c-.22-.66-.35-1.36-.35-2.12s.13-1.46.35-2.12V7.04H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.96l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
