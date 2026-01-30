# [P2] 성능 Quick Wins + 코드 중복 제거 분석 (sori-d3p, sori-exo)

## 버그 요약

sori-d3p: DB 이중 쿼리, 전체 라우트 리로드 등 불필요한 성능 오버헤드 존재.
sori-exo: 웹훅/URL/인증 코드 중복 → 조사 결과 이미 해결됨.

## sori-exo: 코드 중복 제거 — 이미 해결됨

탐색 결과 3개 항목 모두 이미 처리된 상태:

| 항목 | 현재 상태 | 근거 |
|------|----------|------|
| 웹훅 테스트 로직 통합 | ✅ 해결됨 | `organization.ts`, `webhook.ts` 모두 `sendTestWebhook()` (lib/webhook/test-webhook.ts) 위임 |
| URL 검증 통합 | ✅ 해결됨 | `validateUrl()` (lib/validators/url.ts) 공용 함수 존재, 양쪽에서 사용 중 |
| reply.ts 인증 캐시 우회 | ✅ 해결됨 | `getCachedSession()`, `getSessionUserId()` 정상 사용 중 |

**결론**: `bd close sori-exo` 처리 가능.

---

## sori-d3p: 성능 Quick Wins — 분석 결과

### 영향 범위

- **사용자 영향**: 피드백 목록 로딩 지연, 상태 변경 시 전체 리로드로 체감 속도 저하
- **데이터 영향**: 없음 (읽기 성능만 해당)
- **보안 영향**: 없음

### 원인 분석

#### 1. DB 이중 쿼리 (packages/database/src/queries/feedback.ts)

**❌ getFeedbacksFiltered()** (L437-491):
```typescript
// Query 1: COUNT
const countSql = `SELECT COUNT(*) as total FROM feedback f JOIN project p ... WHERE ...`;
const countResult = await queryOne(countSql, params);

// Query 2: SELECT
const dataSql = `SELECT f.*, ... FROM feedback f JOIN project p ... WHERE ... LIMIT ... OFFSET ...`;
const data = await query(dataSql, params);
```

동일한 WHERE 조건으로 2번 쿼리 실행. 페이지네이션 요청마다 DB 왕복 2회.

**❌ getFeedbacksWithPagination()** (L144-212): 동일 패턴.

#### 2. router.invalidate() 남용 (feedbacks.tsx:219)

```typescript
const handleUpdateStatus = async (id: string, currentStatus: string) => {
  const newStatus = currentStatus === "OPEN" ? "RESOLVED" : "OPEN";
  await updateFeedbackStatus({ data: { id, status: newStatus } });
  router.invalidate(); // ← 전체 loader 재실행 (projects + feedbacks 모두)
};
```

피드백 상태 1건 변경에 전체 데이터 리로드.

#### 3. Sequential 쿼리 (feedbacks.tsx:127-163)

projectId가 없을 때 projects → feedbacks 순차 로드. 단, Fix 1(Window 함수)만으로 해당 경로의 쿼리가 3→2로 줄어서 충분히 개선됨. 기본값을 "all"로 바꾸는 건 UX 변경이므로 별도 논의 필요.

### 해결 방안

#### Fix 1: Window 함수로 단일 쿼리 통합

- **파일**: `packages/database/src/queries/feedback.ts`
- **위치**: `getFeedbacksFiltered()` L437-491, `getFeedbacksWithPagination()` L144-212
- **변경 내용**:

```sql
-- Before: 2 queries
SELECT COUNT(*) FROM feedback f JOIN project p ... WHERE ...;
SELECT f.*, ... FROM feedback f JOIN project p ... WHERE ... LIMIT ... OFFSET ...;

-- After: 1 query
SELECT f.*, ..., COUNT(*) OVER() as "totalCount"
FROM feedback f JOIN project p ...
WHERE ... ORDER BY ... LIMIT ... OFFSET ...;
```

