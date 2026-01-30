import {
  Search,
  X,
  Bug,
  HelpCircle,
  Lightbulb,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { DateRangePicker } from "@/components/DateRangePicker";
import type {
  FeedbackSearchParams,
  FeedbackStatus,
  FeedbackType,
  Project,
  OrderBy,
  Order,
} from "./types";

type Props = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  activeStatus: FeedbackStatus | undefined;
  filterType: FeedbackType | undefined;
  activeProjectFilter: string | undefined;
  filterDateFrom: string | undefined;
  filterDateTo: string | undefined;
  filterOrderBy: OrderBy | undefined;
  filterOrder: Order | undefined;
  projects: Project[];
  totalCount: number;
  isLoading: boolean;
  hasActiveFilters: boolean;
  onFilterChange: (updates: Partial<FeedbackSearchParams>) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
};

export function FeedbackFilterBar({
  searchInput,
  onSearchChange,
  activeStatus,
  filterType,
  activeProjectFilter,
  filterDateFrom,
  filterDateTo,
  filterOrderBy,
  filterOrder,
  projects,
  totalCount,
  isLoading,
  hasActiveFilters,
  onFilterChange,
  onClearFilters,
  onRefresh,
}: Props) {
  return (
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchInput && (
              <button
                onClick={() => onSearchChange("")}
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
            onChange={(start, end) => onFilterChange({ dateFrom: start, dateTo: end })}
            placeholder="기간 선택"
          />

          {/* 상태 필터 */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
            <button
              onClick={() => onFilterChange({ status: undefined })}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                !activeStatus ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => onFilterChange({ status: "OPEN" })}
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
              onClick={() => onFilterChange({ status: "IN_PROGRESS" })}
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
              onClick={() => onFilterChange({ status: "RESOLVED" })}
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
              onClick={() => onFilterChange({ status: "CLOSED" })}
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
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {totalCount}개
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
              onClick={() => onFilterChange({ type: undefined })}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                !filterType
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => onFilterChange({ type: "BUG" })}
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
              onClick={() => onFilterChange({ type: "INQUIRY" })}
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
              onClick={() => onFilterChange({ type: "FEATURE" })}
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
            onChange={(e) => onFilterChange({ project: e.target.value })}
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
              onFilterChange({ orderBy, order });
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
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              필터 초기화
            </button>
          </>
        )}
      </div>
    </div>
  );
}
