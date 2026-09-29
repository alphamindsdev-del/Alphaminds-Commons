import { createFileRoute } from "@tanstack/react-router";
import { BroadcastPage } from "@/relfi/game/routes/broadcast.$code";

export const Route = createFileRoute("/rel-fi/broadcast/$code")({
  head: () => ({
    meta: [
      { title: "Rel-Fi Broadcast · AlphaMinds" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RelFiBroadcastPage,
});

function RelFiBroadcastPage() {
  const { code } = Route.useParams();
  return <BroadcastPage code={code} />;
}
