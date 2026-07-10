// Re-export sonner Toaster for convenience
import { Toaster as SonnerToaster } from "sonner";

export function Toast() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: { borderRadius: "12px", fontFamily: "Satoshi, sans-serif" },
      }}
      duration={4000}
    />
  );
}

export { toast } from "sonner";
