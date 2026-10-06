import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/layout/Logo";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 3 L6 29 M16 3 L26 29 M13 23.5 L19 23.5"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="25" cy="25" r="3.2" fill="var(--accent)" />
    </svg>
  );
}
import {
  Menu,
  X,
  Users,
  HeartHandshake,
  Mic,
  Music,
  Mail,
  Phone,
  Sparkles,
  Radio,
} from "lucide-react";

/* ───────── Reusable pieces ───────── */

function Container({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

/* Brand-tinted photo stand-in (no gray/blur placeholder boxes). */
function Photo({
  icon: Icon,
  className = "",
  tint = "green",
  label,
  image,
  video,
}: {
  icon?: any;
  className?: string;
  tint?: "green" | "lime" | "purple" | "cream";
  label?: string;
  image?: string;
  video?: string;
}) {
  if (video) {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        <video className="absolute inset-0 h-full w-full object-cover" src={video} autoPlay muted loop playsInline />
      </div>
    );
  }
  if (image) {
    return (
      <div className={`relative overflow-hidden rounded-2xl ${className}`}>
        <img src={image} alt={label ?? ""} className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  const tints: Record<string, string> = {
    green: "from-accent-dark-green to-[#0d2415]",
    lime: "from-accent/80 to-accent-dark-green",
    purple: "from-accent-purple/80 to-accent-dark-green",
    cream: "from-card to-[#dcd9cc]",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tints[tint]} ${className}`}>
      <div className="absolute inset-0 subtle-grid opacity-30" aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="h-10 w-10 text-white/70" strokeWidth={1.5} />
      </div>
      {label && (
        <span className="absolute bottom-3 left-3 text-[11px] font-bold uppercase tracking-widest text-white/60">
          {label}
        </span>
      )}
    </div>
  );
}

const media = (name: string) => `/landing_page_media/${encodeURIComponent(name)}`;
const MEDIA = {
  relFi: media("The Rel-Fi Games.jfif"),
  walks: media("The Walks.jfif"),
  grounding: media("The Grounding.jfif"),
  changingWorld: media("CHANGING THE WORLD STARTS WITH CONVERSATIONS.jfif"),
  notAlone: media("YOU WILL NOT HAVE TO GO THROUGH LIFE ALONE.mp4"),
  wellness: media("SAFE SPACE FOR WELLNESS.mp4"),
  journey: media("Life unfolds more beautifully (testimoniial section).jfif"),
  podcast: media("Small talk around big ideas.mp4"),
  rhythm: media("RHYTHM & SOUL.mp4"),
  comingSoon: media("COMING SOON CONTENT CALENDAR TEASER THUMBNAILS.jfif"),
  drNd: media("Dr. Nd Esther Aguh.jpg"),
};

function PillLink({
  to,
  children,
  variant = "accent",
  className = "",
}: {
  to: string;
  children: React.ReactNode;
  variant?: "accent" | "outline";
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={
        variant === "accent"
          ? `btn-accent inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-bold ${className}`
          : `inline-flex items-center justify-center gap-2 rounded-full border border-accent-dark-green bg-bg-card-white px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:border-text-primary ${className}`
      }
    >
      {children}
    </Link>
  );
}

/* ───────── §2 Top navigation ───────── */
const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Membership", href: "#membership" },
  { label: "Wellness", href: "#wellness" },
  { label: "Podcast", href: "#podcast" },
  { label: "Contact", href: "#contact" },
];

function LandingNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-background/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-text-primary transition-colors hover:text-accent-dark-green"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <PillLink to="/login" variant="outline" className="!px-5 !py-2">
            Login
          </PillLink>
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-divider text-text-primary md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>
      {open && (
          <nav className="border-t border-divider bg-background lg:hidden">
          <Container className="flex flex-col py-3">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-semibold text-text-primary"
              >
                {l.label}
              </a>
            ))}
          </Container>
        </nav>
      )}
    </header>
  );
}

/* ───────── §3 Hero ───────── */
function Hero() {
  return (
    <section id="top" className="pt-14 pb-10 text-center sm:pt-20">
      <Container>
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-card-white">
          <LogoMark className="h-9 w-9 text-text-primary" />
        </div>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-text-primary sm:text-6xl">
          Embracing Fun, Becoming,
          <br className="hidden sm:block" /> and Humanity In All Of Us.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-text-secondary sm:text-base">
          A growing community of curious minds exploring healthier lifestyles, purposeful living, and
          human progress through evidence based ideas.
        </p>
        <div className="mt-8 flex justify-center">
          <PillLink to="/register">Join The Club</PillLink>
        </div>
      </Container>
    </section>
  );
}

/* ───────── §4 Three-up feature strip ───────── */
function FeatureStrip() {
  const items = [
    { label: "The Rel-Fi Games", image: MEDIA.relFi },
    { label: "The Walks", image: MEDIA.walks },
    { label: "The Grounding", image: MEDIA.grounding },
  ];
  return (
    <section className="py-10">
      <Container>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {items.map((it) => (
            <div key={it.label}>
              <Photo image={it.image} className="aspect-[4/3] w-full" />
              <p className="mt-3 text-center text-sm font-bold text-text-primary">{it.label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ───────── §5 Changing the world ───────── */
function ChangingWorld() {
  return (
    <section className="py-10">
      <Container>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <h2 className="font-display text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
            Changing The World
            <br /> starts with conversations
          </h2>
          <Photo image={MEDIA.changingWorld} className="aspect-[4/3] w-full" />
        </div>
      </Container>
    </section>
  );
}

/* ───────── §6 You will not go alone ───────── */
function NotAlone() {
  return (
    <section id="membership" className="py-10">
      <Container>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-3xl font-bold leading-tight text-text-primary sm:text-4xl">
            You will not have to
            <br /> go through life alone.
          </h2>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <PillLink to="/register">Become A Member</PillLink>
            <span className="text-xs font-semibold text-text-secondary">Alphaminds Family Spirit</span>
          </div>
        </div>
        <Photo video={MEDIA.notAlone} className="mt-6 aspect-[16/9] w-full" />
      </Container>
    </section>
  );
}

/* ───────── §7 Safe Space for Wellness ───────── */
function WellnessBand() {
  return (
    <section id="wellness" className="scroll-mt-20 bg-accent-dark-green py-14 text-white">
      <Container>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-accent">Mindful, Together</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              Safe Space for Wellness
            </h2>
            <div className="mt-6">
              <PillLink to="/register">Join Us</PillLink>
            </div>
          </div>
          <Photo video={MEDIA.wellness} className="aspect-[4/3] w-full" />
        </div>
      </Container>
    </section>
  );
}

/* ───────── §8 Testimonial / journey ───────── */
function JourneyQuote() {
  return (
    <section className="bg-card py-14">
      <Container>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <p className="font-display text-lg leading-relaxed text-text-primary sm:text-xl">
            Life unfolds more beautifully when journeys are shared and wisdom lights the way. Walking
            beside others, we borrow strength, perspective, and the quiet lessons experience leaves
            behind. In that gentle exchange, living becomes deeper, warmer, and more meaningful.
          </p>
          <Photo image={MEDIA.journey} className="aspect-[4/3] w-full" />
        </div>
      </Container>
    </section>
  );
}

/* ───────── §9 Podcast ───────── */
function PodcastSection() {
  return (
    <section id="podcast" className="scroll-mt-20 relative overflow-hidden py-20 text-white">
      <video className="absolute inset-0 h-full w-full object-cover" src={MEDIA.podcast} autoPlay muted loop playsInline aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-accent-dark-green/85 via-accent-dark-green/55 to-accent-dark-green/90" aria-hidden="true" />
      <div className="absolute inset-0 subtle-grid opacity-20" aria-hidden="true" />
      <Container className="relative">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-accent">
            Alphaminds · Curiosity Lab Podcast
          </span>
          <span className="rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground">
            Feature On The Podcast
          </span>
        </div>
        <h2 className="mt-10 max-w-xl font-display text-4xl font-bold leading-tight text-white sm:text-6xl">
          Small talk around
          <br /> big ideas
        </h2>
        <p className="mt-4 max-w-md text-sm text-white/80">
          No jargon. No gatekeeping. Just real conversations about how the world works.
        </p>
        <Radio className="mt-8 h-12 w-12 text-accent/80" strokeWidth={1.5} />
      </Container>
    </section>
  );
}

/* ───────── §10 Rhythm & Soul ───────── */
function RhythmSoul() {
  return (
    <section className="relative overflow-hidden py-24 text-white">
      <video className="absolute inset-0 h-full w-full object-cover" src={MEDIA.rhythm} autoPlay muted loop playsInline aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-b from-accent-dark-green/65 via-accent-dark-green/30 to-accent-dark-green/75" aria-hidden="true" />
      <Container className="relative">
        <div className="flex justify-end">
          <span className="rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold text-accent-foreground">
            THIS IS
          </span>
        </div>
        <h2 className="mt-40 font-display text-6xl font-black leading-[0.95] tracking-tight text-white sm:text-8xl">
          RHYTHM
          <br />& SOUL
        </h2>
        <p className="mt-8 max-w-md text-right text-xs font-bold uppercase tracking-wider text-white/90 sm:ml-auto">
          Experience our periodic sing along sessions. It&apos;s grounding, it&apos;s uplifting, it&apos;s
          Alphaminds.
        </p>
        <Music className="mt-10 h-12 w-12 text-accent/80" strokeWidth={1.5} />
      </Container>
    </section>
  );
}

/* ───────── §11 Thought leader / bio ───────── */
function ThoughtLeader() {
  return (
    <section className="bg-background py-14">
      <Container>
        <div className="grid items-start gap-8 md:grid-cols-[200px_1fr]">
          <div>
            <div className="mx-auto h-40 w-40 overflow-hidden rounded-3xl bg-gradient-to-br from-accent-purple/80 to-accent-dark-green sm:mx-0">
              <img src={MEDIA.drNd} alt="Dr. Nd Esther Aguh" className="h-full w-full object-cover" />
            </div>
            <p className="mt-3 text-center text-xs text-text-secondary sm:text-left">
              Thought Leader at AlphaMinds Commons
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-text-primary">Dr. Nd Esther Aguh</h2>
            <p className="text-sm italic text-text-secondary">(dr Nd) Also call her: Estee</p>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-text-primary">
              <p>
                Dr. Nd Esther Aguh is the founding voice behind AlphaMinds Commons a physician,
                educator, and community builder who believes that human flourishing is a team sport.
              </p>
              <p>
                Her work weaves evidence based science with the warmth of lived experience, inviting
                members to grow bolder, kinder, and more curious about the world and one another.
              </p>
              <p>
                Through AlphaMinds, she has built a home where fun, becoming, and our shared humanity
                are not abstractions but daily practice.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ───────── §12 Mission strip ───────── */
function MissionStrip() {
  return (
    <section className="bg-card py-16">
      <Container>
        <p className="mx-auto max-w-3xl text-center font-display text-2xl font-bold leading-snug text-text-primary sm:text-3xl">
          At AlphaMinds, we design our spaces and experiences so everyone feels welcome, supported, and
          able to participate fully.
        </p>
      </Container>
    </section>
  );
}

/* ───────── §13 Contact ───────── */
function ContactSection() {
  return (
    <section id="contact" className="scroll-mt-20 bg-background py-14">
      <Container>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-dark-green text-white">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-primary">Email</p>
                <p className="text-sm text-text-secondary">alphamindsclubs@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-dark-green text-white">
                <Phone className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-primary">Phone</p>
                <p className="text-sm text-text-secondary">+248 2778579</p>
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary">
            We&apos;re constantly updating this space with new opportunities and experiences. Check back
            often, many events and online activities are in the pipeline.
          </p>
        </div>
      </Container>
    </section>
  );
}

/* ───────── §14 Coming soon ───────── */
function ComingSoon() {
  const cards = [
    "bg-card",
    "bg-accent-dark-green",
    "bg-accent",
    "bg-accent-purple",
    "bg-card",
    "bg-accent-dark-green",
    "bg-accent",
  ];
  return (
    <section className="bg-background py-12">
      <Container>
        <p className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.28em] text-text-secondary">
          Coming Soon
        </p>
        <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
          <div className="h-28 w-36 shrink-0 overflow-hidden rounded-2xl">
            <img src={MEDIA.comingSoon} alt="Coming soon content" className="h-full w-full object-cover" />
          </div>
          {cards.map((c, i) => (
            <div
              key={i}
              className={`flex h-28 w-36 shrink-0 flex-col justify-end rounded-2xl p-3 ${c}`}
            >
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span className="h-2 w-2 rounded-full bg-white/40" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* ───────── §15 Footer ───────── */
function LandingFooter() {
  const badges = [Sparkles, Users, HeartHandshake, Music, Mic, Radio];
  return (
    <footer className="bg-accent-dark-green py-14 text-white">
      <Container className="flex flex-col items-center text-center">
        <PillLink to="/register">Become A Member</PillLink>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {badges.map((B, i) => (
            <span key={i} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
              <B className="h-5 w-5 text-accent" strokeWidth={1.5} />
            </span>
          ))}
        </div>
        <p className="mt-8 text-xs text-white/50">© AlphaMinds Commons. All rights reserved.</p>
      </Container>
    </footer>
  );
}

/* ───────── Landing page ───────── */
export function LandingPage() {
  return (
    <main className="min-h-dvh bg-background">
      <LandingNav />
      <Hero />
      <FeatureStrip />
      <ChangingWorld />
      <NotAlone />
      <WellnessBand />
      <JourneyQuote />
      <PodcastSection />
      <RhythmSoul />
      <ThoughtLeader />
      <MissionStrip />
      <ContactSection />
      <ComingSoon />
      <LandingFooter />
    </main>
  );
}
