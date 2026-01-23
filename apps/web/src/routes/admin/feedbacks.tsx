import { createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getFeedbacksFiltered, updateFeedbackStatus } from "@/server/feedback";
import { getProjects } from "@/server/projects";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DataTable } from "@/components/DataTable";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Mail,
  Bug,
  HelpCircle,
  Lightbulb,
  Check,
  RotateCcw,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import {
  type FeedbackSearchParams,
  type FeedbackWithProject,
  type FeedbackStatus,
  type FeedbackType,
  type Pagination,
  type Project,
  validStatuses,
  validTypes,
  validOrderBy,
  validOrder,
  type OrderBy,
  type Order,
  getTypeIcon,
  getTypeLabel,
  getStatusLabel,
  FeedbackDetailModal,
} from "@/components/admin/index";

export const Route = createFileRoute("/admin/feedbacks")({
  component: FeedbacksPage,
  validateSearch: (search: Record<string, unknown>): FeedbackSearchParams & { org?: string } => ({
    org: typeof search.org === "string" ? search.org : undefined,
    status: validStatuses.includes(search.status as FeedbackStatus)
      ? (search.status as FeedbackStatus)
      : undefined,
    type: validTypes.includes(search.type as FeedbackType)
      ? (search.type as FeedbackType)
      : undefined,
    project: typeof search.project === "string" ? search.project : undefined,
    search:
      typeof search.search === "string" && search.search ? search.search : undefined,
    dateFrom:
      typeof search.dateFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.dateFrom)
        ? search.dateFrom
        : undefined,
    dateTo:
      typeof search.dateTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search.dateTo)
        ? search.dateTo
        : undefined,
    orderBy: validOrderBy.includes(search.orderBy as OrderBy)
      ? (search.orderBy as OrderBy)
      : undefined,
    order: validOrder.includes(search.order as Order) ? (search.order as Order) : undefined,
    page: typeof search.page === "number" && search.page > 0 ? search.page : undefined,
  }),
  loaderDeps: ({ search }) => ({
    status: search.status,
    type: search.type,
    projectId: search.project,
    search: search.search,
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    orderBy: search.orderBy,
    order: search.order,
    page: search.page,
  }),
  loader: async ({ context, deps }): Promise<{
    feedbacks: FeedbackWithProject[];
    pagination: Pagination;
    projects: Project[];
    defaultProjectId?: string;
  }> => {
    const ctx = context as { currentOrg: { id: string } };
    const orgId = ctx.currentOrg.id;

    // "all" = 전체 프로젝트 조회 (병렬 로드)
    if (deps.projectId === "all") {
      const [feedbacksResult, projects] = await Promise.all([
        getFeedbacksFiltered({
          data: {
            organizationId: orgId,
            status: deps.status,
            type: deps.type,
            projectId: undefined, // 전체
            search: deps.search,
            dateFrom: deps.dateFrom,
            dateTo: deps.dateTo,
            orderBy: deps.orderBy,
            order: deps.order,
            page: deps.page || 1,
            limit: 20,
          },
        }) as unknown as { data: FeedbackWithProject[]; pagination: Pagination },
        getProjects({ data: { organizationId: orgId } }) as unknown as Project[],
      ]);

      return {
        feedbacks: feedbacksResult.data,
        pagination: feedbacksResult.pagination,
        projects,
      };
    }

    // 특정 projectId가 URL에 있으면 병렬 로드
    if (deps.projectId) {
      const [feedbacksResult, projects] = await Promise.all([
        getFeedbacksFiltered({
          data: {
            organizationId: orgId,
            status: deps.status,
            type: deps.type,
            projectId: deps.projectId,
            search: deps.search,
            dateFrom: deps.dateFrom,
            dateTo: deps.dateTo,
            orderBy: deps.orderBy,
            order: deps.order,
            page: deps.page || 1,
            limit: 20,
          },
        }) as unknown as { data: FeedbackWithProject[]; pagination: Pagination },
        getProjects({ data: { organizationId: orgId } }) as unknown as Project[],
      ]);

      return {
        feedbacks: feedbacksResult.data,
        pagination: feedbacksResult.pagination,
        projects,
      };
    }

    // projectId가 없으면 projects 먼저 로드 → 첫 번째 프로젝트로 feedbacks 조회
    const projects = await getProjects({ data: { organizationId: orgId } }) as unknown as Project[];

    // 프로젝트가 없으면 빈 결과 반환
    if (projects.length === 0) {
      return {
        feedbacks: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        projects: [],
      };
    }

    // 첫 번째 프로젝트를 기본값으로 사용
    const defaultProjectId = projects[0].id;

    const feedbacksResult = await getFeedbacksFiltered({
      data: {
        organizationId: orgId,
        status: deps.status,
        type: deps.type,
        projectId: defaultProjectId,
        search: deps.search,
        dateFrom: deps.dateFrom,
        dateTo: deps.dateTo,
        orderBy: deps.orderBy,
        order: deps.order,
        page: deps.page || 1,
        limit: 20,
      },
    }) as unknown as { data: FeedbackWithProject[]; pagination: Pagination };

    return {
      feedbacks: feedbacksResult.data,
      pagination: feedbacksResult.pagination,
      projects,
      defaultProjectId,
    };
  },
});

