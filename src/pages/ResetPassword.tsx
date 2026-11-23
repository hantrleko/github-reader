import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { MIN_PASSWORD_LEN, isRecoveryLink, newPasswordIssue } from "@/lib/authGuards";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  // Read once: the auth client clears the URL hash after it picks up the session.
  const initial = useRef({
    recovery: isRecoveryLink(window.location.hash, window.location.search),
    linkError: /(^|[#&?])error(_code)?=/.test(window.location.hash + window.location.search),
  });
  const [recovery, setRecovery] = useState(initial.current.recovery);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const ready = recovery && !!session && !initial.current.linkError;
  const invalid = !loading && !ready && (initial.current.linkError || !recovery || !session);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const issue = newPasswordIssue(password, confirm);
    if (issue) {
      toast({ title: t("authFlow.failed"), description: t(`authFlow.issue.${issue}`, { n: MIN_PASSWORD_LEN }), variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast({ title: t("authFlow.failed"), description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: t("authFlow.passwordUpdated") });
    navigate("/account", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container py-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-gold transition-colors">
          <ArrowLeft className="w-3 h-3" /> BACK
        </Link>
      </header>
      <main id="main-content" className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold mb-2">SECTION / ACCESS</p>
            <h1 className="font-display text-3xl text-foreground mb-2">{t("authFlow.resetTitle")}</h1>
          </div>
          {ready ? (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label htmlFor="new-pw" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.newPassword")}</Label>
                <Input id="new-pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 font-mono" />
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">{t("pages.auth.copy14", { defaultValue: "至少 6 位" })}</p>
              </div>
              <div>
                <Label htmlFor="new-pw2" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.confirmPassword")}</Label>
                <Input id="new-pw2" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 font-mono" />
              </div>
              <Button type="submit" disabled={busy} className="w-full font-mono uppercase tracking-wider">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><KeyRound className="w-4 h-4 mr-2" /> {t("authFlow.savePassword")}</>}
              </Button>
            </form>
          ) : invalid ? (
            <div className="text-center space-y-4" role="alert">
              <p className="text-sm text-muted-foreground">{t("authFlow.resetInvalid")}</p>
              <Button asChild variant="outline" className="font-mono uppercase tracking-wider">
                <Link to="/auth">{t("authFlow.requestNewLink")}</Link>
              </Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground" role="status">{t("authFlow.checkingLink")}</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
