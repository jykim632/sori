# 백엔드 코드 리뷰: Sori 프로젝트

**리뷰 일자**: 2026-01-10
**리뷰어**: Claude (시니어 백엔드 개발자 관점)
**종합 점수**: 8/10

---

## 잘한 점

### 1. 타입 안전성
- Zod 스키마 + TypeScript 조합이 훌륭함
- `z.infer<>`로 런타임 검증과 타입 추론 통합

### 2. 보안 설계
- SQL 인젝션 방지 (파라미터화 쿼리 일관 적용)
- SSRF 방지 (Webhook URL 화이트리스트)
- 정보 유출 방지 (404 통일, Zod 에러 숨김, isInternal 필터링)
- 다층 방어 (인증 → Rate limit → 검증 → CORS)

### 3. 계층 분리
```
packages/database (쿼리/스키마) → apps/web/server (비즈니스 로직) → routes/api (엔드포인트)
```
- 각 레이어 책임이 명확함

### 4. 에러 처리
- `AppError` + 에러 코드 체계가 일관됨 (`AUTH_xxx`, `VAL_xxx`, `RES_xxx`)

---

## 심각한 문제

### 1. 테스트 코드 없음
```bash
# 테스트 파일이 없음
find . -name "*.test.ts" -o -name "*.spec.ts"  # 결과 없음
```
- 프로덕션에서 이건 용납 안 됨
- 최소한 핵심 쿼리 함수, 권한 로직, API 엔드포인트 테스트 필요

### 2. Rate Limiting이 메모리 기반
```typescript
const rateLimitMap = new Map<string, ...>();  // ← 서버 재시작시 초기화
```
- 서버 스케일아웃하면 Rate limit 무력화
- Redis로 교체해야 함

### 3. 권한 확인 시 매번 DB 쿼리
```typescript
// 매 API 호출마다 실행
await requireOrgMembership(orgId);  // → SELECT ... FROM organization_members
await requireProjectAccess(projectId);  // → 또 SELECT
```
- 세션 캐싱은 있지만 권한 캐싱이 없음
- JWT 클레임에 role/orgIds 넣거나, 요청 단위 캐싱 필요

### 4. 로깅 시스템 부재
```typescript
console.error("Webhook send failed:", error);  // ← 이게 전부
```
- 구조화된 로깅 없음 (request ID, user ID, 타임스탬프)
- 장애 발생 시 추적 불가능
- pino나 winston 도입 필요

---

## 개선 필요

### 1. ID 생성 함수가 취약함
```typescript
// packages/database/src/client.ts
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${randomPart}`;
}
```
- `Math.random()`은 암호학적으로 안전하지 않음
- `@paralleldrive/cuid2` 또는 `nanoid` 사용 권장

### 2. Webhook이 fire-and-forget
```typescript
// 실패해도 재시도 없음
sendWebhookToUrl(url, payload).catch(console.error);
```
- 재시도 로직 없음, 데드레터 큐 없음
- Slack 알림 누락되면 사용자가 모름

### 3. 쿼리 파일이 너무 큼
- `feedback.ts`가 456줄 - 분리 필요
- 복잡한 SQL은 주석이 더 필요함

### 4. 환경 변수 검증 없음
```typescript
// 런타임에 DATABASE_URL 없으면 크래시
new Pool({ connectionString: process.env.DATABASE_URL });
```
- 앱 시작 시 필수 환경 변수 검증하는 로직 필요

---

## 보안 체크리스트

| 항목 | 상태 |
|------|------|
| SQL 인젝션 | ✅ 안전 |
| XSS | ✅ React 자동 이스케이프 |
| CSRF | ⚠️ 확인 필요 |
| Rate Limiting | ⚠️ 메모리 기반 |
| SSRF | ✅ 방지됨 |
| 인증 우회 | ✅ 안전 |
| 정보 유출 | ✅ 방지됨 |
| HTTPS 강제 | ⚠️ 인프라 레벨 확인 필요 |

---

## 다음 단계 권장사항

### 1. 당장 해야 할 것
- 테스트 코드 작성 (vitest 추천)
- 구조화된 로깅 도입
- ID 생성 함수 교체

### 2. 스케일업 전에
- Redis 기반 Rate limiting
- 권한 캐싱 전략
- Webhook 재시도 로직

### 3. 나중에
- 쿼리 빌더 도입 (raw SQL 복잡도 관리)
- OpenTelemetry 트레이싱
- DB 커넥션 풀 모니터링

---

## 총평

전체적으로 혼자 또는 소규모 팀이 만든 것 치고는 구조가 괜찮습니다. 보안 의식도 있고요. 하지만 **테스트 없이 프로덕션 운영은 시한폭탄**입니다.

### 아키텍처 강점
- 명확한 계층 분리 (DB → 쿼리 → 인증 → API)
- 타입 안전성과 런타임 검증 완벽 통합
- 보안을 우선시한 다층 방어
- 비즈니스 로직이 명확히 구현됨

### 아키텍처 약점
- 테스트 코드 부재
- 로깅 미흡 (console.log만 사용)
- 분산 환경 대비 미흡 (메모리 기반 rate limit)
- 데이터베이스 오류 처리 일반적
