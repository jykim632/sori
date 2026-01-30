# sori-ot3: 대형 파일 분리 (컴포넌트/API)

브랜치: `refactor/split-large-files`
순수 리팩토링 — 동작 변경 없음.

---

## Step 1: `feedback.ts` API 분리 (388 → ~100줄)

### 새 파일

**`lib/api-utils/cors.ts`** (~45줄)
- `isOriginAllowed()`, `getCorsHeaders()`, `DEFAULT_CORS_HEADERS` 이동
- `lib/api-utils/index.ts` barrel에 re-export 추가

**`lib/webhook/sender.ts`** (~75줄)
- `ALLOWED_WEBHOOK_HOSTS`, `BLOCKED_HOST_PATTERNS`, `isWebhookUrlAllowed()`, `sendWebhook()` 이동
- 기존 `lib/webhook/formatters`와는 별개 (레거시 포맷 로직) — 그대로 이동
- `lib/webhook/index.ts` barrel에 re-export 추가

### 결과 `feedback.ts`
- in-memory rate limiter (자체 cleanup 로직이므로 `createRateLimiter`와 병합하지 않음)
- Route handler (POST + OPTIONS)
- import만 변경

---

## Step 2: `FeedbackDetailModal.tsx` 분리 (371 → ~210줄)

### 새 파일

**`components/admin/feedback-replies-section.tsx`** (~160줄)

```ts
interface FeedbackRepliesSectionProps {
  feedbackId: string;
  feedbackEmail: string | null;
}
```

- replies 상태 + useEffect(loadReplies) + handleCreateReply + handleDeleteReply + 전체 답글 JSX 이동
- 내부 구현 파일이므로 admin barrel에 export 불필요

### 결과 `FeedbackDetailModal.tsx`
- Props 타입/외부 API 변경 없음
- 답글 영역을 `<FeedbackRepliesSection feedbackId={...} feedbackEmail={...} />` 로 교체

---

## Step 3: `feedbacks.tsx` 분리 (707 → ~270줄)

### 새 파일

**`components/admin/feedback-filter-bar.tsx`** (~220줄)

```ts
interface FeedbackFilterBarProps {
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
}
```

- 검색바 + 상태/유형/프로젝트/날짜/정렬 필터 + 초기화 버튼 JSX 이동

**`components/admin/feedback-table-columns.tsx`** (~120줄)

```ts
export function createFeedbackColumns(
  onUpdateStatus: (id: string, currentStatus: string) => void,
): Column<FeedbackWithProject>[]
```

- DataTable 6개 컬럼 정의를 factory 함수로 추출

`components/admin/index.ts` barrel 업데이트.

### 결과 `feedbacks.tsx`
- Route 정의(validateSearch, loaderDeps, loader) + 상태 관리 + 핸들러 유지
- 페이지네이션은 인라인 유지 (53줄, 단일 사용처)

---

## Step 4: `$projectId.tsx` 분리 (1071 → ~180줄)

### 새 폴더: `components/projects/project-settings/`

| 파일 | 줄 수 | 내용 |
|---|---|---|
| `types.ts` | ~80 | ThemePreset, SizeToken, ThemeStyles, WidgetConfig, THEME_PRESETS, ProjectType |
| `widget-preview.tsx` | ~175 | WidgetPreview 컴포넌트 (그대로 이동) |
| `api-key-section.tsx` | ~200 | API 키 CRUD (자체 상태 소유) |
| `basic-info-section.tsx` | ~100 | 프로젝트명 + 허용 도메인 (자체 상태 소유) |
| `theme-settings-section.tsx` | ~310 | 테마 프리셋 + 기본/고급 설정 (부모에서 config/callbacks 수신) |
| `danger-zone-section.tsx` | ~80 | 삭제 버튼 + 확인 모달 (자체 상태, onDeleteSuccess 콜백) |
| `index.ts` | barrel | 모든 컴포넌트 + 타입 re-export |

### 상태 소유 설계

- **부모(`$projectId.tsx`) 소유**: `config`, `saving`, `saved`, theme 핸들러들 → Save/Reset 버튼 때문
- **자식 자체 소유**: API Key 상태, Basic Info 상태, Delete 상태, `showAdvanced` → 부모와 통신 불필요

### 결과 `$projectId.tsx`
- Route 정의 + 테마 config 상태 + Save/Reset + 헤더 + 컴포넌트 조합 레이아웃

---

## 실행 순서 & 커밋

| 순서 | 대상 | 새 파일 수 | 커밋 메시지 |
|---|---|---|---|
| 1 | feedback.ts API | 2 + barrel 2 | `refactor: feedback API에서 CORS/webhook 모듈 분리` |
| 2 | FeedbackDetailModal | 1 | `refactor: FeedbackDetailModal에서 답글 섹션 분리` |
| 3 | feedbacks.tsx | 2 + barrel 1 | `refactor: feedbacks 페이지에서 필터바/테이블 컬럼 분리` |
| 4 | $projectId.tsx | 7 (6+barrel) | `refactor: $projectId 페이지를 설정 섹션별 컴포넌트로 분리` |

## 검증

- 각 Step 후 `pnpm build` 성공 확인
- 최종: `grep -rn` 로 깨진 import 없는지 확인
- bd close sori-ot3 → bd sync → git push
