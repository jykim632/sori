import { createFileRoute, redirect, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { getFeedbacks, updateFeedbackStatus } from "@/server/feedback";
import { getProjects, createProject, deleteProject, updateProject } from "@/server/projects";
import { getSession } from "@/server/auth";
import { getUserOrganizations } from "@/server/organization";
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhookById } from "@/server/webhook";
import { createReply, getReplies, deleteReply as deleteReplyFn } from "@/server/reply";
import { signOut } from "@/lib/auth-client";
import { ChevronDown, Plus, MessageSquare, FolderOpen, Copy, Check, X, Building2, Settings, ExternalLink, Globe, Clock, Mail, Bug, HelpCircle, Lightbulb, Trash2, Send, ToggleLeft, ToggleRight, Palette, MessageCircle, Lock, AlertTriangle, Pencil } from "lucide-react";

type SearchParams = {
  org?: string;
  tab?: "feedbacks" | "projects" | "settings";
};

type FeedbackMetadata = {
  url?: string;
  userAgent?: string;
};

type Feedback = {
  id: string;
  type: string;
  message: string;
  email: string | null;
  status: string;
  metadata: FeedbackMetadata | null;
  createdAt: Date;
  project: { name: string } | null;
};

type Webhook = {
  id: string;
  name: string;
  url: string;
  type: "SLACK" | "DISCORD" | "TELEGRAM" | "CUSTOM";
  enabled: boolean;
  createdAt: Date;
};

type Reply = {
  id: string;
  content: string;
  feedbackId: string;
  authorId: string | null;
  authorName: string | null;
  authorType: "USER" | "ADMIN" | "API";
  isInternal: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    org: typeof search.org === "string" ? search.org : undefined,
    tab: search.tab === "projects" ? "projects" : search.tab === "settings" ? "settings" : "feedbacks",
  }),
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }

    const organizations = await getUserOrganizations({ data: { userId: session.user.id } });
    if (organizations.length === 0) {
      throw redirect({ to: "/onboarding" });
    }

    return { session, organizations };
  },
  loaderDeps: ({ search }) => ({ orgId: search.org }),
  loader: async ({ context, deps }) => {
    const selectedOrgId = deps.orgId || context.organizations[0].id;
    const currentOrg = context.organizations.find((o) => o.id === selectedOrgId) || context.organizations[0];

    const [feedbacks, projects, webhooks] = await Promise.all([
      getFeedbacks({ data: { organizationId: currentOrg.id } }),
      getProjects({ data: { organizationId: currentOrg.id } }),
      getWebhooks({ data: { organizationId: currentOrg.id } }),
    ]);

    return { feedbacks, projects, webhooks, currentOrg };
  },
});

