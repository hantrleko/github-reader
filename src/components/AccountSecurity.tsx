import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { KeyRound, Loader2, Mail, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DELETE_CONFIRM_WORD, MIN_PASSWORD_LEN, canConfirmDelete, hasPasswordLogin, isValidEmail, newPasswordIssue } from "@/lib/authGuards";

const box = "border border-border/60 bg-card/30 p-6 space-y-4";
const h2 = "font-display text-lg text-foreground inline-flex items-center gap-2";

const AccountSecurity = ({ user }: { user: User }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const passwordAccount = hasPasswordLogin(user);

  const fail = (description: string) => toast({ title: t("authFlow.failed"), description, variant: "destructive" });

  // ---- change password ----
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return fail(t("authFlow.currentRequired"));
    const issue = newPasswordIssue(pw, pw2);
    if (issue) return fail(t(`authFlow.issue.${issue}`, { n: MIN_PASSWORD_LEN }));
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current });
    setPwBusy(false);
    if (error) return fail(error.message);
    setCurrent(""); setPw(""); setPw2("");
    toast({ title: t("authFlow.passwordUpdated") });
  };

  const [linkBusy, setLinkBusy] = useState(false);
  const sendSetPasswordLink = async () => {
    if (!user.email) return;
    setLinkBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
    setLinkBusy(false);
    if (error) return fail(error.message);
    toast({ title: t("authFlow.resent"), description: t("authFlow.checkEmailRecovery", { email: user.email }) });
  };

  // ---- change email ----
  const [newEmail, setNewEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(newEmail)) return fail(t("pages.auth.copy1", { defaultValue: "请输入有效邮箱" }));
    if (newEmail.trim().toLowerCase() === (user.email ?? "").toLowerCase()) return fail(t("authFlow.sameEmail"));
    setEmailBusy(true);
    const { error } = await supabase.auth.updateUser(
      { email: newEmail.trim() },
      { emailRedirectTo: `${window.location.origin}/account` },
    );
    setEmailBusy(false);
    if (error) return fail(error.message);
    toast({ title: t("authFlow.emailChangeSent"), description: t("authFlow.emailChangeDesc", { email: newEmail.trim() }) });
    setNewEmail("");
  };

  // ---- delete account ----
  const [typed, setTyped] = useState("");
  const [delPw, setDelPw] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const deleteAccount = async () => {
    if (!canConfirmDelete(typed)) return;
    setDelBusy(true);
    try {
      if (passwordAccount) {
        const { error } = await supabase.auth.signInWithPassword({ email: user.email ?? "", password: delPw });
        if (error) throw new Error(t("authFlow.wrongPassword"));
      }
      const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirm: DELETE_CONFIRM_WORD } });
      if (error || !data?.ok) throw new Error(t("authFlow.deleteFailed"));
      await signOut().catch(() => {});
      toast({ title: t("authFlow.deleted") });
      navigate("/", { replace: true });
    } catch (err) {
      fail(err instanceof Error ? err.message : t("authFlow.deleteFailed"));
      setDelBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Password */}
      <div className={box}>
        <h2 className={h2}><KeyRound className="w-4 h-4 text-gold" /> {t("authFlow.passwordSection")}</h2>
        {passwordAccount ? (
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <Label htmlFor="cur-pw" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.currentPassword")}</Label>
              <Input id="cur-pw" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1 font-mono" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="acc-pw" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.newPassword")}</Label>
                <Input id="acc-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 font-mono" />
              </div>
              <div>
                <Label htmlFor="acc-pw2" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.confirmPassword")}</Label>
                <Input id="acc-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} className="mt-1 font-mono" />
              </div>
            </div>
            <Button type="submit" disabled={pwBusy} size="sm" className="font-mono uppercase tracking-wider">
              {pwBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("authFlow.savePassword")}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("authFlow.googleOnly")}</p>
            <Button type="button" variant="outline" size="sm" disabled={linkBusy} onClick={sendSetPasswordLink} className="font-mono uppercase tracking-wider">
              {linkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("authFlow.sendSetPassword")}
            </Button>
          </div>
        )}
      </div>

      {/* Email */}
      <div className={box}>
        <h2 className={h2}><Mail className="w-4 h-4 text-gold" /> {t("authFlow.emailSection")}</h2>
        <p className="text-xs text-muted-foreground">{t("authFlow.emailCurrent", { email: user.email ?? "—" })}</p>
        <form onSubmit={changeEmail} className="flex flex-col sm:flex-row gap-2">
          <Input type="email" aria-label={t("authFlow.newEmail")} placeholder={t("authFlow.newEmail")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" className="font-mono" />
          <Button type="submit" disabled={emailBusy} size="sm" className="font-mono uppercase tracking-wider shrink-0">
            {emailBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("authFlow.changeEmail")}
          </Button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="border border-destructive/50 bg-destructive/5 p-6 space-y-3">
        <h2 className={h2}><Trash2 className="w-4 h-4 text-destructive" /> {t("authFlow.deleteSection")}</h2>
        <p className="text-sm text-muted-foreground">{t("authFlow.deleteDesc")}</p>
        <AlertDialog onOpenChange={(open) => { if (!open) { setTyped(""); setDelPw(""); } }}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" size="sm" className="font-mono uppercase tracking-wider">{t("authFlow.deleteButton")}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("authFlow.deleteConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("authFlow.deleteConfirmDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              {passwordAccount && (
                <div>
                  <Label htmlFor="del-pw" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.currentPassword")}</Label>
                  <Input id="del-pw" type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} className="mt-1 font-mono" />
                </div>
              )}
              <div>
                <Label htmlFor="del-word" className="text-[10px] font-mono uppercase tracking-wider">{t("authFlow.typeDelete", { word: DELETE_CONFIRM_WORD })}</Label>
                <Input id="del-word" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="mt-1 font-mono" />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={delBusy}>{t("authFlow.cancel")}</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={delBusy || !canConfirmDelete(typed) || (passwordAccount && !delPw)}
                onClick={deleteAccount}
              >
                {delBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("authFlow.deleteForever")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default AccountSecurity;
