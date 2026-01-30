import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getProjects, createProject, deleteProject, updateProject } from "@/server/projects";
import { Plus, X, FolderOpen, Copy, Check, Trash2, Palette, Pencil } from "lucide-react";
import { DeleteProjectModal, EditProjectModal, type Project } from "@/components/admin";

export const Route = createFileRoute("/$orgSlug/admin/projects/")({
  component: ProjectsPage,
  loader: async ({ context }): Promise<{ projects: Project[] }> => {
    const ctx = context as { currentOrg: { id: string } };
    const projects = await getProjects({ data: { organizationId: ctx.currentOrg.id } }) as unknown as Project[];
    return { projects };
  },
});

function ProjectsPage() {
  const { projects } = Route.useLoaderData() as { projects: Project[] };
  const { orgSlug } = Route.useParams();
  const { currentOrg } = Route.useRouteContext() as { currentOrg: { id: string } };
  const router = useRouter();

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectOrigins, setNewProjectOrigins] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  // Delete modal
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  // Edit modal
  const [projectToEdit, setProjectToEdit] = useState<{
    id: string;
    name: string;
    allowedOrigins: string[];
  } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      await createProject({
        data: {
          name: newProjectName.trim(),
          organizationId: currentOrg.id,
          allowedOrigins: newProjectOrigins
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean),
        },
      });
      setNewProjectName("");
      setNewProjectOrigins("");
      setShowNewProject(false);
      router.invalidate();
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    await deleteProject({ data: { id } });
    router.invalidate();
  };

  const handleUpdateProject = async (id: string, name: string, allowedOrigins: string[]) => {
    await updateProject({
      data: { id, name, allowedOrigins },
    });
    router.invalidate();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* New Project Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowNewProject(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 프로젝트
        </button>
      </div>

      {/* New Project Form */}
      {showNewProject && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">새 프로젝트 만들기</h3>
            <button
              onClick={() => setShowNewProject(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 이름</label>
              <input
                type="text"
                required
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="My App"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                허용 도메인 <span className="text-gray-400 font-normal">(한 줄에 하나씩)</span>
              </label>
              <textarea
                value={newProjectOrigins}
                onChange={(e) => setNewProjectOrigins(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder={"https://myapp.com\nhttps://*.myapp.com"}
              />
              <p className="mt-1 text-xs text-gray-500">비워두면 모든 도메인 허용</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowNewProject(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {creating ? "생성 중..." : "생성"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects List */}
      <div className="grid gap-4">
        {projects.map((project) => (
          <div key={project.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <span className="text-xs text-gray-400 font-mono">{project.id}</span>
                  <button
                    onClick={() => copyToClipboard(project.id, project.id)}
                    className="p-0.5 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="ID 복사"
                  >
                    {copiedId === project.id ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {project.allowedOrigins.length > 0
                    ? project.allowedOrigins.join(", ")
                    : "모든 도메인 허용"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/$orgSlug/admin/projects/$projectId"
                  params={{ orgSlug, projectId: project.id }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Palette className="w-4 h-4" />
                  위젯 설정
                </Link>
                <button
                  onClick={() =>
                    setProjectToEdit({
                      id: project.id,
                      name: project.name,
                      allowedOrigins: project.allowedOrigins,
                    })
                  }
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  title="프로젝트 수정"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setProjectToDelete({ id: project.id, name: project.name })}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="프로젝트 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-400">
                  {new Date(project.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-indigo-600 uppercase">임베드 코드</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `<script src="https://cdn.sori.life/widget.js" data-project-id="${project.id}"></script>`,
                      `embed-${project.id}`
                    )
                  }
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  {copiedId === `embed-${project.id}` ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copiedId === `embed-${project.id}` ? "복사됨" : "복사"}
                </button>
              </div>
              <code className="text-xs text-indigo-900 font-mono break-all">{`<script src="https://cdn.sori.life/widget.js" data-project-id="${project.id}"></script>`}</code>
            </div>
          </div>
        ))}

        {projects.length === 0 && !showNewProject && (
          <div className="text-center py-12 text-gray-400">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>프로젝트가 없습니다.</p>
            <button
              onClick={() => setShowNewProject(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              첫 프로젝트 만들기
            </button>
          </div>
        )}
      </div>

      {/* Delete Project Modal */}
      {projectToDelete && (
        <DeleteProjectModal
          project={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onDelete={handleDeleteProject}
        />
      )}

      {/* Edit Project Modal */}
      {projectToEdit && (
        <EditProjectModal
          project={projectToEdit}
          onClose={() => setProjectToEdit(null)}
          onSave={handleUpdateProject}
        />
      )}
    </div>
  );
}
