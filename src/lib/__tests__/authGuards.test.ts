import { describe, expect, it } from "vitest";
import {
  botReason, canConfirmDelete, cooldownLeftSec, hasPasswordLogin, isAlreadyRegistered,
  isEmailNotConfirmed, isRecoveryLink, newPasswordIssue, signupIssue,
} from "@/lib/authGuards";

const ok = { email: "a@b.co", password: "secret1", confirm: "secret1", acceptedTerms: true };

describe("sign-up rules", () => {
  it("requires accepting the terms", () => {
    expect(signupIssue({ ...ok, acceptedTerms: false })).toBe("terms");
    expect(signupIssue(ok)).toBeNull();
  });
  it("requires at least 6 password characters", () => {
    expect(signupIssue({ ...ok, password: "12345", confirm: "12345" })).toBe("password");
    expect(signupIssue({ ...ok, password: "123456", confirm: "123456" })).toBeNull();
  });
  it("requires both passwords to match", () => {
    expect(signupIssue({ ...ok, confirm: "secret2" })).toBe("mismatch");
    expect(newPasswordIssue("secret1", "secret2")).toBe("mismatch");
  });
  it("rejects malformed email", () => {
    expect(signupIssue({ ...ok, email: "not-an-email" })).toBe("email");
  });
});

describe("bot checks", () => {
  it("blocks a filled hidden field", () => {
    expect(botReason({ honeypot: "x", startedAt: 0, now: 10_000 })).toBe("honeypot");
  });
  it("blocks forms submitted in under 2.5 seconds", () => {
    expect(botReason({ honeypot: "", startedAt: 0, now: 2_000 })).toBe("too_fast");
    expect(botReason({ honeypot: "", startedAt: 0, now: 2_600 })).toBeNull();
  });
  it("enforces a 30-second pause between attempts", () => {
    expect(botReason({ honeypot: "", startedAt: 0, now: 40_000, lastAttemptAt: 20_000 })).toBe("cooldown");
    expect(botReason({ honeypot: "", startedAt: 0, now: 60_000, lastAttemptAt: 20_000 })).toBeNull();
    expect(cooldownLeftSec(20_000, 40_000)).toBe(10);
  });
});

describe("account helpers", () => {
  it("only deletes after typing DELETE exactly", () => {
    expect(canConfirmDelete("DELETE")).toBe(true);
    expect(canConfirmDelete("delete")).toBe(false);
  });
  it("detects an already registered email", () => {
    expect(isAlreadyRegistered({ identities: [] })).toBe(true);
    expect(isAlreadyRegistered({ identities: [{ provider: "email" } as never] })).toBe(false);
  });
  it("detects an unconfirmed email error", () => {
    expect(isEmailNotConfirmed({ code: "email_not_confirmed" })).toBe(true);
    expect(isEmailNotConfirmed({ message: "Invalid login credentials" })).toBe(false);
  });
  it("tells Google-only accounts apart from password accounts", () => {
    expect(hasPasswordLogin({ identities: [{ provider: "google" } as never], app_metadata: { providers: ["google"] } })).toBe(false);
    expect(hasPasswordLogin({ identities: [{ provider: "email" } as never], app_metadata: {} })).toBe(true);
  });
  it("recognises password-recovery links", () => {
    expect(isRecoveryLink("#access_token=x&type=recovery", "")).toBe(true);
    expect(isRecoveryLink("#type=signup", "")).toBe(false);
  });
});
