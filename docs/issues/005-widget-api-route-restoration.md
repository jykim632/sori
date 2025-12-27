# Issue #5: Widget API 라우트 복원 및 설정 통일

**PR**: https://github.com/jykim632/sori/pull/6
**브랜치**: `feature/5-widget-api-route`
**상태**: 완료

## 문제 요약

위젯 관련 여러 설정이 불일치하거나 누락되어 피드백 제출 시 오류가 발생했다.

### 발견된 문제들

1. **API 라우트 누락**: `/api/v1/widget` 라우트가 삭제되어 위젯 스크립트를 로드할 수 없었음
2. **속성명 불일치**: 코드에서는 `data-project`, 문서에서는 `data-project-id` 사용
3. **잘못된 API URL**: 기본 API URL이 존재하지 않는 `https://api.sori.io`로 설정됨
4. **projectId 전달 방식 불일치**: 위젯은 `X-Project-Id` 헤더로 전송, API는 body에서만 읽음
5. **SSR 에러**: `notFoundComponent` 미설정, `window` 객체 SSR 접근 오류

## 해결 방법

### 1. Widget API 라우트 생성

`apps/web/src/routes/api/v1/widget.ts` 신규 생성:
- `packages/core/dist/cdn.js` 파일을 제공
- 여러 경로를 시도하여 monorepo 구조에서도 동작하도록 구현

### 2. 속성명 통일

`data-project-id`로 통일:
- `packages/core/src/cdn.ts`
- `README.md`, `README.ko.md`
- `docs/02-differentiation.md`
- `test.html`

### 3. API URL 수정

기본 API URL을 `https://web.sori.life`로 변경:
- `packages/core/src/api.ts`
- `packages/core/src/widget.ts`
- `packages/core/src/types.ts` (주석)

**환경별 URL**:
| 환경 | URL |
|------|-----|
| Production | `https://web.sori.life` (기본값) |
| Develop | `https://dev.sori.life` |
| Local | `http://localhost:3000` |

로컬/개발 환경에서는 `data-api-url` 속성으로 오버라이드:
```html
<script
  src="http://localhost:3000/api/v1/widget"
  data-project-id="PROJECT_ID"
  data-api-url="http://localhost:3000"
></script>
```

### 4. X-Project-Id 헤더 지원

`apps/web/src/routes/api/v1/feedback.ts` 수정:
- `projectId`를 헤더(`X-Project-Id`)와 body 모두에서 읽도록 변경
- CORS 헤더에 `X-Project-Id` 허용 추가

```typescript
const projectId = request.headers.get("X-Project-Id") || body.projectId;
```

### 5. SSR 호환성 수정

**router.tsx**:
```typescript
defaultNotFoundComponent: () => null,
```

**admin.tsx**:
```typescript
const [origin, setOrigin] = useState("");

useEffect(() => {
  setOrigin(window.location.origin);
}, []);
```

## 변경된 파일

| 파일 | 변경 유형 |
|------|----------|
| `apps/web/src/routes/api/v1/widget.ts` | 신규 생성 |
| `apps/web/src/routes/api/v1/feedback.ts` | 수정 |
| `apps/web/src/router.tsx` | 수정 |
| `apps/web/src/routes/admin.tsx` | 수정 |
| `packages/core/src/widget.ts` | 수정 |
| `packages/core/src/api.ts` | 수정 |
| `packages/core/src/cdn.ts` | 수정 |
| `packages/core/src/types.ts` | 수정 |
| `README.md` | 수정 |
| `README.ko.md` | 수정 |
| `docs/02-differentiation.md` | 수정 |
| `test.html` | 수정 |

## 커밋 이력

1. `fix(widget): API 라우트 복원 및 설정 통일`
2. `fix(api): X-Project-Id 헤더 지원 추가`
3. `fix(web): SSR 호환성 수정`

## 테스트 방법

1. `pnpm dev` 실행
2. `http://localhost:3000/api/v1/widget` 접속하여 스크립트 로드 확인
3. `test.html`을 별도 서버로 실행 (`npx serve .`)
4. 위젯 버튼 클릭 후 피드백 제출
5. Admin 페이지에서 피드백 확인
