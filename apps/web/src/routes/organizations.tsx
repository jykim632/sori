import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { getSession } from "@/server/auth";
import { getUserOrganizations } from "@/server/organization";
import { Building2, Plus, Users, FolderOpen, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/organizations")({
  component: OrganizationsPage,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }

    const organizations = await getUserOrganizations({ data: { userId: session.user.id } });

    return { session, organizations };
  },
});

function OrganizationsPage() {
  const { session, organizations } = Route.useRouteContext();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-100 text-purple-700";
      case "ADMIN":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">내 조직</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{session?.user?.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {organizations.length}개의 조직에 소속되어 있습니다.
          </p>
          <Link
            to="/onboarding"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 조직 만들기
          </Link>
        </div>

        <div className="grid gap-4">
          {organizations.map((org) => (
            <Link
              key={org.id}
              to="/admin"
              search={{ org: org.id }}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-indigo-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {org.name}
                    </h3>
                    <p className="text-sm text-gray-500">sori.io/{org.slug}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(org.role)}`}
                  >
                    {org.role}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>멤버</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FolderOpen className="w-4 h-4" />
                  <span>프로젝트</span>
                </div>
              </div>
            </Link>
          ))}

          {organizations.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">조직이 없습니다</h3>
              <p className="text-gray-500 mb-6">첫 번째 조직을 만들어 시작하세요.</p>
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                조직 만들기
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
