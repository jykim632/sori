import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$orgId/admin/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$orgId/admin/feedbacks",
      params: { orgId: params.orgId },
    });
  },
});
