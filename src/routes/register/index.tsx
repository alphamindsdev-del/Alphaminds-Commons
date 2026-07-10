import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/alphaminds-logo.svg";
import { useRegister } from "@/hooks/useRegister";
import { useAuthStore } from "@/store/authStore";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/register/")({
  head: () => ({ meta: [{ title: "Create your account · AlphaMinds" }] }),
  component: RegisterPage,
});

function passwordStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

const GENDER_MAP: Record<string, string> = {
  Female: "female",
  Male: "male",
  "Non-binary": "non_binary",
  "Prefer not to say": "prefer_not_to_say",
};

const COUNTRY_MAP: Record<string, string> = {
  Nigeria: "NG",
  Ghana: "GH",
  Kenya: "KE",
  "South Africa": "ZA",
  UK: "GB",
  USA: "US",
};

const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"] as const;

function RegisterPage() {
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const navigate = useNavigate();
  const registerMutation = useRegister();
  const { setSession } = useAuthStore();
  const s = passwordStrength(pw);
  const labels = ["Weak", "Weak", "Fair", "Strong", "Strong"];
  const colors = ["#EF4444", "#EF4444", "#F59E0B", "#10B981", "#10B981"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (sanitizedUsername.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      const body: Record<string, any> = {
        email,
        username: sanitizedUsername,
        display_name: name,
        password: pw,
        primary_house: "wellness",
      };
      const countryCode = COUNTRY_MAP[country];
      if (countryCode) body.country_code = countryCode;
      if (age) body.age = parseInt(age, 10);
      const genderKey = GENDER_MAP[gender];
      if (genderKey) body.gender = genderKey;

      const data: any = await registerMutation.mutateAsync(body);
      setSession(data.token, {
        id: data.member.id,
        email: data.member.email,
        username: data.member.username,
        display_name: data.member.display_name,
        avatar_url: data.member.avatar_r2_key,
        primary_house: data.member.primary_house,
        role: data.member.role,
        chapter_id: data.member.chapter_id,
        subscription_tier: "free",
        email_verified: data.member.email_verified ?? false,
      });
      navigate({ to: "/register/onboarding" });
    } catch (err: any) {
      console.error("Register error:", err);
      if (err instanceof ApiError && err.details) {
        const fieldErrors = (err.details as any).fieldErrors;
        if (fieldErrors) {
          const fields = Object.keys(fieldErrors).join(", ");
          toast.error("Validation failed", { description: `Check: ${fields}` });
        } else {
          toast.error(err.message ?? "Registration failed");
        }
      } else {
        toast.error(err.message ?? "Registration failed");
      }
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 text-white" style={{ background: "linear-gradient(160deg, #28555e 0%, #1e3f47 60%, #0F1923 100%)" }}>
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 70% 30%, #EC4899 0%, transparent 40%), radial-gradient(circle at 20% 80%, #10B981 0%, transparent 40%)" }} />
        <img src={logo} alt="AlphaMinds" className="h-14 w-auto brightness-0 invert relative" />
        <div className="relative">
          <p className="font-display text-4xl font-black leading-tight max-w-md">"Belonging is built. One small showing-up at a time."</p>
          <p className="mt-4 text-white/70 text-sm uppercase tracking-widest font-bold">The Commons</p>
        </div>
        <p className="relative text-xs text-white/50">© AlphaMinds Commons</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-6 flex justify-center"><img src={logo} alt="AlphaMinds" className="h-12 w-auto" /></div>
          <h1 className="font-black text-3xl text-text-primary">Create your account</h1>
          <p className="text-text-secondary mt-1">Join the Commons in under a minute.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <Field label="Full Name">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3" />
            </Field>
            <Field label="Username">
              <div className="flex items-stretch rounded-[10px] border border-border bg-surface overflow-hidden">
                <span className="flex items-center px-3 text-text-secondary font-semibold border-r border-border">@</span>
                <input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="flex-1 bg-transparent px-3 py-3" />
              </div>
            </Field>
            <Field label="Email">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3" />
            </Field>
            <Field label="Password">
              <input type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min 8 characters" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3" />
              <div className="mt-2 grid grid-cols-4 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-1 rounded-full bg-subtle overflow-hidden">
                    <div className="h-full transition-all" style={{ width: i < s ? "100%" : "0%", background: colors[s] }} />
                  </div>
                ))}
              </div>
              {pw && <p className="text-xs mt-1 font-semibold" style={{ color: colors[s] }}>{labels[s]}</p>}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Country">
                <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full rounded-[10px] border border-border bg-surface px-3 py-3">
                  <option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option><option>UK</option><option>USA</option>
                </select>
              </Field>
              <Field label="Age"><input type="number" min={13} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 25" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3" /></Field>
            </div>
            <Field label="Gender (optional)">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {GENDER_OPTIONS.map((g) => (
                  <label key={g} className="flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2.5 cursor-pointer">
                    <input type="radio" name="gender" checked={gender === g} onChange={() => setGender(g)} className="accent-primary" />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            </Field>
            {registerMutation.isError && (
              <p className="text-sm font-semibold text-red-500">{(registerMutation.error as any)?.message ?? "Registration failed"}</p>
            )}
            <button type="submit" disabled={registerMutation.isPending} className="w-full rounded-xl bg-primary text-white font-bold py-3 disabled:opacity-50">
              {registerMutation.isPending ? "Creating account..." : "Create My Account"}
            </button>
            <p className="text-center text-sm text-text-secondary">Already have an account? <Link to="/login" className="text-primary font-bold">Sign In</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">{label}</label>
      {children}
    </div>
  );
}
