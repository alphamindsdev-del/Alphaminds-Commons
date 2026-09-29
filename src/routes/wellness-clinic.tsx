import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/common/ComingSoon";

export const Route = createFileRoute("/wellness-clinic")({
  head: () => ({ meta: [{ title: "Wellness Clinic · AlphaMinds" }] }),
  component: () => <ComingSoon title="Wellness Clinic" />,
});
