import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/alphaminds-logo.png";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · AlphaMinds" }] }),
  component: ForgotPasswordPage,
});

type Step = "email" | "otp" | "reset";

function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your email"); return; }
    setLoading(true);
    try {
      await apiFetch("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStep("otp");
      toast.success("Check your email for the reset code");
    } catch (err: any) {
      toast.error(err.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const res = await apiFetch<{ reset_token: string }>("/v1/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      setResetToken(res.reset_token);
      setStep("reset");
    } catch (err: any) {
      toast.error(err.message ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await apiFetch("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      toast.success("A new code is on its way");
    } catch (err: any) {
      toast.error(err.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      await apiFetch("/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ reset_token: resetToken, new_password: password }),
      });
      toast.success("Password updated. Sign in with your new password.");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message ?? "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      {/* Hero side */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 text-white bg-[#0C0C0E]">
        <div className="absolute inset-0 opacity-100" style={{
          background: "radial-gradient(circle at 85% 15%, rgba(204,255,61,0.16) 0%, transparent 42%), radial-gradient(circle at 15% 90%, rgba(99,102,241,0.18) 0%, transparent 45%)",
        }} />
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <img src={logo} alt="AlphaMinds" className="h-12 w-auto brightness-0 invert" />
        </div>
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-accent mb-6">
            The Commons<span>//</span>
          </p>
          <p className="font-display font-semibold text-5xl xl:text-6xl leading-[1.02] tracking-tighter max-w-lg">
            Every reset is a chance to show up again.
          </p>
        </div>
        <p className="relative text-[11px] font-bold uppercase tracking-[0.25em] text-white/35">© AlphaMinds Commons</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <img src={logo} alt="AlphaMinds" className="h-12 w-auto" />
          </div>

          {step === "email" && (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-text-secondary mb-2">Account access</p>
              <h1 className="font-display font-semibold text-4xl tracking-tighter text-text-primary">Reset your password</h1>
              <p className="text-text-secondary mt-2">We will email you a one time code.</p>

              <form className="mt-8 space-y-4" onSubmit={handleSendOtp}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary" />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary rounded-xl py-3 text-sm font-black uppercase tracking-wider transition-transform active:scale-[0.98] disabled:opacity-50">
                  {loading ? "Sending..." : "Send Reset OTP"}
                </button>
                <Link to="/login" className="block text-center text-sm font-semibold text-primary">← Back to sign in</Link>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-text-secondary mb-2">Check your inbox</p>
              <h1 className="font-display font-semibold text-4xl tracking-tighter text-text-primary">Enter your code</h1>
              <p className="text-text-secondary mt-2">We sent a 6-digit code to <strong className="text-text-primary">{email}</strong>. It expires in 10 minutes.</p>

              <form className="mt-8 space-y-4" onSubmit={handleVerifyOtp}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">One time code</label>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary tracking-[0.4em] text-center text-lg font-bold"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary rounded-xl py-3 text-sm font-black uppercase tracking-wider transition-transform active:scale-[0.98] disabled:opacity-50">
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
                <div className="flex items-center justify-between text-sm font-semibold">
                  <button type="button" onClick={() => setStep("email")} className="text-text-secondary">← Change email</button>
                  <button type="button" onClick={handleResend} disabled={loading} className="text-primary disabled:opacity-50">Resend code</button>
                </div>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-text-secondary mb-2">Almost there</p>
              <h1 className="font-display font-semibold text-4xl tracking-tighter text-text-primary">Set a new password</h1>
              <p className="text-text-secondary mt-2">Choose a password you will remember. At least 8 characters.</p>

              <form className="mt-8 space-y-4" onSubmit={handleResetPassword}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">New password</label>
                  <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Confirm password</label>
                  <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary" />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary rounded-xl py-3 text-sm font-black uppercase tracking-wider transition-transform active:scale-[0.98] disabled:opacity-50">
                  {loading ? "Saving..." : "Update Password"}
                </button>
                <Link to="/login" className="block text-center text-sm font-semibold text-primary">← Back to sign in</Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
