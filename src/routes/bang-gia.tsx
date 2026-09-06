import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bang-gia")({
  beforeLoad: () => {
    throw redirect({ to: "/san-pham" });
  },
});
