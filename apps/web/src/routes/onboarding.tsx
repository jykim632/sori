import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getSession } from "@/server/auth";
import { createOrganization, getUserOrganizations } from "@/server/organization";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }

    // Get existing organizations (don't redirect, allow creating more)
    const organizations = await getUserOrganizations({ data: { userId: session.user.id } });

    return { session, hasOrganizations: organizations.length > 0 };
  },
});

function OnboardingPage() {
  const { session, hasOrganizations } = Route.useRouteContext();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSlugChange = (value: string) => {
    // Only allow lowercase letters, numbers, and hyphens
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(sanitized);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name if slug is empty or matches previous auto-generated value
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")) {
      const autoSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      setSlug(autoSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("조직 이름을 입력해주세요");
      return;
    }

    if (!slug.trim() || slug.length < 3) {
      setError("URL은 3자 이상이어야 합니다");
      return;
    }

    setLoading(true);

    try {
      const org = await createOrganization({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          userId: session.user.id,
        },
      });
      // Navigate to admin with the new org selected
      navigate({ to: "/admin", search: { org: org.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "조직 생성에 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 py-12 px-4">
      <div className="max-w-md w-full">
        {hasOrganizations && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {hasOrganizations ? "새 조직 만들기" : `환영합니다, ${session.user.name}님!`}
            </h1>
            <p className="mt-2 text-gray-600">
              {hasOrganizations
                ? "새로운 조직을 생성합니다"
                : "시작하려면 조직을 생성해주세요"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                조직 이름
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="우리 회사"
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                조직 URL
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  sori.io/
                </span>
                <input
                  id="slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="flex-1 block w-full px-4 py-3 border border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="my-company"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                영문 소문자, 숫자, 하이픈만 사용 가능
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "생성 중..." : "조직 생성하기"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