type LoaderData = {
  feedbacks: FeedbackWithProject[];
  pagination: Pagination;
  projects: Project[];
  defaultProjectId?: string;
};

function FeedbacksPage() {
  const loaderData = Route.useLoaderData() as LoaderData | undefined;
  const feedbacks = loaderData?.feedbacks ?? [];
  const pagination = loaderData?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 };
  const projects = loaderData?.projects ?? [];
  const defaultProjectId = loaderData?.defaultProjectId;
  const search = Route.useSearch();
  const router = useRouter();
  const routerState = useRouterState({ select: (s) => s.isLoading });
  const isRouterLoading = routerState;

  const {
    org,
    status: filterStatus,
    type: filterType,
    project: filterProject,
    search: filterSearch,
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
    orderBy: filterOrderBy,
    order: filterOrder,
    page: currentPage,
  } = search;

  // URL에 project가 없으면 defaultProjectId 사용 (UI 표시용)
  const activeProjectFilter = filterProject ?? defaultProjectId;

  const [searchInput, setSearchInput] = useState(filterSearch || "");
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [pendingStatus, setPendingStatus] = useState<FeedbackStatus | undefined | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackWithProject | null>(null);

  useEffect(() => {
    setSearchInput(filterSearch || "");
  }, [filterSearch]);

  useEffect(() => {
    if (!isRouterLoading) {
      setPendingStatus(null);
    }
  }, [isRouterLoading, filterStatus]);

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "OPEN" ? "RESOLVED" : "OPEN";
    await updateFeedbackStatus({ data: { id, status: newStatus } });
    router.invalidate();
  };

  const handleFilterChange = (updates: Partial<FeedbackSearchParams>) => {
    const hasStatusChange = "status" in updates;
    const hasTypeChange = "type" in updates;
    const hasProjectChange = "project" in updates;
    const hasSearchChange = "search" in updates;
    const hasDateFromChange = "dateFrom" in updates;
    const hasDateToChange = "dateTo" in updates;
    const hasOrderByChange = "orderBy" in updates;
    const hasOrderChange = "order" in updates;
    const hasPageChange = "page" in updates;

    const isFilterChange =
      hasStatusChange ||
      hasTypeChange ||
      hasProjectChange ||
      hasSearchChange ||
      hasDateFromChange ||
      hasDateToChange;

    if (hasStatusChange) {
      setPendingStatus(updates.status);
    }

    router.navigate({
      to: "/admin/feedbacks",
      search: {
        org,
        status: hasStatusChange ? updates.status : filterStatus,
        type: hasTypeChange ? updates.type : filterType,
        project: hasProjectChange ? updates.project : filterProject,
        search: hasSearchChange ? updates.search : filterSearch,
        dateFrom: hasDateFromChange ? updates.dateFrom : filterDateFrom,
        dateTo: hasDateToChange ? updates.dateTo : filterDateTo,
        orderBy: hasOrderByChange ? updates.orderBy : filterOrderBy,
        order: hasOrderChange ? updates.order : filterOrder,
        page: hasPageChange ? updates.page : isFilterChange ? undefined : currentPage,
      },
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleFilterChange({ search: value || undefined });
    }, 300);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    router.navigate({
      to: "/admin/feedbacks",
      search: { org },
    });
  };

  const hasActiveFilters =
    filterStatus || filterType || filterProject || filterSearch || filterDateFrom || filterDateTo;

  const activeStatus = pendingStatus !== null ? pendingStatus : filterStatus;

  return (
    <div className="space-y-4">
      {/* 검색 + 필터 바 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 검색 바 */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="메시지, 이메일로 검색..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchInput && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* 날짜 범위 필터 */}
            <DateRangePicker
              startDate={filterDateFrom}
              endDate={filterDateTo}
              onChange={(start, end) => handleFilterChange({ dateFrom: start, dateTo: end })}
              placeholder="기간 선택"
            />

            {/* 상태 필터 */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => handleFilterChange({ status: undefined })}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  !activeStatus ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => handleFilterChange({ status: "OPEN" })}
                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 border-l border-gray-200 ${
                  activeStatus === "OPEN"
                    ? "bg-yellow-50 text-yellow-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                대기중
              </button>
              <button
                onClick={() => handleFilterChange({ status: "IN_PROGRESS" })}
                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 border-l border-gray-200 ${
                  activeStatus === "IN_PROGRESS"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                처리중
              </button>
              <button
                onClick={() => handleFilterChange({ status: "RESOLVED" })}
                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 border-l border-gray-200 ${
                  activeStatus === "RESOLVED"
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-400" />
                완료
              </button>
              <button
                onClick={() => handleFilterChange({ status: "CLOSED" })}
                className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 border-l border-gray-200 ${
                  activeStatus === "CLOSED"
                    ? "bg-gray-100 text-gray-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                닫힘
              </button>
            </div>

            {/* 새로고침 + 결과 수 */}
            <div className="ml-auto text-sm text-gray-400 flex items-center gap-2">
              <button
                onClick={() => router.invalidate()}
                disabled={isRouterLoading}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${isRouterLoading ? "animate-spin" : ""}`} />
              </button>
              {pagination.total}개
            </div>
          </div>
        </div>

        {/* 추가 필터 */}
        <div className="px-4 py-3 flex items-center gap-3 bg-gray-50/50">
          {/* 유형 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">유형</span>
            <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => handleFilterChange({ type: undefined })}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  !filterType
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => handleFilterChange({ type: "BUG" })}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 border-l border-gray-200 ${
                  filterType === "BUG"
                    ? "bg-red-50 text-red-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Bug className="w-3 h-3" />
                버그
              </button>
              <button
                onClick={() => handleFilterChange({ type: "INQUIRY" })}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 border-l border-gray-200 ${
                  filterType === "INQUIRY"
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <HelpCircle className="w-3 h-3" />
                문의
              </button>
              <button
                onClick={() => handleFilterChange({ type: "FEATURE" })}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 border-l border-gray-200 ${
                  filterType === "FEATURE"
                    ? "bg-purple-50 text-purple-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Lightbulb className="w-3 h-3" />
                기능요청
              </button>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* 프로젝트 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">프로젝트</span>
            <select
              value={activeProjectFilter || ""}
              onChange={(e) => handleFilterChange({ project: e.target.value })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors appearance-none pr-8 bg-no-repeat bg-[length:16px] bg-[center_right_8px] ${
                activeProjectFilter && activeProjectFilter !== "all"
                  ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              }}
            >
              <option value="all">전체</option>
              {(projects as Project[]).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-gray-200" />

          {/* 정렬 */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={`${filterOrderBy || "createdAt"}-${filterOrder || "desc"}`}
              onChange={(e) => {
                const [orderBy, order] = e.target.value.split("-") as [OrderBy, Order];
                handleFilterChange({ orderBy, order });
              }}
              className="px-2 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-gray-300 transition-colors appearance-none pr-7 bg-no-repeat bg-[length:14px] bg-[center_right_6px]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              }}
            >
              <option value="createdAt-desc">최신순</option>
              <option value="createdAt-asc">오래된순</option>
              <option value="priority-desc">우선순위 높은순</option>
              <option value="priority-asc">우선순위 낮은순</option>
            </select>
          </div>

          {/* 필터 초기화 */}
          {hasActiveFilters && (
            <>
              <div className="h-6 w-px bg-gray-200" />
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                필터 초기화
              </button>
            </>
          )}
        </div>
      </div>

      {/* 피드백 테이블 */}
      <DataTable<FeedbackWithProject>
        columns={[
          {
            key: "status",
            header: "상태",
            render: (feedback) => (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  feedback.status === "OPEN"
                    ? "bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20"
                    : feedback.status === "IN_PROGRESS"
                      ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20"
                      : feedback.status === "RESOLVED"
                        ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                        : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/20"
                }`}
              >
                {getStatusLabel(feedback.status)}
              </span>
            ),
          },
          {
            key: "type",
            header: "유형",
            render: (feedback) => (
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                  feedback.type === "BUG"
                    ? "text-red-600"
                    : feedback.type === "FEATURE"
                      ? "text-purple-600"
                      : "text-blue-600"
                }`}
              >
                {getTypeIcon(feedback.type)}
                <span className="hidden sm:inline">{getTypeLabel(feedback.type)}</span>
              </span>
            ),
          },
          {
            key: "message",
            header: "내용",
            cellClassName: "max-w-md",
            render: (feedback) => (
              <div>
                <p
                  className="text-sm text-gray-900 font-medium line-clamp-2"
                  title={feedback.message}
                >
                  {feedback.message}
                </p>
                {feedback.email && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {feedback.email}
                  </p>
                )}
              </div>
            ),
          },
          {
            key: "project",
            header: "프로젝트",
            render: (feedback) => (
              <span className="text-sm text-gray-500">{feedback.project?.name}</span>
            ),
          },
          {
            key: "date",
            header: "날짜",
            render: (feedback) => {
              const date = new Date(feedback.createdAt);
              return (
                <div className="text-sm text-gray-400">
                  <div>{date.toLocaleDateString("ko-KR")}</div>
                  <div className="text-xs">{date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              );
            },
          },
          {
            key: "actions",
            header: "작업",
            headerClassName: "text-right",
            cellClassName: "text-right",
            render: (feedback) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateStatus(feedback.id, feedback.status);
                }}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                  feedback.status === "OPEN"
                    ? "text-green-600 hover:bg-green-50"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                }`}
                title={feedback.status === "OPEN" ? "완료 처리" : "다시 열기"}
              >
                {feedback.status === "OPEN" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </button>
            ),
          },
        ]}
        data={feedbacks}
        keyExtractor={(feedback) => feedback.id}
        onRowClick={setSelectedFeedback}
        emptyMessage={
          hasActiveFilters ? "필터 조건에 맞는 피드백이 없습니다." : "피드백이 없습니다."
        }
        loading={isRouterLoading}
      />

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3">
          <div className="text-sm text-gray-500">
            {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFilterChange({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handleFilterChange({ page: pageNum })}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      pagination.page === pageNum
                        ? "bg-indigo-600 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => handleFilterChange({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 피드백 상세 모달 */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          onClose={() => setSelectedFeedback(null)}
          onStatusChange={handleUpdateStatus}
        />
      )}
    </div>
  );
}
