import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [{ title: "Focus · The Commons" }],
  }),
  component: () => <Navigate to="/focus" replace />,
});
