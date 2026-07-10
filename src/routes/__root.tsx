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
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PageShell } from "@/components/layout/PageShell";
import { Toast } from "@/components/common/Toast";
import { SignupBanner } from "@/components/common/SignupBanner";
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
        <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
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
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
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
      { name: "theme-color", content: "#28555e" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "AlphaMinds" },
      { title: "AlphaMinds Commons" },
      { name: "description", content: "A digital community for human flourishing, organized around the Five Houses." },
      { property: "og:title", content: "AlphaMinds Commons" },
      { property: "og:description", content: "A digital community for human flourishing." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://api.fontshare.com" },
      { rel: "preconnect", href: "https://cdn.fontshare.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
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
            __html: `try{var t=localStorage.getItem('am-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
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
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/forgot-password");

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {isLoading ? (
        <div className="min-h-dvh flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            <p className="mt-3 text-sm text-text-secondary">Loading...</p>
          </div>
        </div>
      ) : isAuthRoute ? (
        <Outlet />
      ) : (
        <PageShell>
          <Outlet />
        </PageShell>
      )}
      {!isAuthRoute && !isAuthenticated && !isLoading && <SignupBanner />}
      <Toast />
    </QueryClientProvider>
  );
}
