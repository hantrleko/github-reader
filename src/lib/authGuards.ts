// Pure account/sign-up rules shared by the auth pages and their tests.
import type { User } from "@supabase/supabase-js";

export const MIN_PASSWORD_LEN = 6;
/** A human needs at least this long to fill the sign-up form. */
export const MIN_FILL_MS = 2500;
/** Pause between two sign-up / reset-email attempts from the same tab. */
export const ATTEMPT_COOLDOWN_MS = 30_000;
export const DELETE_CONFIRM_WORD = "DELETE";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BotReason = "honeypot" | "too_fast" | "cooldown" | null;

export function botReason(input: {
  honeypot: string;
  startedAt: number;
  now: number;
  lastAttemptAt?: number | null;
}): BotReason {
  if (input.honeypot.trim() !== "") return "honeypot";
  if (input.now - input.startedAt < MIN_FILL_MS) return "too_fast";
  if (input.lastAttemptAt && input.now - input.lastAttemptAt < ATTEMPT_COOLDOWN_MS) return "cooldown";
  return null;
}

export function cooldownLeftSec(lastAttemptAt: number | null | undefined, now: number): number {
  if (!lastAttemptAt) return 0;
  return Math.max(0, Math.ceil((ATTEMPT_COOLDOWN_MS - (now - lastAttemptAt)) / 1000));
}

export const isValidEmail = (email: string) => EMAIL_RE.test(email.trim());

export type SignupIssue = "email" | "password" | "mismatch" | "terms" | null;

export function signupIssue(input: {
  email: string;
  password: string;
  confirm: string;
  acceptedTerms: boolean;
}): SignupIssue {
  if (!isValidEmail(input.email)) return "email";
  if (input.password.length < MIN_PASSWORD_LEN) return "password";
  if (input.password !== input.confirm) return "mismatch";
  if (!input.acceptedTerms) return "terms";
  return null;
}

export function newPasswordIssue(password: string, confirm: string): "password" | "mismatch" | null {
  if (password.length < MIN_PASSWORD_LEN) return "password";
  if (password !== confirm) return "mismatch";
  return null;
}

export const canConfirmDelete = (typed: string) => typed.trim() === DELETE_CONFIRM_WORD;

/** With email confirmation on, re-registering an existing email returns a user with no identities. */
export const isAlreadyRegistered = (user: Pick<User, "identities"> | null | undefined) =>
  !!user && Array.isArray(user.identities) && user.identities.length === 0;

export function isEmailNotConfirmed(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return e.code === "email_not_confirmed" || /email not confirmed/i.test(e.message ?? "");
}

/** True when the account can sign in with email + password (not Google-only). */
export const hasPasswordLogin = (user: Pick<User, "identities" | "app_metadata"> | null | undefined) =>
  !!user &&
  ((user.identities ?? []).some((i) => i.provider === "email") ||
    (user.app_metadata?.providers as string[] | undefined)?.includes("email") === true);

export const isRecoveryLink = (hash: string, search: string) =>
  /(^|[#&])type=recovery(&|$)/.test(hash) || new URLSearchParams(search).get("type") === "recovery";
