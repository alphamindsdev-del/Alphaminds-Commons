import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Admin } from "@/relfi/game/routes/admin";

const queryClient = new QueryClient();

export const Route = createFileRoute("/rel-fi/admin")({
  head: () => ({
    meta: [
      { title: "Rel-Fi Admin · AlphaMinds" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RelFiAdminPage,
});

function RelFiAdminPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Admin />
    </QueryClientProvider>
  );
}
