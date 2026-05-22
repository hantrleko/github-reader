import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, LogIn, UserPlus } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(6, "密码至少 6 位"),
});

const AuthPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const next = params.get("next") || "/";

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [user, loading, next, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast({ title: "校验失败", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      if (mode === "sign-up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "注册成功", description: "正在为你登录..." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "已登录" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "登录失败";
      toast({ title: "操作失败", description: msg, variant: "destructive" });
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
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-2">
              SECTION / ACCESS
            </p>
            <h1 className="font-display text-3xl text-foreground mb-2">
              {mode === "sign-in" ? "欢迎回到 Lab" : "创建你的 Lab 账号"}
            </h1>
            <p className="text-sm text-muted-foreground">
              登录后你的计算历史、术语收藏、GitHub 记录将在所有设备同步。
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
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">至少 6 位</p>
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
        </div>
      </main>
    </div>
  );
};

export default AuthPage;