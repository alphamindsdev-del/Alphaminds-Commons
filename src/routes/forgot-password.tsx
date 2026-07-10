import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/alphaminds-logo.svg";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password · AlphaMinds" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Enter your email"); return; }
    setLoading(true);
    try {
      await apiFetch("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      toast.success("Check your email for the reset OTP");
    } catch (err: any) {
      toast.error(err.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
            <h1 className="font-black text-2xl text-text-primary">Check your email</h1>
            <p className="text-sm text-text-secondary mt-2">We sent a one-time code to <strong>{email}</strong></p>
            <button onClick={() => navigate({ to: "/login" })} className="mt-6 w-full rounded-xl bg-primary text-white font-bold py-3">Back to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6"><img src={logo} alt="AlphaMinds" className="h-12 w-auto" /></div>
        <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
          <h1 className="font-black text-2xl text-text-primary text-center">Reset your password</h1>
          <p className="text-sm text-text-secondary text-center mt-1">We'll email you a one-time code.</p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary text-white font-bold py-3 disabled:opacity-50">
              {loading ? "Sending..." : "Send Reset OTP"}
            </button>
          </form>
          <Link to="/login" className="mt-4 block text-center text-sm font-semibold text-primary">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
