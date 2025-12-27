# Sori 로드맵

> 마지막 업데이트: 2025-12-27

## 현재 완료된 기능

- ✅ 사용자 인증 (회원가입, 로그인, 이메일 인증)
- ✅ 멀티테넌트 조직 관리
- ✅ 프로젝트 CRUD
- ✅ 위젯 코어 (바닐라 JS, 3.2KB)
- ✅ 피드백 수집 API
- ✅ 웹훅 연동 (Slack/Discord/Telegram/Custom)
- ✅ 어드민 대시보드 기본 UI
- ✅ 피드백 답글 시스템

---

## 🔴 우선순위 높음

### 1. 피드백 검색 및 필터링

**개요**

현재 어드민 대시보드에서 피드백 목록을 조회할 수 있지만, 검색이나 필터링 기능이 없어 피드백이 많아지면 원하는 항목을 찾기 어렵습니다. 상태, 타입, 프로젝트, 날짜 범위 등 다양한 조건으로 필터링하고 키워드 검색이 가능해야 합니다.

**구현 범위**

- 키워드 검색 (메시지 내용, 이메일)
- 상태별 필터 (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- 타입별 필터 (BUG, INQUIRY, FEATURE)
- 프로젝트별 필터
- 날짜 범위 필터 (시작일 ~ 종료일)
- 정렬 옵션 (최신순, 오래된순, 우선순위순)
- 페이지네이션

**관련 파일**

- `apps/web/src/routes/admin.tsx` - 어드민 대시보드 UI
- `apps/web/src/server/feedback.ts` - 피드백 서버 함수
- `packages/database/src/index.ts` - 데이터베이스 쿼리

**작업 내용**

1. 검색/필터 UI 컴포넌트 추가
2. `getFeedbacks` 서버 함수에 필터 파라미터 추가
3. SQL 쿼리에 WHERE 조건 동적 생성
4. URL 쿼리 파라미터로 필터 상태 유지
5. 디바운스된 검색 입력 처리

---

### 2. 피드백 통계 대시보드

**개요**

피드백 데이터를 시각화하여 트렌드를 파악하고 인사이트를 얻을 수 있는 통계 대시보드가 필요합니다. 일별/주별 피드백 추이, 타입별 분포, 평균 응답 시간 등을 차트로 표시합니다.

**구현 범위**

- 요약 카드 (총 피드백 수, 미해결 건수, 금주 신규 등)
- 일별/주별/월별 피드백 추이 라인 차트
- 타입별 분포 파이/도넛 차트
- 상태별 분포 바 차트
- 프로젝트별 피드백 비교
- 평균 해결 시간 (resolvedAt - createdAt)
- 기간 선택 (최근 7일, 30일, 90일, 커스텀)

**관련 파일**

- `apps/web/src/routes/admin.tsx` - 새 탭 추가
- `apps/web/src/server/feedback.ts` - 통계 쿼리 함수 추가
- 새 파일: `apps/web/src/components/charts/` - 차트 컴포넌트

**작업 내용**

1. 차트 라이브러리 선택 및 설치 (recharts 또는 chart.js)
2. 통계 데이터 집계 SQL 쿼리 작성
3. `getStatistics` 서버 함수 구현
4. 대시보드 Overview 탭 UI 구현
5. 반응형 차트 레이아웃

---

### 3. 팀 멤버 초대

**개요**

현재 조직(Organization)에 멤버를 추가하는 UI가 없습니다. 이메일로 팀 멤버를 초대하고, 역할(OWNER/ADMIN/MEMBER)을 부여할 수 있어야 합니다.

**구현 범위**

- 멤버 목록 조회 UI
- 이메일로 초대 발송
- 초대 수락/거절 페이지
- 멤버 역할 변경
- 멤버 제거
- 역할별 권한 구분

**관련 파일**

- `apps/web/src/routes/admin.tsx` - Settings 탭 확장
- `apps/web/src/server/organization.ts` - 멤버 관리 함수
- `packages/database/prisma/schema.prisma` - Invitation 테이블 추가 필요
- 새 파일: `apps/web/src/routes/invite.tsx` - 초대 수락 페이지

**작업 내용**

1. `Invitation` 테이블 스키마 설계 (token, email, role, expiresAt)
2. 초대 생성 및 이메일 발송 (Resend 활용)
3. 초대 수락 플로우 구현
4. 멤버 목록 UI 및 역할 관리
5. 역할별 권한 체크 미들웨어

**데이터 모델 (추가)**

```prisma
model Invitation {
  id             String   @id @default(cuid())
  email          String
  role           MemberRole @default(MEMBER)
  token          String   @unique
  expiresAt      DateTime
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  invitedById    String
  invitedBy      User     @relation(fields: [invitedById], references: [id])
  createdAt      DateTime @default(now())
}
```

---

### 4. 이메일 알림

**개요**

새 피드백이 접수되면 관리자에게 이메일로 알림을 보내는 기능입니다. Resend가 이미 설치되어 있으므로 이를 활용합니다.

**구현 범위**

- 새 피드백 접수 시 이메일 알림
- 알림 설정 (ON/OFF, 수신 이메일 목록)
- 피드백 타입별 알림 필터
- 이메일 템플릿 (HTML)
- 일일 다이제스트 옵션

**관련 파일**

- `apps/web/src/routes/api/v1/feedback.ts` - 피드백 생성 후 알림 발송
- `apps/web/src/server/organization.ts` - 알림 설정 관리
- `packages/database/prisma/schema.prisma` - NotificationSetting 테이블
- 새 파일: `apps/web/src/lib/email.ts` - 이메일 발송 유틸

**작업 내용**

1. Resend 클라이언트 설정
2. 이메일 템플릿 작성 (React Email 또는 HTML)
3. 알림 설정 테이블 및 UI
4. 피드백 생성 시 비동기 이메일 발송
5. 발송 실패 시 재시도 로직

**이메일 템플릿 예시**

```
제목: [Sori] 새로운 버그 리포트가 접수되었습니다

안녕하세요,

{프로젝트명}에서 새로운 피드백이 접수되었습니다.

- 타입: 버그 리포트
- 메시지: {메시지 내용 미리보기...}
- 제출자: {이메일 또는 익명}
- 시간: {접수 시간}

[대시보드에서 확인하기]
```

---

## 🟡 우선순위 중간

### 5. 위젯 설정 UI (라이브 프리뷰)

**개요**

어드민 대시보드에서 위젯의 모양을 실시간으로 커스터마이징하고 미리볼 수 있는 UI입니다. 현재 `widgetConfig` 필드가 있지만 이를 수정하는 UI가 없습니다.

**구현 범위**

- 위젯 라이브 프리뷰
- 색상 커스터마이징 (primaryColor, backgroundColor 등)
- 위치 선택 (bottom-right, bottom-left, top-right, top-left)
- 테마 프리셋 선택 (default, minimal, rounded)
- 인사말 메시지 편집
- 피드백 타입 ON/OFF
- 언어 설정
- 설치 코드 스니펫 복사

**관련 파일**

- `apps/web/src/routes/admin/projects.$projectId.tsx` - 위젯 설정 페이지
- `apps/web/src/server/projects.ts` - widgetConfig 업데이트
- `packages/core/src/` - 위젯 설정 옵션 참조

**작업 내용**

1. 컬러 피커 컴포넌트 추가
2. 위젯 프리뷰 iframe 또는 Shadow DOM 렌더링
3. 설정 변경 시 실시간 프리뷰 업데이트
4. widgetConfig JSON 저장
5. 설치 코드 생성기

---

### 6. 피드백 내보내기 (Export)

**개요**

피드백 데이터를 CSV 또는 Excel 파일로 다운로드하는 기능입니다. 외부 도구에서 분석하거나 백업 용도로 사용합니다.

**구현 범위**

- CSV 내보내기
- Excel (.xlsx) 내보내기
- 필터 적용된 결과만 내보내기
- 컬럼 선택 옵션
- 날짜 범위 지정
- 첨부 메타데이터 포함 여부

**관련 파일**

- `apps/web/src/routes/admin.tsx` - 내보내기 버튼
- 새 파일: `apps/web/src/routes/api/export.ts` - 내보내기 API
- 새 파일: `apps/web/src/lib/export.ts` - CSV/Excel 생성 유틸

**작업 내용**

1. CSV 생성 유틸 함수
2. Excel 생성 (xlsx 라이브러리)
3. 내보내기 API 엔드포인트
4. 다운로드 트리거 UI
5. 대용량 데이터 스트리밍 처리

---

### 7. Public API (외부 연동)

**개요**

외부 시스템에서 Sori의 피드백 데이터를 조회하고 관리할 수 있는 REST API입니다. 프로젝트별 API 키를 사용하여 인증합니다.

**구현 범위**

- 피드백 목록 조회 (GET /api/v1/feedbacks)
- 피드백 상세 조회 (GET /api/v1/feedbacks/:id)
- 피드백 상태 변경 (PATCH /api/v1/feedbacks/:id)
- 답글 조회/생성 (GET/POST /api/v1/feedbacks/:id/replies)
- 프로젝트 정보 조회 (GET /api/v1/projects/:id)
- API 키 인증 (Authorization: Bearer sk_live_xxx)
- Rate Limiting

**관련 파일**

- `apps/web/src/routes/api/v1/` - API 라우트들
- `apps/web/src/lib/api-auth.ts` - API 키 인증 미들웨어
- `docs/04-public-api.md` - API 문서 (이미 존재)

**작업 내용**

1. API 키 검증 미들웨어 구현
2. 각 엔드포인트 구현 및 테스트
3. Rate Limiting 적용
4. 에러 응답 표준화
5. API 문서 업데이트

---

### 8. 스크린샷 첨부

**개요**

위젯에서 사용자가 버그 리포트 시 현재 화면을 캡처하여 첨부할 수 있는 기능입니다.

**구현 범위**

- 화면 캡처 버튼
- html2canvas를 이용한 스크린샷
- 이미지 압축 및 리사이즈
- 이미지 업로드 (S3 또는 Cloudflare R2)
- 어드민에서 스크린샷 보기

**관련 파일**

- `packages/core/src/widget.ts` - 스크린샷 캡처 기능
- `apps/web/src/routes/api/v1/upload.ts` - 이미지 업로드 API
- `packages/database/prisma/schema.prisma` - Feedback에 attachments 필드

**작업 내용**

1. html2canvas 번들 사이즈 최적화 (lazy loading)
2. 스크린샷 캡처 UI
3. 이미지 압축 (브라우저에서)
4. S3/R2 업로드 API
5. 피드백에 이미지 URL 저장
6. 어드민에서 이미지 뷰어

**고려사항**

- 위젯 번들 사이즈 증가 최소화 (html2canvas는 ~40KB)
- 민감 정보 마스킹 옵션
- 이미지 저장 비용

---

## 🟢 우선순위 낮음

### 9. 결제 및 구독 시스템

**개요**

Plan(FREE/PRO/TEAM/ENTERPRISE)별 기능 제한과 결제 시스템입니다. Stripe를 사용하여 구독 결제를 처리합니다.

**구현 범위**

- Stripe 연동
- 플랜별 가격 정책
- 구독 생성/취소/변경
- 결제 내역 조회
- 플랜별 기능 제한
  - FREE: 1 프로젝트, 100 피드백/월
  - PRO: 5 프로젝트, 1,000 피드백/월
  - TEAM: 무제한 프로젝트, 10,000 피드백/월
  - ENTERPRISE: 커스텀

**관련 파일**

- `packages/database/prisma/schema.prisma` - Subscription 테이블
- 새 파일: `apps/web/src/routes/billing.tsx` - 결제 페이지
- 새 파일: `apps/web/src/lib/stripe.ts` - Stripe 클라이언트
- 새 파일: `apps/web/src/routes/api/webhook/stripe.ts` - Stripe 웹훅

**작업 내용**

1. Stripe 계정 설정 및 상품/가격 생성
2. Checkout Session 생성
3. 웹훅으로 구독 상태 동기화
4. 플랜별 제한 체크 미들웨어
5. 결제 UI (가격표, 결제 버튼, 결제 내역)

---

### 10. 실시간 알림 (WebSocket)

**개요**

새 피드백이 접수되면 어드민 대시보드에 실시간으로 표시하는 기능입니다.

**구현 범위**

- WebSocket 서버 설정
- 새 피드백 실시간 푸시
- 브라우저 알림
- 알림 벨 아이콘 + 뱃지
- 알림 목록 드롭다운

**관련 파일**

- `apps/web/app.config.ts` - WebSocket 설정
- `apps/web/src/routes/admin.tsx` - 실시간 업데이트 UI
- 새 파일: `apps/web/src/lib/websocket.ts` - WS 클라이언트

**작업 내용**

1. Nitro WebSocket 설정
2. 피드백 생성 시 WS 브로드캐스트
3. 클라이언트 WS 연결 및 재연결 로직
4. 알림 UI 컴포넌트
5. 브라우저 Notification API 연동

---

### 11. 테스트 코드

**개요**

핵심 비즈니스 로직에 대한 단위 테스트와 통합 테스트를 작성합니다.

**구현 범위**

- 서버 함수 단위 테스트
- API 엔드포인트 통합 테스트
- 위젯 코어 테스트
- E2E 테스트 (Playwright)

**관련 파일**

- `packages/core/src/__tests__/` - 위젯 테스트
- `apps/web/src/__tests__/` - 웹앱 테스트
- `vitest.config.ts` - 테스트 설정

**작업 내용**

1. Vitest 설정 정리
2. 서버 함수 모킹 전략
3. 핵심 로직 테스트 케이스 작성
4. CI에서 테스트 실행
5. 커버리지 리포트

---

### 12. API 문서화

**개요**

Public API에 대한 상세 문서를 작성합니다. OpenAPI/Swagger 스펙을 생성하고 문서 페이지를 제공합니다.

**구현 범위**

- OpenAPI 3.0 스펙 생성
- Swagger UI 또는 Redoc 페이지
- 인증 방법 설명
- 각 엔드포인트 상세 설명
- 요청/응답 예시
- SDK 사용 예시 (curl, JavaScript, Python)

**관련 파일**

- `docs/04-public-api.md` - 기존 문서
- 새 파일: `apps/web/public/openapi.yaml` - OpenAPI 스펙
- 새 파일: `apps/web/src/routes/docs.tsx` - API 문서 페이지

**작업 내용**

1. OpenAPI 스펙 작성
2. 문서 UI 페이지 구현
3. 코드 예시 작성
4. 자동 생성 스크립트 (선택)

---

## 🛠 인프라 및 DevOps

### 13. CDN 배포 파이프라인

**개요**

위젯 스크립트를 S3 + CloudFront로 배포하는 자동화 파이프라인입니다.

**구현 범위**

- S3 버킷 설정
- CloudFront 배포
- 버전 관리 (widget.js, widget@1.0.0.js)
- 캐시 무효화
- GitHub Actions 워크플로우

**작업 내용**

1. AWS 인프라 설정 (Terraform 또는 수동)
2. 빌드 스크립트 작성
3. GitHub Actions 배포 워크플로우
4. 버전 태깅 전략

---

### 14. CI/CD 파이프라인

**개요**

코드 푸시 시 자동으로 테스트, 빌드, 배포를 수행하는 파이프라인입니다.

**구현 범위**

- PR 시 테스트 및 타입 체크
- main 브랜치 머지 시 자동 배포
- 환경별 배포 (staging, production)
- Slack 알림

**작업 내용**

1. GitHub Actions 워크플로우 작성
2. 환경 변수 및 시크릿 설정
3. 배포 스크립트
4. 롤백 전략

---

### 15. 모니터링 및 에러 트래킹

**개요**

프로덕션 환경에서 에러를 추적하고 성능을 모니터링합니다.

**구현 범위**

- Sentry 에러 트래킹
- 성능 모니터링
- 로그 수집
- 알림 설정

**작업 내용**

1. Sentry 프로젝트 설정
2. 클라이언트/서버 SDK 통합
3. 소스맵 업로드
4. 알림 규칙 설정

---

## 진행 상황 추적

| 기능 | 상태 | 이슈 번호 | 담당자 |
|------|------|-----------|--------|
| 피드백 검색/필터 | 📋 계획됨 | - | - |
| 통계 대시보드 | 📋 계획됨 | - | - |
| 팀 멤버 초대 | 📋 계획됨 | - | - |
| 이메일 알림 | 📋 계획됨 | - | - |
| 위젯 설정 UI | 📋 계획됨 | - | - |
| 피드백 내보내기 | 📋 계획됨 | - | - |
| Public API | 📋 계획됨 | - | - |
| 스크린샷 첨부 | 📋 계획됨 | - | - |
| 결제/구독 | 📋 계획됨 | - | - |
| 실시간 알림 | 📋 계획됨 | - | - |
| 테스트 코드 | 📋 계획됨 | - | - |
| API 문서화 | 📋 계획됨 | - | - |
| CDN 배포 | 📋 계획됨 | - | - |
| CI/CD | 📋 계획됨 | - | - |
| 모니터링 | 📋 계획됨 | - | - |
