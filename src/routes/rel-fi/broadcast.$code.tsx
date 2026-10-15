import { createFileRoute } from "@tanstack/react-router";
import { BroadcastPage } from "@/relfi/game/routes/broadcast.$code";
import "@/relfi/relfi.css";

export const Route = createFileRoute("/rel-fi/broadcast/$code")({
  head: () => ({
    meta: [{ title: "REL-Fi Broadcast · The Commons" }, { name: "robots", content: "noindex" }],
  }),
  component: RelFiBroadcastPage,
});

function RelFiBroadcastPage() {
  const { code } = Route.useParams();
  return <BroadcastPage code={code} />;
}
