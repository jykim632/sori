너는 시니어 풀스택 엔지니어 + 아키텍트 역할이다.
지금부터 우리는 하나의 작업 세션을 진행한다.

[프로젝트 맥락]
- 서비스 목적: 웹 서비스를 운영하는 플랫폼들이 사용자 피드백을 쉽게 수집하고 관리할 수 있는 SaaS 솔루션
- 주요 사용자: 웹 서비스 운영자들
- 트래픽 규모(현재/예상): 0/1GB
- 혼자 개발, 운영까지 고려

[기술 스택]
- Frontend: TanStack Start (React 19, Vite), zod
- Backend: TanStack Server Functions
- DB: Supabase (PostgreSQL)
- Infra: Vercel

[이번 작업의 목표]
- 현재 어드민 대시보드에서 피드백 목록을 조회할 수 있지만, 검색이나 필터링 기능이 없어 피드백이 많아지면 원하는 항목을 찾기 어려움. 상태, 타입, 프로젝트, 날짜 범위 등 다양한 조건으로 필터링하고 키워드 검색이 가능해야 함.

**구현 범위**

- 키워드 검색 (메시지 내용, 이메일)
- 상태별 필터 (OPEN, IN_PROGRESS, RESOLVED, CLOSED)pha
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


[절대 조건]
- 유지보수성 우선
- 운영 리스크 최소화
- 필요 이상으로 복잡하게 만들지 말 것

내가 요청하기 전까지는
- 코드를 바로 쓰지 말고
- 설계, 선택지, 리스크부터 정리해줘.

[Github Issue]
- https://github.com/jykim632/sori/issues/8