function AdminPage() {
  const { feedbacks, projects, webhooks, currentOrg } = Route.useLoaderData();
  const { session, organizations } = Route.useRouteContext();
  const { tab } = Route.useSearch();
  const router = useRouter();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectOrigins, setNewProjectOrigins] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  // Webhook states
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [togglingWebhookId, setTogglingWebhookId] = useState<string | null>(null);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

  // Reply states
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReplyContent, setNewReplyContent] = useState("");
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [creatingReply, setCreatingReply] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);

  // Project delete states
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteProjectConfirmName, setDeleteProjectConfirmName] = useState("");
  const [deletingProject, setDeletingProject] = useState(false);

  // Project edit states
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<{ id: string; name: string; allowedOrigins: string[] } | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectOrigins, setEditProjectOrigins] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "OPEN" ? "RESOLVED" : "OPEN";
    await updateFeedbackStatus({ data: { id, status: newStatus } });
    router.invalidate();
  };

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

  const handleOrgChange = (orgId: string) => {
    setIsOrgDropdownOpen(false);
    router.navigate({ to: "/admin", search: { org: orgId, tab } });
  };

  const handleTabChange = (newTab: "feedbacks" | "projects" | "settings") => {
    router.navigate({ to: "/admin", search: { org: currentOrg.id, tab: newTab } });
  };

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

  const handleDeleteProject = async () => {
    if (!projectToDelete || deleteProjectConfirmName !== projectToDelete.name) return;

    setDeletingProject(true);
    try {
      await deleteProject({ data: { id: projectToDelete.id } });
      setShowDeleteProjectModal(false);
      setProjectToDelete(null);
      setDeleteProjectConfirmName("");
      router.invalidate();
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("프로젝트 삭제에 실패했습니다.");
    } finally {
      setDeletingProject(false);
    }
  };

  const openDeleteProjectModal = (project: { id: string; name: string }) => {
    setProjectToDelete(project);
    setDeleteProjectConfirmName("");
    setShowDeleteProjectModal(true);
  };

  const openEditProjectModal = (project: { id: string; name: string; allowedOrigins: string[] }) => {
    setProjectToEdit(project);
    setEditProjectName(project.name);
    setEditProjectOrigins(project.allowedOrigins.join("\n"));
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async () => {
    if (!projectToEdit || !editProjectName.trim()) return;

    setSavingProject(true);
    try {
      await updateProject({
        data: {
          id: projectToEdit.id,
          name: editProjectName.trim(),
          allowedOrigins: editProjectOrigins
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean),
        },
      });
      setShowEditProjectModal(false);
      setProjectToEdit(null);
      setEditProjectName("");
      setEditProjectOrigins("");
      router.invalidate();
    } catch (error) {
      console.error("Failed to update project:", error);
      alert("프로젝트 수정에 실패했습니다.");
    } finally {
      setSavingProject(false);
    }
  };

  // Webhook handlers
  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) return;

    setCreatingWebhook(true);
    try {
      await createWebhook({
        data: {
          organizationId: currentOrg.id,
          name: newWebhookName.trim(),
          url: newWebhookUrl.trim(),
        },
      });
      setNewWebhookName("");
      setNewWebhookUrl("");
      setShowNewWebhook(false);
      router.invalidate();
    } catch (error) {
      alert(error instanceof Error ? error.message : "웹훅 생성 실패");
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleToggleWebhook = async (webhook: Webhook) => {
    setTogglingWebhookId(webhook.id);
    try {
      await updateWebhook({
        data: {
          id: webhook.id,
          enabled: !webhook.enabled,
        },
      });
      router.invalidate();
    } catch (error) {
      console.error(error);
    } finally {
      setTogglingWebhookId(null);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm("정말 이 웹훅을 삭제하시겠습니까?")) return;

    setDeletingWebhookId(webhookId);
    try {
      await deleteWebhook({ data: { id: webhookId } });
      router.invalidate();
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingWebhookId(null);
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingWebhookId(webhookId);
    setWebhookTestResult(null);

    try {
      const result = await testWebhookById({ data: { webhookId } });
      setWebhookTestResult({ id: webhookId, ...result });
    } catch (error) {
      setWebhookTestResult({
        id: webhookId,
        success: false,
        message: error instanceof Error ? error.message : "연결 실패",
      });
    } finally {
      setTestingWebhookId(null);
      setTimeout(() => setWebhookTestResult(null), 5000);
    }
  };

  // Reply handlers
  const handleOpenFeedbackModal = async (feedback: Feedback) => {
    setSelectedFeedback({
      ...feedback,
      metadata: feedback.metadata as FeedbackMetadata | null,
    });
    setReplies([]);
    setNewReplyContent("");
    setIsInternalReply(false);
    setLoadingReplies(true);
    try {
      const feedbackReplies = await getReplies({ data: { feedbackId: feedback.id } });
      setReplies(feedbackReplies as Reply[]);
    } catch (error) {
      console.error("Failed to load replies:", error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplyContent.trim() || !selectedFeedback) return;

    setCreatingReply(true);
    try {
      const newReply = await createReply({
        data: {
          feedbackId: selectedFeedback.id,
          content: newReplyContent.trim(),
          isInternal: isInternalReply,
        },
      });
      setReplies([...replies, newReply as Reply]);
      setNewReplyContent("");
      setIsInternalReply(false);
    } catch (error) {
      console.error("Failed to create reply:", error);
      alert("답변 등록에 실패했습니다.");
    } finally {
      setCreatingReply(false);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (!confirm("정말 이 답변을 삭제하시겠습니까?")) return;

    setDeletingReplyId(replyId);
    try {
      await deleteReplyFn({ data: { id: replyId } });
      setReplies(replies.filter((r) => r.id !== replyId));
    } catch (error) {
      console.error("Failed to delete reply:", error);
      alert("답변 삭제에 실패했습니다.");
    } finally {
      setDeletingReplyId(null);
    }
  };

  const getAuthorTypeLabel = (type: string) => {
    switch (type) {
      case "ADMIN": return "관리자";
      case "API": return "API";
      case "USER": return "사용자";
      default: return type;
    }
  };

  const getWebhookTypeLabel = (type: string) => {
    switch (type) {
      case "SLACK": return "Slack";
      case "DISCORD": return "Discord";
      case "TELEGRAM": return "Telegram";
      default: return "Custom";
    }
  };

  const getWebhookTypeColor = (type: string) => {
    switch (type) {
      case "SLACK": return "bg-purple-100 text-purple-700";
      case "DISCORD": return "bg-indigo-100 text-indigo-700";
      case "TELEGRAM": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "BUG": return <Bug className="w-4 h-4" />;
      case "INQUIRY": return <HelpCircle className="w-4 h-4" />;
      case "FEATURE": return <Lightbulb className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "BUG": return "버그 리포트";
      case "INQUIRY": return "문의";
      case "FEATURE": return "기능 요청";
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "OPEN": return "대기중";
      case "IN_PROGRESS": return "처리중";
      case "RESOLVED": return "완료";
      case "CLOSED": return "닫힘";
      default: return status;
    }
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
                {organizations.length > 1 && (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {isOrgDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {organizations.map((org) => (
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
            <button
              onClick={() => handleTabChange("feedbacks")}
              className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                tab === "feedbacks"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              피드백 ({feedbacks.length})
            </button>
            <button
              onClick={() => handleTabChange("projects")}
              className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                tab === "projects"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              프로젝트 ({projects.length})
            </button>
            <button
              onClick={() => handleTabChange("settings")}
              className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                tab === "settings"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Settings className="w-4 h-4" />
              설정
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === "feedbacks" ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm font-medium">
                <tr>
                  <th className="p-4">상태</th>
                  <th className="p-4">유형</th>
                  <th className="p-4">메시지</th>
                  <th className="p-4">프로젝트</th>
                  <th className="p-4">이메일</th>
                  <th className="p-4">날짜</th>
                  <th className="p-4">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feedbacks.map((feedback) => (
                  <tr
                    key={feedback.id}
                    className="hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => handleOpenFeedbackModal(feedback)}
                  >
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          feedback.status === "OPEN"
                            ? "bg-yellow-100 text-yellow-800"
                            : feedback.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {getStatusLabel(feedback.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1.5 text-gray-700">
                        {getTypeIcon(feedback.type)}
                        {getTypeLabel(feedback.type)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 max-w-md truncate" title={feedback.message}>
                      {feedback.message}
                    </td>
                    <td className="p-4 text-gray-500">{feedback.project?.name}</td>
                    <td className="p-4 text-gray-500">{feedback.email || "-"}</td>
                    <td className="p-4 text-gray-400 text-sm">
                      {new Date(feedback.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(feedback.id, feedback.status);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {feedback.status === "OPEN" ? "처리 완료" : "다시 열기"}
                      </button>
                    </td>
                  </tr>
                ))}
                {feedbacks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      피드백이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : tab === "projects" ? (
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
                  <button onClick={() => setShowNewProject(false)} className="text-gray-400 hover:text-gray-600">
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
                          {copiedId === project.id ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
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
                        to="/admin/projects/$projectId"
                        params={{ projectId: project.id }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Palette className="w-4 h-4" />
                        위젯 설정
                      </Link>
                      <button
                        onClick={() => openEditProjectModal({ id: project.id, name: project.name, allowedOrigins: project.allowedOrigins })}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="프로젝트 수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openDeleteProjectModal({ id: project.id, name: project.name })}
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
                            `<script src="${window.location.origin}/api/v1/widget" data-project-id="${project.id}"></script>`,
                            `embed-${project.id}`
                          )
                        }
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {copiedId === `embed-${project.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedId === `embed-${project.id}` ? "복사됨" : "복사"}
                      </button>
                    </div>
                    <code className="text-xs text-indigo-900 font-mono break-all">{`<script src="${window.location.origin}/api/v1/widget" data-project-id="${project.id}"></script>`}</code>
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
          </div>
        ) : (
          /* Settings Tab */
          <div className="space-y-6">
            {/* Webhooks Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">웹훅 설정</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    새 피드백이 등록되면 지정한 URL로 POST 요청을 보냅니다. Slack, Discord, Telegram과 연동할 수 있습니다.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewWebhook(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  웹훅 추가
                </button>
              </div>

              {/* New Webhook Form */}
              {showNewWebhook && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">새 웹훅 추가</h4>
                    <button onClick={() => setShowNewWebhook(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateWebhook} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                      <input
                        type="text"
                        required
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Slack - 개발팀"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                      <input
                        type="url"
                        required
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="https://hooks.slack.com/services/..."
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Slack, Discord, Telegram URL은 자동으로 인식됩니다.
                      </p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowNewWebhook(false)}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={creatingWebhook}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {creatingWebhook ? "추가 중..." : "추가"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Webhooks List */}
              <div className="space-y-3">
                {(webhooks as Webhook[]).map((webhook) => (
                  <div
                    key={webhook.id}
                    className={`p-4 rounded-lg border ${webhook.enabled ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleWebhook(webhook)}
                          disabled={togglingWebhookId === webhook.id}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {webhook.enabled ? (
                            <ToggleRight className="w-6 h-6 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-6 h-6" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${webhook.enabled ? "text-gray-900" : "text-gray-400"}`}>
                              {webhook.name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getWebhookTypeColor(webhook.type)}`}>
                              {getWebhookTypeLabel(webhook.type)}
                            </span>
                          </div>
                          <p className={`text-sm truncate max-w-md ${webhook.enabled ? "text-gray-500" : "text-gray-400"}`}>
                            {webhook.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {webhookTestResult?.id === webhook.id && (
                          <span className={`text-sm ${webhookTestResult.success ? "text-green-600" : "text-red-600"}`}>
                            {webhookTestResult.message}
                          </span>
                        )}
                        <button
                          onClick={() => handleTestWebhook(webhook.id)}
                          disabled={testingWebhookId === webhook.id || !webhook.enabled}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                          title="테스트"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          disabled={deletingWebhookId === webhook.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {webhooks.length === 0 && !showNewWebhook && (
                  <div className="text-center py-8 text-gray-400">
                    <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>등록된 웹훅이 없습니다.</p>
                    <button
                      onClick={() => setShowNewWebhook(true)}
                      className="mt-2 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      첫 웹훅 추가하기
                    </button>
                  </div>
                )}
              </div>

              {/* Plan Info */}
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-700">
                {currentOrg.plan === "FREE" ? (
                  <>무료 플랜은 1개의 웹훅만 사용할 수 있습니다. 더 많은 웹훅이 필요하다면 Pro 플랜으로 업그레이드하세요.</>
                ) : (
                  <>현재 {currentOrg.plan} 플랜을 사용 중입니다.
                    {currentOrg.plan === "PRO" && " 최대 5개의 웹훅을 등록할 수 있습니다."}
                    {currentOrg.plan === "TEAM" && " 최대 10개의 웹훅을 등록할 수 있습니다."}
                    {currentOrg.plan === "ENTERPRISE" && " 최대 50개의 웹훅을 등록할 수 있습니다."}
                  </>
                )}
              </div>
            </div>

            {/* Organization Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">조직 정보</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">조직 ID</span>
                  <code className="text-gray-700 font-mono">{currentOrg.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug</span>
                  <code className="text-gray-700 font-mono">{currentOrg.slug}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">플랜</span>
                  <span className="text-gray-700">{currentOrg.plan}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedFeedback(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedFeedback.type === "BUG" ? "bg-red-100 text-red-600" :
                  selectedFeedback.type === "FEATURE" ? "bg-purple-100 text-purple-600" :
                  "bg-blue-100 text-blue-600"
                }`}>
                  {getTypeIcon(selectedFeedback.type)}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{getTypeLabel(selectedFeedback.type)}</h2>
                  <p className="text-sm text-gray-500">{selectedFeedback.project?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {/* Status */}
              <div className="flex items-center gap-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedFeedback.status === "OPEN"
                      ? "bg-yellow-100 text-yellow-800"
                      : selectedFeedback.status === "IN_PROGRESS"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                  }`}
                >
                  {getStatusLabel(selectedFeedback.status)}
                </span>
                <button
                  onClick={() => {
                    handleUpdateStatus(selectedFeedback.id, selectedFeedback.status);
                    setSelectedFeedback(null);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {selectedFeedback.status === "OPEN" ? "처리 완료로 변경" : "다시 열기"}
                </button>
              </div>

              {/* Message */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">메시지</h3>
                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {selectedFeedback.message}
                </p>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">이메일:</span>
                  <span className="text-gray-900">{selectedFeedback.email || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">등록일:</span>
                  <span className="text-gray-900">
                    {new Date(selectedFeedback.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              {selectedFeedback.metadata && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">메타데이터</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                    {selectedFeedback.metadata.url && (
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="text-gray-500">URL: </span>
                          <a
                            href={selectedFeedback.metadata.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline break-all"
                          >
                            {selectedFeedback.metadata.url}
                            <ExternalLink className="w-3 h-3 inline ml-1" />
                          </a>
                        </div>
                      </div>
                    )}
                    {selectedFeedback.metadata.userAgent && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500">User Agent: </span>
                        <span className="text-gray-700 break-all">
                          {selectedFeedback.metadata.userAgent}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Replies Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-medium text-gray-500">답변 ({replies.length})</h3>
                </div>

                {loadingReplies ? (
                  <div className="text-center py-4 text-gray-400">
                    답변 로딩 중...
                  </div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 bg-gray-50 rounded-lg">
                    아직 답변이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-4 rounded-lg ${
                          reply.isInternal
                            ? "bg-amber-50 border border-amber-100"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                {reply.authorName || "익명"}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                reply.authorType === "ADMIN"
                                  ? "bg-indigo-100 text-indigo-700"
                                  : reply.authorType === "API"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-700"
                              }`}>
                                {getAuthorTypeLabel(reply.authorType)}
                              </span>
                              {reply.isInternal && (
                                <span className="flex items-center gap-1 text-xs text-amber-600">
                                  <Lock className="w-3 h-3" />
                                  내부 메모
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">
                              {reply.content}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(reply.createdAt).toLocaleString("ko-KR")}
                            </p>
                          </div>
                          {reply.authorType === "ADMIN" && (
                            <button
                              onClick={() => handleDeleteReply(reply.id)}
                              disabled={deletingReplyId === reply.id}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Reply Form */}
                <form onSubmit={handleCreateReply} className="mt-4 space-y-3">
                  <textarea
                    value={newReplyContent}
                    onChange={(e) => setNewReplyContent(e.target.value)}
                    placeholder="답변을 입력하세요..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternalReply}
                        onChange={(e) => setIsInternalReply(e.target.checked)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span>내부 메모 (API에 노출되지 않음)</span>
                    </label>
                    <button
                      type="submit"
                      disabled={creatingReply || !newReplyContent.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {creatingReply ? "등록 중..." : "답변 등록"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteProjectModal && projectToDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDeleteProjectModal(false);
            setProjectToDelete(null);
            setDeleteProjectConfirmName("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">프로젝트를 삭제하시겠습니까?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  이 작업은 되돌릴 수 없습니다. 프로젝트와 연결된 모든 피드백 데이터가 영구적으로 삭제됩니다.
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                확인을 위해 프로젝트 이름 <span className="font-semibold text-red-600">{projectToDelete.name}</span>을 입력하세요
              </label>
              <input
                type="text"
                value={deleteProjectConfirmName}
                onChange={(e) => setDeleteProjectConfirmName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={projectToDelete.name}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteProjectModal(false);
                  setProjectToDelete(null);
                  setDeleteProjectConfirmName("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deletingProject || deleteProjectConfirmName !== projectToDelete.name}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingProject ? "삭제 중..." : "영구 삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && projectToEdit && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowEditProjectModal(false);
            setProjectToEdit(null);
            setEditProjectName("");
            setEditProjectOrigins("");
          }}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md lg:max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">프로젝트 수정</h3>
              <button
                onClick={() => {
                  setShowEditProjectModal(false);
                  setProjectToEdit(null);
                  setEditProjectName("");
                  setEditProjectOrigins("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트 이름
                </label>
                <input
                  type="text"
                  value={editProjectName}
                  onChange={(e) => setEditProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  허용 도메인 <span className="text-gray-400 font-normal">(한 줄에 하나씩)</span>
                </label>
                <textarea
                  value={editProjectOrigins}
                  onChange={(e) => setEditProjectOrigins(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={4}
                  placeholder={"https://myapp.com\nhttps://*.myapp.com"}
                />
                <p className="mt-1 text-xs text-gray-500">비워두면 모든 도메인 허용</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditProjectModal(false);
                  setProjectToEdit(null);
                  setEditProjectName("");
                  setEditProjectOrigins("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdateProject}
                disabled={savingProject || !editProjectName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingProject ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
