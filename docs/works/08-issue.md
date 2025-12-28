# Issue #8: 피드백 검색 및 필터링

> **상태: 완료** (2024-12-28)
>
> GitHub Issue: https://github.com/jykim632/sori/issues/8

---

## 개요

어드민 대시보드에서 피드백 목록을 검색하고 필터링할 수 있는 기능 추가.

## 구현 범위

- [x] 키워드 검색 (메시지 내용, 이메일) - debounce 300ms
- [x] 상태별 필터 (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- [x] 타입별 필터 (BUG, INQUIRY, FEATURE)
- [x] 프로젝트별 필터
- [x] 날짜 범위 필터 (시작일 ~ 종료일)
- [x] 정렬 옵션 (최신순, 오래된순, 우선순위순)
- [x] 페이지네이션

---

## 구현 내용

### 1. DatePicker 컴포넌트 (PR #23)

공통 컴포넌트로 분리하여 재사용 가능하도록 구현.

**파일 구조:**
```
apps/web/src/components/
├── Calendar.tsx        # 공유 달력 컴포넌트
├── DatePicker.tsx      # 단일 날짜 선택
└── DateRangePicker.tsx # 날짜 범위 선택
```

**주요 기능:**
- Portal 렌더링: `overflow: hidden` 부모에서도 정상 표시
- 반응형 위치 조정: 브라우저 크기에 따라 드롭다운 위치 자동 조정
- 빠른 선택: 최근 7일/30일/90일 버튼
- Optimistic UI: 내부 상태로 선택 관리 후 완료 버튼으로 확정
- SSR 호환: `isMounted` 패턴으로 hydration 이슈 방지

### 2. 검색/필터 기능 (PR #24)

**서버 함수:**
- `getFeedbacksFiltered`: 필터 파라미터를 받아 동적 WHERE 조건 생성
- Prisma 쿼리로 검색, 필터, 정렬, 페이지네이션 처리

**URL 상태 관리:**
- TanStack Router의 search params로 필터 상태 유지
- 페이지 새로고침/공유 시에도 필터 상태 보존

**검색 디바운스:**
```typescript
const searchTimeoutRef = useRef<NodeJS.Timeout>();
searchTimeoutRef.current = setTimeout(() => {
  handleFilterChange({ search: value || undefined });
}, 300);
```

### 3. 로딩 상태 처리

**문제:**
- 필터 변경 시 서버 요청으로 인한 지연
- UI가 느리게 반응하는 것처럼 보임

**해결:**
```typescript
// TanStack Router의 로딩 상태 감지
const isRouterLoading = useRouterState({ select: (s) => s.isLoading });

// Optimistic UI - 버튼 클릭 즉시 상태 반영
const [pendingStatus, setPendingStatus] = useState<FeedbackStatus | undefined | null>(null);
```

**시각적 피드백:**
- 필터 버튼: 클릭 즉시 선택 상태 반영 (Optimistic)
- 결과 수 옆: 스피너 표시
- 테이블: `opacity-60`으로 로딩 중 표시

### 4. UI 레이아웃

**검색 바 구조:**
```
[검색 input] [기간 선택] [상태 필터 버튼] [로딩 스피너] [결과 수]
```

**추가 필터:**
```
[유형 필터] | [프로젝트 드롭다운] | [정렬 드롭다운] | [필터 초기화]
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `apps/web/src/routes/admin.tsx` | 어드민 대시보드 UI |
| `apps/web/src/server/feedback.ts` | 피드백 서버 함수 |
| `apps/web/src/components/Calendar.tsx` | 공유 달력 컴포넌트 |
| `apps/web/src/components/DatePicker.tsx` | 단일 날짜 선택 |
| `apps/web/src/components/DateRangePicker.tsx` | 날짜 범위 선택 |
| `packages/database/src/queries/feedback.ts` | 필터 쿼리 함수 |

---

## PR 목록

- PR #23: DatePicker 컴포넌트 추가
- PR #24: 피드백 검색 및 필터 기능 (Closes #8)
