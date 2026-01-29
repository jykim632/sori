# Sori Web 성능 분석 보고서

> 작성일: 2026-01-29

## 요약

현재 웹 앱(apps/web)의 성능 병목 지점을 분석한 결과입니다. TanStack Start에서 Next.js로 전환 여부와 관계없이 적용 가능한 최적화 방안을 포함합니다.

---

## 심각도 HIGH

### 1. router.invalidate() 남용

**위치:**
- `apps/web/src/routes/$orgId/admin/feedbacks.tsx:234, 396`
- `apps/web/src/routes/$orgId/admin/projects/index.tsx:62, 72, 79`

**문제:**
- 상태 변경(피드백 상태, 프로젝트 생성/삭제) 후 `router.invalidate()` 호출
- 이는 해당 라우트의 **모든 loader를 다시 실행**
- 피드백 상태 변경 시 `getProjects()` + `getFeedbacksFiltered()` 모두 재실행

**해결책: 낙관적 업데이트**
```typescript
// Before
await updateFeedbackStatus({ data: { feedbackId: id, status: newStatus } });
router.invalidate(); // 전체 데이터 리로드

// After
// 1. 즉시 UI 업데이트
setFeedbacks(prev => prev.map(f =>
  f.id === id ? { ...f, status: newStatus } : f
));

// 2. 백그라운드에서 서버 업데이트
await updateFeedbackStatus({ data: { feedbackId: id, status: newStatus } });

// 3. 실패 시에만 롤백
```

---

### 2. Sequential 쿼리 워터폴

**위치:** `apps/web/src/routes/$orgId/admin/feedbacks.tsx:142-171`

**문제:**
```typescript
// projectId가 없을 때 (초기 로드)
const projects = await getProjects({ data: { organizationId: orgId } });
// ↓ projects 완료 후에야 실행
const feedbacksResult = await getFeedbacksFiltered({
  data: { organizationId: orgId, projectId: defaultProjectId, ... },
});
```

네트워크 타임라인:
```
getProjects ----→ complete (200ms)
                  getFeedbacksFiltered ----→ complete (150ms)
                                             Total: 350ms
```

**해결책: 병렬 실행**
```typescript
const [projects, feedbacksResult] = await Promise.all([
  getProjects({ data: { organizationId: orgId } }),
  getFeedbacksFiltered({
    data: { organizationId: orgId, projectId: undefined, ... }
  })
]);

// Total: max(200ms, 150ms) = 200ms
```

---

### 3. 페이지네이션 2중 쿼리

**위치:** `packages/database/src/queries/feedback.ts:437-480`

**현재 코드:**
```typescript
// Query 1: 총 개수
const countSql = `SELECT COUNT(*) as total FROM feedback f WHERE ...`;
const countResult = await queryOne(countSql, params);

// Query 2: 데이터
const dataSql = `SELECT * FROM feedback f WHERE ... LIMIT $n OFFSET $m`;
const data = await query(dataSql, params);
```

**문제:**
- 모든 페이지네이션 요청에 DB 쿼리 2번 실행
- 초당 20 요청 시 → 초당 40 DB 쿼리

**해결책: Window 함수 사용**
```sql
SELECT
  f.*,
  p.name as project_name,
  COUNT(*) OVER() as total_count  -- 전체 카운트를 같이 반환
FROM feedback f
JOIN project p ON f.project_id = p.id
WHERE ...
ORDER BY f.created_at DESC
LIMIT 20 OFFSET 0
```

---

## 심각도 MEDIUM

### 4. N+1 Reply 로딩

**위치:** `apps/web/src/components/admin/FeedbackDetailModal.tsx:36-48`

**문제:**
```typescript
useEffect(() => {
  const loadReplies = async () => {
    const feedbackReplies = await getReplies({ data: { feedbackId: feedback.id } });
    setReplies(feedbackReplies);
  };
  loadReplies();
}, [feedback.id]);
```

- 모달을 열 때마다 별도 네트워크 요청
- 20개 피드백을 차례로 열면 20번 쿼리

**해결책:**
- Option A: 초기 데이터 로드 시 replies 포함 (JOIN)
- Option B: 모달 열기 전 prefetch
- Option C: React Query로 캐싱

---

### 5. Scroll 이벤트 리스너 오버헤드

**위치:** `apps/web/src/components/DateRangePicker.tsx:55-86`

**문제:**
```typescript
useEffect(() => {
  const updatePosition = () => {
    if (isOpen && triggerRef.current) {
      // DOM 측정 + setState
      setDropdownPosition({ top, left });
    }
  };

  window.addEventListener("scroll", updatePosition, true); // capture phase
  // ↑ 모든 스크롤에서 60+회/초 실행
}, [isOpen]);
```

