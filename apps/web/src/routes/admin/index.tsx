import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/feedbacks",
      search: search as { org?: string },
    });
  },
});
