import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgSlug/admin/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$orgSlug/admin/feedbacks",
      params: { orgSlug: params.orgSlug },
    });
  },
});
