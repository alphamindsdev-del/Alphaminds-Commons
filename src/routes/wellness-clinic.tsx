import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/wellness-clinic")({
  head: () => ({
    meta: [{ title: "Wellness Clinic · AlphaBody" }],
  }),
  component: () => <Navigate to="/alpha-body" replace />,
});
