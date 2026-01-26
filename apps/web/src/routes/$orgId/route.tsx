import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getSession } from "@/server/auth";
import { getUserOrganizations } from "@/server/organization";

export const Route = createFileRoute("/$orgId")({
  beforeLoad: async ({ params }) => {
    const [session, organizations] = await Promise.all([
      getSession(),
      getUserOrganizations(),
    ]);

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (organizations.length === 0) {
      throw redirect({ to: "/onboarding" });
    }

    const currentOrg = organizations.find((o) => o.id === params.orgId);

    if (!currentOrg) {
      throw redirect({
        to: "/$orgId/admin/feedbacks",
        params: { orgId: organizations[0].id },
      });
    }

    return { session, organizations, currentOrg };
  },
  component: OrgLayout,
});

function OrgLayout() {
  return <Outlet />;
}
