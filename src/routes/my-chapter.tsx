import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/my-chapter")({
  head: () => ({ meta: [{ title: "My Chapter · AlphaMinds" }] }),
  component: () => <ComingSoon title="My Chapter" />,
});