```typescript
// 결과 처리
const rows = await query<Data & { totalCount: string }>(sql, params);
const total = rows.length > 0 ? parseInt(rows[0].totalCount, 10) : 0;
const data = rows.map(({ totalCount, ...rest }) => rest);
```

#### Fix 2: 낙관적 업데이트 (피드백 상태 변경)

- **파일**: `apps/web/src/routes/$orgSlug/admin/feedbacks.tsx`
- **위치**: `handleUpdateStatus` L216-220, `FeedbacksPage` 컴포넌트
- **변경 내용**:

```typescript
// 로컬 상태로 관리
const [localFeedbacks, setLocalFeedbacks] = useState(feedbacks);
useEffect(() => { setLocalFeedbacks(feedbacks); }, [feedbacks]);

const handleUpdateStatus = useCallback(async (id: string, currentStatus: string) => {
  const newStatus = currentStatus === "OPEN" ? "RESOLVED" : "OPEN";
  // 즉시 UI 업데이트 (낙관적)
  setLocalFeedbacks(prev =>
    prev.map(f => f.id === id ? { ...f, status: newStatus } : f)
  );
  try {
    await updateFeedbackStatus({ data: { id, status: newStatus } });
    // 성공: 백그라운드에서 서버 데이터 동기화 (pagination total, resolvedAt 등)
    router.invalidate();
  } catch {
    // 실패 시 롤백
    setLocalFeedbacks(prev =>
      prev.map(f => f.id === id ? { ...f, status: currentStatus } : f)
    );
  }
}, [router]);
```

**낙관적 업데이트 + `router.invalidate()` 조합 이유:**
- 즉시 UI 반영 → 사용자 체감 속도 향상
- 성공 후 `router.invalidate()` → pagination total, `resolvedAt`, 다른 사용자 변경 등 서버 상태 동기화
- `useEffect`의 `feedbacks` 동기화 → loader 완료 시 `localFeedbacks`가 최신 서버 데이터로 갱신

**`COUNT(*) OVER()` 주의사항:**
- 요청 페이지가 전체 페이지 수를 초과하면 (예: 데이터 삭제 후) rows가 0건이므로 `total=0` 반환
- 이전 동작(별도 COUNT 쿼리)과 다르지만, pagination UI가 `totalPages > 1`일 때만 렌더링하므로 문제없음
- 다음 네비게이션에서 올바른 count가 복원됨

### 수정 순서

1. Fix 1: Window 함수 적용 (feedback.ts) — Low risk
2. Fix 2: 낙관적 업데이트 + 백그라운드 동기화 (feedbacks.tsx) — Medium risk
3. `pnpm build` 검증

### 테스트 케이스

**핵심 수정**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| W-1 | 피드백 20건 이상 | 페이지네이션으로 2페이지 이동 | total 정확, 데이터 20건 |
| W-2 | 피드백 0건 | 페이지 로드 | `{ total: 0, totalPages: 0 }` |
| W-3 | status + type 필터 활성 | 페이지 로드 | 필터링된 total 정확 |
| O-1 | OPEN 피드백 1건 | 상태 토글 | 즉시 RESOLVED로 UI 변경 |
| O-2 | 네트워크 에러 발생 | 상태 토글 | 원래 상태로 롤백 |

**회귀 방지**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| R-1 | projectId=all | 페이지 로드 | 전체 피드백 정상 표시 |
| R-2 | 특정 projectId 선택 | 페이지 로드 | 해당 프로젝트 피드백만 |
| R-3 | 검색어 + 날짜 범위 | 필터 적용 | 정상 필터링 |

**경계값**:

| # | 조건 | 조작 | 기대 결과 |
|---|------|------|----------|
| E-1 | 피드백 정확히 20건 (1페이지) | 페이지 로드 | totalPages: 1 |
| E-2 | 피드백 21건 | 2페이지 이동 | 1건 표시, total: 21 |

### 관련 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/database/src/queries/feedback.ts` | Window 함수로 이중 쿼리 통합 |
| `apps/web/src/routes/$orgSlug/admin/feedbacks.tsx` | 낙관적 업데이트 적용 |
