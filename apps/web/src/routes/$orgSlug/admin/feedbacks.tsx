import { createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getFeedbacksFiltered, updateFeedbackStatus } from "@/server/feedback";
import { getProjects } from "@/server/projects";
import { DataTable } from "@/components/DataTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  FeedbackDetailModal,
  FeedbackFilterBar,
  createFeedbackColumns,
} from "@/components/admin/index";

export const Route = createFileRoute("/$orgSlug/admin/feedbacks")({
  component: FeedbacksPage,
  validateSearch: (search: Record<string, unknown>): FeedbackSearchParams => ({
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
  const { orgSlug } = Route.useParams();
  const router = useRouter();
  const routerState = useRouterState({ select: (s) => s.isLoading });
  const isRouterLoading = routerState;

  const {
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
      to: "/$orgSlug/admin/feedbacks",
      params: { orgSlug },
      search: {
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
      to: "/$orgSlug/admin/feedbacks",
      params: { orgSlug },
      search: {},
    });
  };

  const hasActiveFilters =
    filterStatus || filterType || filterProject || filterSearch || filterDateFrom || filterDateTo;

  const activeStatus = pendingStatus !== null ? pendingStatus : filterStatus;

  return (
    <div className="space-y-4">
      {/* 검색 + 필터 바 */}
      <FeedbackFilterBar
        searchInput={searchInput}
        onSearchChange={handleSearchChange}
        activeStatus={activeStatus}
        filterType={filterType}
        activeProjectFilter={activeProjectFilter}
        filterDateFrom={filterDateFrom}
        filterDateTo={filterDateTo}
        filterOrderBy={filterOrderBy}
        filterOrder={filterOrder}
        projects={projects}
        totalCount={pagination.total}
        isLoading={isRouterLoading}
        hasActiveFilters={!!hasActiveFilters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        onRefresh={() => router.invalidate()}
      />

      {/* 피드백 테이블 */}
      <DataTable<FeedbackWithProject>
        columns={createFeedbackColumns(handleUpdateStatus)}
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
