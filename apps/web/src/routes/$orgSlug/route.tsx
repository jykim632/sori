import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getSession } from "@/server/auth";
import { getUserOrganizations } from "@/server/organization";

export const Route = createFileRoute("/$orgSlug")({
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

    const currentOrg = organizations.find((o) => o.slug === params.orgSlug);

    if (!currentOrg) {
      throw redirect({
        to: "/$orgSlug/admin/feedbacks",
        params: { orgSlug: organizations[0].slug },
      });
    }

    return { session, organizations, currentOrg };
  },
  component: OrgLayout,
});

function OrgLayout() {
  return <Outlet />;
}
