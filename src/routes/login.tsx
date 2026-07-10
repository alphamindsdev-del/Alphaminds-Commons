import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/alphaminds-logo.svg";
import { useLogin } from "@/hooks/useLogin";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in · AlphaMinds" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const { setSession } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = await loginMutation.mutateAsync({ email, password });
      setSession(data.token, {
        id: data.member.id,
        email: data.member.email,
        username: data.member.username,
        display_name: data.member.display_name,
        avatar_url: data.member.avatar_r2_key,
        primary_house: data.member.primary_house,
        role: data.member.role,
        chapter_id: data.member.chapter_id,
        subscription_tier: data.member.subscription_tier ?? "free",
        email_verified: data.member.email_verified ?? false,
      });
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message ?? "Invalid email or password");
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      {/* Hero side */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 text-white" style={{ background: "linear-gradient(160deg, #28555e 0%, #1e3f47 60%, #0F1923 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{
          background: "radial-gradient(circle at 20% 30%, #4ECDC4 0%, transparent 40%), radial-gradient(circle at 80% 70%, #6366F1 0%, transparent 40%)",
        }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl bg-accent/20" />
        <div className="relative">
          <img src={logo} alt="AlphaMinds" className="h-14 w-auto brightness-0 invert" />
        </div>
        <div className="relative">
          <p className="font-display text-4xl font-black leading-tight max-w-md">
            "We don't rise to the level of our intentions. We fall to the level of our community."
          </p>
          <p className="mt-4 text-white/70 text-sm uppercase tracking-widest font-bold">The Commons</p>
        </div>
        <p className="relative text-xs text-white/50">© AlphaMinds Commons</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <img src={logo} alt="AlphaMinds" className="h-12 w-auto" />
          </div>
          <h1 className="font-black text-3xl text-text-primary">Welcome back</h1>
          <p className="text-text-secondary mt-1">Sign in to enter the Commons.</p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary placeholder:text-text-secondary" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 pr-12 text-text-primary" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-label="Toggle password">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {loginMutation.isError && (
              <p className="text-sm font-semibold text-red-500">{(loginMutation.error as any)?.message ?? "Invalid email or password"}</p>
            )}
            <button type="submit" disabled={loginMutation.isPending} className="w-full rounded-xl bg-primary text-white font-bold py-3 transition-transform active:scale-[0.97] disabled:opacity-50">
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </button>
            <Link to="/forgot-password" className="block text-center text-sm font-semibold text-primary">Forgot Password?</Link>
            <Link to="/register" className="block w-full text-center rounded-xl border border-border text-text-primary font-bold py-3">Create Account</Link>
          </form>

          <p className="mt-8 text-xs text-text-secondary text-center">By signing in, you agree to our Terms and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}
