import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PageShell } from "@/components/layout/PageShell";
import { Toast } from "@/components/common/Toast";
import { SignupBanner } from "@/components/common/SignupBanner";
import { SplashScreen } from "@/components/common/SplashScreen";
import { useAuthStore } from "@/store/authStore";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-primary">404</h1>
        <h2 className="mt-4 text-xl font-bold">Lost in the Commons</h2>
        <p className="mt-2 text-sm text-text-secondary">
          We couldn't find what you were looking for.
        </p>
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-text-secondary">Try again or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Try again
          </button>
          <Link to="/" className="rounded-xl border border-border px-4 py-2 text-sm font-bold">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#F4F3EC" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "AlphaMinds" },
      { title: "AlphaMinds Commons" },
      { name: "description", content: "A digital community for human flourishing." },
      { property: "og:title", content: "AlphaMinds Commons" },
      { property: "og:description", content: "A digital community for human flourishing." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://api.fontshare.com" },
      { rel: "preconnect", href: "https://cdn.fontshare.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=clash-display@500,600,700&display=swap" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('am-theme');if(t==='dark')document.documentElement.classList.add('dark');var f=localStorage.getItem('am-font-size');var m={sm:'15px',md:'16px',lg:'17.5px'};if(f&&m[f])document.documentElement.style.fontSize=m[f];}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const [splashMinElapsed, setSplashMinElapsed] = useState(false);
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password") || pathname.startsWith("/rel-fi");
  const isLanding = !isAuthenticated && pathname === "/";

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSplashMinElapsed(true), 1600);
    return () => clearTimeout(t);
  }, []);

  const showSplash = isLoading || !splashMinElapsed;

  return (
    <QueryClientProvider client={queryClient}>
      <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      {!isLoading && (
        isAuthRoute || isLanding ? (
          <Outlet />
        ) : (
          <PageShell>
            <Outlet />
          </PageShell>
        )
      )}
      {!isAuthRoute && !isLanding && !isAuthenticated && !isLoading && <SignupBanner />}
      <Toast />
    </QueryClientProvider>
  );
}
