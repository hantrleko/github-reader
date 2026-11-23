import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, LogIn, Mail, UserPlus } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  MIN_PASSWORD_LEN, botReason, cooldownLeftSec, isAlreadyRegistered, isEmailNotConfirmed, isValidEmail, signupIssue,
} from "@/lib/authGuards";

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

type Mode = "sign-in" | "sign-up" | "forgot";
type Sent = { kind: "signup" | "recovery"; email: string } | null;

const AuthPage = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [sent, setSent] = useState<Sent>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const startedAt = useRef(Date.now());
  const lastAttemptAt = useRef<number | null>(null);

  const next = sanitizeRedirect(params.get("next") || "/");

  const switchMode = (m: Mode) => {
    setMode(m);
    setUnconfirmed(false);
    startedAt.current = Date.now();
  };

  const fail = (description: string) =>
    toast({ title: t("authFlow.failed"), description, variant: "destructive" });

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
    }
  };

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, next, navigate]);

  /** Returns false (and explains why) when the attempt looks automated or too frequent. */
  const passesBotCheck = () => {
    const now = Date.now();
    const reason = botReason({ honeypot, startedAt: startedAt.current, now, lastAttemptAt: lastAttemptAt.current });
    if (reason === "cooldown") {
      fail(t("authFlow.cooldown", { sec: cooldownLeftSec(lastAttemptAt.current, now) }));
      return false;
    }
    if (reason) {
      fail(t("authFlow.tooFast"));
      return false;
    }
    lastAttemptAt.current = now;
    return true;
  };

  const resend = async (kind: "signup" | "recovery", to: string) => {
    if (!passesBotCheck()) return;
    setBusy(true);
    const { error } =
      kind === "signup"
        ? await supabase.auth.resend({ type: "signup", email: to, options: { emailRedirectTo: `${window.location.origin}${next}` } })
        : await supabase.auth.resetPasswordForEmail(to, { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return fail(error.message);
    toast({ title: t("authFlow.resent") });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnconfirmed(false);

    if (mode === "forgot") {
      if (!isValidEmail(email)) return fail(t("pages.auth.copy1", { defaultValue: "请输入有效邮箱" }));
      if (!passesBotCheck()) return;
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (error) return fail(error.message);
      setSent({ kind: "recovery", email: email.trim() });
      return;
    }

    if (mode === "sign-up") {
      const issue = signupIssue({ email, password, confirm, acceptedTerms });
      if (issue) return fail(t(`authFlow.issue.${issue}`, { n: MIN_PASSWORD_LEN }));
      if (!passesBotCheck()) return;
      setBusy(true);
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}${next}` },
        });
        if (error) throw error;
        if (isAlreadyRegistered(data.user)) {
          fail(t("authFlow.alreadyRegistered"));
          switchMode("sign-in");
          return;
        }
        if (data.session) {
          toast({ title: t("pages.auth.copy6", { defaultValue: "注册成功" }), description: t("pages.auth.copy7", { defaultValue: "正在为你登录..." }) });
        } else {
          setSent({ kind: "signup", email: email.trim() });
        }
      } catch (err) {
        fail(err instanceof Error ? err.message : t("pages.auth.copy9", { defaultValue: "登录失败" }));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!isValidEmail(email)) return fail(t("pages.auth.copy1", { defaultValue: "请输入有效邮箱" }));
    if (password.length < MIN_PASSWORD_LEN) return fail(t("pages.auth.copy2", { defaultValue: "密码至少 6 位" }));
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast({ title: t("pages.auth.copy8", { defaultValue: "已登录" }) });
    } catch (err) {
      if (isEmailNotConfirmed(err)) {
        setUnconfirmed(true);
        fail(t("authFlow.notConfirmed"));
      } else {
        fail(err instanceof Error ? err.message : t("pages.auth.copy9", { defaultValue: "登录失败" }));
      }
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "forgot"
      ? t("authFlow.forgotTitle")
      : mode === "sign-in"
        ? t("pages.auth.copy11", { defaultValue: "欢迎回到 Lab" })
        : t("pages.auth.copy12", { defaultValue: "创建你的 Lab 账号" });

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
          {sent ? (
            <div className="text-center space-y-4" role="status">
              <Mail className="w-10 h-10 text-gold mx-auto" aria-hidden />
              <h1 className="font-display text-3xl text-foreground">{t("authFlow.checkEmailTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                {t(sent.kind === "signup" ? "authFlow.checkEmailSignup" : "authFlow.checkEmailRecovery", { email: sent.email })}
              </p>
              <p className="text-xs text-muted-foreground">{t("authFlow.checkSpam")}</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button variant="outline" disabled={busy} onClick={() => resend(sent.kind, sent.email)} className="font-mono uppercase tracking-wider">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("authFlow.resend")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => { setSent(null); switchMode("sign-in"); }}
                  className="font-mono uppercase tracking-wider"
                >
                  {t("authFlow.backToSignIn")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 text-center">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-2">SECTION / ACCESS</p>
                <h1 className="font-display text-3xl text-foreground mb-2">{title}</h1>
                <p className="text-sm text-muted-foreground">
                  {mode === "forgot"
                    ? t("authFlow.forgotDesc")
                    : t("pages.auth.copy13", { defaultValue: "登录后你的计算历史、术语收藏、GitHub 记录将在所有设备同步。" })}
                </p>
              </div>

              {mode !== "forgot" && (
                <div className="flex border border-accent rounded-md p-1 bg-card mb-6">
                  {(["sign-in", "sign-up"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => switchMode(m)}
                      className={`flex-1 py-2 text-[11px] font-mono uppercase tracking-wider rounded transition-colors ${
                        mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "sign-in" ? "Sign in" : "Sign up"}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4" noValidate>
                {/* Hidden from people; simple bots fill every field. */}
                <div aria-hidden className="absolute -left-[9999px] w-px h-px overflow-hidden">
                  <label htmlFor="website">Website</label>
                  <input id="website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email" className="text-[10px] font-mono uppercase tracking-wider">Email</Label>
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
                {mode !== "forgot" && (
                  <div>
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="pw" className="text-[10px] font-mono uppercase tracking-wider">Password</Label>
                      {mode === "sign-in" && (
                        <button type="button" onClick={() => switchMode("forgot")} className="text-[10px] font-mono text-gold hover:underline">
                          {t("authFlow.forgotLink")}
                        </button>
                      )}
                    </div>
                    <Input
                      id="pw"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                      required
                      minLength={MIN_PASSWORD_LEN}
                      className="mt-1 font-mono"
                    />
                    {mode === "sign-up" && (
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{t("pages.auth.copy14", { defaultValue: "至少 6 位" })}</p>
                    )}
                  </div>
                )}
                {mode === "sign-up" && (
                  <>
                    <div>
                      <Label htmlFor="pw2" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.confirmPassword")}</Label>
                      <Input
                        id="pw2"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="mt-1 font-mono"
                      />
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 accent-gold"
                      />
                      <span>
                        {t("authFlow.agreePrefix")}{" "}
                        <Link to="/terms" target="_blank" className="text-gold hover:underline">{t("authFlow.terms")}</Link>{" "}
                        {t("authFlow.and")}{" "}
                        <Link to="/privacy" target="_blank" className="text-gold hover:underline">{t("authFlow.privacy")}</Link>
                      </span>
                    </label>
                  </>
                )}
                <Button type="submit" disabled={busy} className="w-full font-mono uppercase tracking-wider">
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === "forgot" ? (
                    <><Mail className="w-4 h-4 mr-2" /> {t("authFlow.sendReset")}</>
                  ) : mode === "sign-in" ? (
                    <><LogIn className="w-4 h-4 mr-2" /> Sign in</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-2" /> Create account</>
                  )}
                </Button>
                {unconfirmed && (
                  <button type="button" disabled={busy} onClick={() => resend("signup", email.trim())} className="w-full text-xs font-mono text-gold hover:underline">
                    {t("authFlow.resendConfirm")}
                  </button>
                )}
                {mode === "forgot" && (
                  <button type="button" onClick={() => switchMode("sign-in")} className="w-full text-xs font-mono text-muted-foreground hover:text-gold">
                    {t("authFlow.backToSignIn")}
                  </button>
                )}
              </form>

              {mode !== "forgot" && (
                <>
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
                  {mode === "sign-up" && (
                    <p className="mt-3 text-[10px] text-center text-muted-foreground">{t("authFlow.googleAgree")}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
