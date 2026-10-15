import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TutorialPage } from "@/relfi/game/routes/tutorial";
import "@/relfi/relfi.css";

const queryClient = new QueryClient();

export const Route = createFileRoute("/rel-fi/tutorial")({
  head: () => ({
    meta: [{ title: "REL-Fi Tutorial · The Commons" }, { name: "robots", content: "index" }],
  }),
  component: RelFiTutorialPage,
});

function RelFiTutorialPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <TutorialPage />
    </QueryClientProvider>
  );
}
