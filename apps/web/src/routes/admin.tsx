import { createFileRoute, redirect, useRouter, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useState } from "react";
import { getSession } from "@/server/auth";
import { getUserOrganizations } from "@/server/organization";
import { signOut } from "@/lib/auth-client";
import { ChevronDown, Plus, MessageSquare, FolderOpen, Building2, Settings } from "lucide-react";
import type { Organization } from "@/components/admin";

type SearchParams = {
  org?: string;
};

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    org: typeof search.org === "string" ? search.org : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }

    const organizations = await getUserOrganizations();
    if (organizations.length === 0) {
      throw redirect({ to: "/onboarding" });
    }

    const selectedOrgId = search.org || organizations[0].id;
    const currentOrg = organizations.find((o) => o.id === selectedOrgId) || organizations[0];

    return { session, organizations, currentOrg };
  },
});

function AdminLayout() {
  const { session, organizations, currentOrg } = Route.useRouteContext();
  const { org } = Route.useSearch();
  const router = useRouter();
  const matches = useMatches();

  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  // 현재 활성 탭 감지
  const currentPath = matches[matches.length - 1]?.pathname || "";
  const activeTab = currentPath.includes("/projects")
    ? "projects"
    : currentPath.includes("/settings")
      ? "settings"
      : "feedbacks";

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  const handleOrgChange = (orgId: string) => {
    setIsOrgDropdownOpen(false);
    router.navigate({
      to: `/admin/${activeTab}`,
      search: { org: orgId },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="relative">
              <button
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2"
              >
                <h1 className="text-xl font-bold text-gray-900">{currentOrg.name}</h1>
                {organizations.length > 1 && <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {isOrgDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {organizations.map((org: Organization) => (
                    <button
                      key={org.id}
                      onClick={() => handleOrgChange(org.id)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                        org.id === currentOrg.id ? "bg-indigo-50" : ""
                      }`}
                    >
                      <span className="font-medium text-gray-900">{org.name}</span>
                      <span className="text-xs text-gray-500 uppercase">{org.role}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <Link
                      to="/onboarding"
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-indigo-600"
                    >
                      <Plus className="w-4 h-4" />
                      <span>새 조직 만들기</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/organizations"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <Building2 className="w-4 h-4" />
                내 조직
              </Link>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-500">{session?.user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 -mb-px">
            <Link
              to="/admin/feedbacks"
              search={{ org: org || currentOrg.id }}
              className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "feedbacks"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              피드백
            </Link>
            <Link
              to="/admin/projects"
              search={{ org: org || currentOrg.id }}
              className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "projects"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              프로젝트
            </Link>
            <Link
              to="/admin/settings"
              search={{ org: org || currentOrg.id }}
              className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === "settings"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Settings className="w-4 h-4" />
              설정
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