**해결책:**
```typescript
const updatePosition = useCallback(() => {
  if (!isOpen || !triggerRef.current) return;

  requestAnimationFrame(() => {
    // position 계산
    setDropdownPosition({ top, left });
  });
}, [isOpen]);

// throttle 적용
useEffect(() => {
  const throttledUpdate = throttle(updatePosition, 100);
  window.addEventListener("scroll", throttledUpdate, true);
  return () => window.removeEventListener("scroll", throttledUpdate, true);
}, [updatePosition]);
```

---

### 6. 검색 인덱스 누락

**위치:** `packages/database/src/queries/feedback.ts:420`

**문제:**
```typescript
if (search) {
  conditions.push(`(f.message ILIKE $${paramIndex} OR f.email ILIKE $${paramIndex})`);
  params.push(`%${search}%`);
}
```

- `ILIKE` + `%search%` 패턴은 인덱스 사용 불가
- Full Table Scan 발생

**해결책:**
```sql
-- pg_trgm 확장 사용
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN 인덱스 생성
CREATE INDEX idx_feedback_message_trgm ON feedback USING GIN(message gin_trgm_ops);
CREATE INDEX idx_feedback_email ON feedback(email);
```

---

### 7. resend 라이브러리 클라이언트 번들 포함

**위치:** `apps/web/package.json`

**문제:**
- `resend`는 이메일 발송 라이브러리 (서버 전용)
- dependencies에 포함되어 클라이언트 번들에 포함될 수 있음

**해결책:**
```json
{
  "dependencies": {
    // resend 제거
  },
  "devDependencies": {
    "resend": "^6.6.0"  // 또는 서버 함수에서만 dynamic import
  }
}
```

또는 서버 함수에서:
```typescript
// Dynamic import (서버에서만 로드)
const { Resend } = await import('resend');
```

---

## 심각도 LOW

### 8. Route 코드 스플리팅 없음

**문제:**
- 모든 라우트가 초기 번들에 포함
- `/routes/$orgId/admin/projects/$projectId.tsx` (1071줄) 등 큰 파일도 즉시 로드

**해결책 (Next.js 전환 시 자동 적용):**
- Next.js App Router는 자동 코드 스플리팅
- TanStack Router에서는 `lazy()` 사용:
```typescript
const ProjectDetailRoute = lazy(() => import('./projects/$projectId'));
```

---

### 9. Calendar className 계산 오버헤드

**위치:** `apps/web/src/components/Calendar.tsx:191-233`

**문제:**
```typescript
// 42개 날짜 각각에 대해 5개 조건 계산
if (isRangeMode) {
  const startEndClass = rangeStart || rangeEnd ? "..." : "";
  const inRangeClass = inRange && !rangeStart && !rangeEnd ? "..." : "";
  const todayClass = today && !inRange ? "..." : "";
  // ...
}
```

**해결책:**
```typescript
// useMemo로 날짜별 className 캐싱
const dayClassNames = useMemo(() => {
  return days.map(day => computeDayClassName(day, rangeStart, rangeEnd, ...));
}, [days, rangeStart, rangeEnd, ...]);
```

---

### 10. 대형 컴포넌트

| 컴포넌트 | 줄 수 | 문제 |
|---------|------|------|
| FeedbackDetailModal | 371줄 | 8개 useState, 복잡한 로직 |
| DateRangePicker | 306줄 | 7개 useState, 이벤트 리스너 |
| Calendar | 297줄 | 복잡한 날짜 계산 |

**해결책:**
- Custom hook으로 상태 로직 분리
- Container/Presenter 패턴 적용
- 컴포넌트 분할 (ReplyList, ReplyForm 등)

---

## 즉시 적용 가능한 Quick Wins

| 작업 | 예상 효과 | 난이도 |
|------|----------|--------|
| Sequential → Parallel 쿼리 | 로딩 시간 40% 감소 | 낮음 |
| router.invalidate() → 낙관적 업데이트 | 체감 속도 대폭 향상 | 중간 |
| 2중 쿼리 → Window 함수 | DB 부하 50% 감소 | 낮음 |
| resend dynamic import | 번들 크기 감소 | 낮음 |
| DateRangePicker throttle | 스크롤 성능 개선 | 낮음 |

---

## 참고: Next.js 전환 시 자동 해결되는 항목

- Route 코드 스플리팅 (자동)
- 더 나은 캐싱 전략 (fetch cache)
- React Server Components로 클라이언트 번들 감소
- Turbopack으로 빠른 개발 서버

---

## 다음 단계

1. Quick Wins 먼저 적용 (현재 TanStack Start에서)
2. Next.js 전환 진행
3. 전환 후 추가 최적화 (React Query 캐싱, Suspense 스트리밍)
