import { createFileRoute } from "@tanstack/react-router";
import { RelFiGame } from "@/relfi/game/state/RelFiGame";
import "@/relfi/relfi.css";

export const Route = createFileRoute("/rel-fi")({
  head: () => ({
    meta: [{ title: "Rel-Fi · AlphaMinds" }],
  }),
  component: RelFiPage,
});

function RelFiPage() {
  return <RelFiGame mode="embedded" containerMode="fullscreen" />;
}