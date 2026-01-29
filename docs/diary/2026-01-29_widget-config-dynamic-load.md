# 2026-01-29 위젯 설정 동적 로드 구현

## 작업한 내용

### 문제 발견
- Admin에서 위젯 설정(테마, 색상, 위치, 인사말 등)을 수정해도 CDN 위젯에 반영되지 않음
- 현재 구조: Admin → DB 저장, widget.js → data-* 속성만 읽음
- 두 시스템이 연결되어 있지 않음

### 해결 방안
API 동적 로드 방식 채택:
1. `GET /api/v1/projects/:projectId/widget-config` 엔드포인트 추가
2. `packages/core/src/cdn.ts`에서 위젯 초기화 시 API 호출
3. 서버 설정 우선, data-* 속성은 fallback

### 구현 파일
- `apps/web/src/routes/api/v1/projects.$projectId.widget-config.ts` (신규)
- `packages/core/src/cdn.ts` (수정)
- `apps/web/src/routeTree.gen.ts` (자동 생성)

## 왜 했는지 (맥락)
- 사용자 질문: "위젯 설정을 수정하면 CDN에 반영이 되나?"
- 확인 결과: 반영 안 됨
- Admin에서 설정한 widgetConfig가 실제 위젯에 적용되어야 SaaS로서 가치가 있음

## 논의/아이디어/고민

### 고려한 방안
| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. API 동적 로드** | widget.js가 API 호출 | Admin 변경 즉시 반영 | 추가 네트워크 요청 |
| **B. data-* 속성 유지** | embed 코드에 설정 포함 | 네트워크 없음 | 재embed 필요 |

### 선택: A (API 동적 로드)
- 이유: SaaS 특성상 사용자가 Admin에서 설정하면 바로 반영되어야 함
- 네트워크 요청 1회 추가되지만 1분 캐시로 부담 최소화

## 결정된 내용
- API 호출 방식으로 구현
- 서버 설정 우선, data-* 속성은 fallback (하위 호환)
- 1분 캐시 적용 (Cache-Control: public, max-age=60)
- CORS 전체 허용 (위젯은 어디서든 설정 조회 가능해야 함)

## 느낀 점/난이도/발견
- **난이도**: 낮음 (구조가 잘 잡혀있어서 추가 작업이 간단했음)
- **발견**: widget.ts에 이미 `widgetConfig` 파라미터를 받을 수 있게 설계되어 있었음. cdn.ts만 수정하면 됨
- TanStack Router 파일 기반 라우팅에서 `projects.$projectId.widget-config.ts` → `/api/v1/projects/:projectId/widget-config` 패턴 확인

## 남은 것/미정
- [ ] CDN 배포 (Cloudflare Pages)
- [ ] 실제 외부 사이트에서 테스트
- [ ] PR 생성 및 머지

## 다음 액션
1. PR 생성 (develop → main)
2. CDN 재배포 (`wrangler pages deploy`)
3. 테스트 사이트에서 Admin 설정 변경 → 위젯 반영 확인

## 서랍메모
- widgetConfig 구조:
  ```typescript
  interface WidgetConfig {
    preset: "default" | "minimal" | "rounded";
    styles?: Partial<ThemeStyles>;
    position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
    greeting?: string;
    locale?: "ko" | "en";
  }
  ```
- API 응답 형식:
  ```json
  {
    "projectId": "xxx",
    "config": { ... } // 또는 null
  }
  ```

## 내 질문 평가 및 피드백
- 질문: "위젯 설정을 수정하면 CDN에 반영이 되나?"
- 평가: 좋은 질문. 시스템의 연결 상태를 확인하는 본질적 질문
- 피드백: 기능 구현 후 실제 데이터 흐름을 확인하는 습관이 좋음

---

## 관련 이슈
- beads: sori-7lk (closed)
- 브랜치: `feat/sori-7lk-widget-config-dynamic-load`
- 커밋: `6cbcf96`
