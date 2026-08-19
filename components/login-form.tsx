"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not send the code.");
        return;
      }
      if (data?.devCode) setDevCode(data.devCode);
      setStep("otp");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Invalid code.");
        return;
      }
      const isAdmin =
        data?.user?.role === "ADMIN" || data?.user?.role === "SUPER_ADMIN";
      const target =
        next && next !== "/account" ? next : isAdmin ? "/admin" : "/account";
      router.push(target);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-soft-stone rounded-sm p-6 md:p-8">
      {step === "phone" ? (
        <form onSubmit={sendOtp} className="flex flex-col gap-4">
          <label className="text-xs uppercase tracking-widest text-body-muted font-semibold">
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            required
            className="rounded-sm border border-hairline bg-canvas px-4 py-3 text-sm focus:outline-none focus:border-deep-green"
          />
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-deep-green text-on-primary py-3.5 text-sm font-semibold hover:bg-primary transition-colors disabled:opacity-40 cursor-pointer"
          >
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-widest text-body-muted font-semibold">
              One-time code
            </label>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="text-xs text-body-muted hover:text-ink"
            >
              ← Change phone
            </button>
          </div>
          {devCode ? (
            <div className="bg-pale-green rounded-sm px-4 py-3 text-sm">
              <span className="text-body-muted">Mock mode code: </span>
              <span className="font-mono font-bold text-deep-green">{devCode}</span>
            </div>
          ) : null}
          <p className="text-xs text-body-muted">
            Sent to <span className="font-medium text-ink">{phone}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            required
            maxLength={6}
            className="rounded-sm border border-hairline bg-canvas px-4 py-3 text-sm tracking-[0.3em] text-center focus:outline-none focus:border-deep-green"
          />
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="rounded-full bg-deep-green text-on-primary py-3.5 text-sm font-semibold hover:bg-primary transition-colors disabled:opacity-40 cursor-pointer"
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense>
      <LoginFormInner />
    </Suspense>
  );
}
