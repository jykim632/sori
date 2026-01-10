# Sori 프론트엔드 코드 리뷰

> 작성일: 2026-01-10
> 리뷰어: Senior Frontend Developer

## 전체 점수: **B- (70/100)**

---

## 잘된 점

### 1. 모노레포 아키텍처 (A)

```
packages/core   → 제로 의존성 위젯 (3.2KB)
packages/react  → React 래퍼
packages/database → 공유 스키마/타입
apps/web        → 어드민 앱
```

- pnpm workspace + Turborepo 조합이 깔끔함
- 패키지 간 의존성 관리가 적절함

### 2. 위젯 코어 (A-)

- Shadow DOM 사용으로 스타일 격리 완벽
- 제로 의존성 유지
- 테마 시스템이 잘 설계됨

### 3. 타입 시스템 (B+)

- Zod 스키마로 런타임 검증 통합
- `@sori/database`에서 타입 re-export
- Server Functions 입력 검증

### 4. 라우팅 (B+)

- TanStack Router의 타입 안전한 라우팅 활용
- `validateSearch`로 쿼리 파라미터 검증
- `loaderDeps`로 데이터 의존성 명시

---

## 문제점 및 개선 필요 사항

### 1. 테스트 코드 전무 (F)

```bash
# 프로젝트 내 테스트 파일
$ find . -name "*.test.ts" -not -path "./node_modules/*"
# (결과 없음)
```

CLAUDE.md에 테스트 언급은 있지만 **실제 테스트가 하나도 없음**.

- 핵심 비즈니스 로직 테스트 없음
- 위젯 동작 테스트 없음
- 컴포넌트 테스트 없음

### 2. 페이지 컴포넌트 비대화 (D)

```
$projectId.tsx  → 1079줄
feedbacks.tsx   → 632줄
settings.tsx    → 327줄
```

`$projectId.tsx`가 **1000줄이 넘음**. CLAUDE.md의 "함수는 20줄 이내" 원칙을 완전히 위반.

**문제:**

- 프로젝트 설정, API 키 관리, 테마 설정, 삭제 확인이 전부 한 파일에
- 관심사 분리 안됨
- 재사용성 0

**개선 방향:**

```
projects/$projectId/
├── index.tsx (라우트 설정만)
├── BasicInfoSection.tsx
├── ThemeSettingsSection.tsx
├── ApiKeySection.tsx
├── DeleteSection.tsx
└── hooks/
    ├── useProjectSettings.ts
    └── useApiKeyManagement.ts
```

### 3. 타입 캐스팅 남용 (C)

```typescript
// feedbacks.tsx:101-102
feedbacksResult.data as unknown as { data: FeedbackWithProject[]; pagination: Pagination },
getProjects({ data: { organizationId: orgId } }) as unknown as Project[],

// feedbacks.tsx:120
const loaderData = Route.useLoaderData() as LoaderData | undefined;

// $projectId.tsx:104
const project = await getProjectById({ data: { id: params.projectId } }) as ProjectType | null;
```

`as unknown as`는 **타입 안전성을 완전히 포기**하는 것. Server Functions의 반환 타입이 제대로 정의되지 않았다는 증거.

### 4. 에러 처리가 primitive (D)

```typescript
// $projectId.tsx:155-156
} catch (error) {
  alert(error instanceof Error ? error.message : "API 키 생성에 실패했습니다.");
}

// FeedbackDetailModal.tsx:53
alert("답변 등록에 실패했습니다.");

// FeedbackDetailModal.tsx:60
if (!confirm("정말 이 답변을 삭제하시겠습니까?")) return;
```

`alert()`, `confirm()` 사용은 **2024년 기준 안티패턴**.

- 사용자 경험 최악
- 커스터마이징 불가
- 테스트 불가

**개선 필요:**

- Toast 시스템 도입 (react-hot-toast, sonner 등)
- 커스텀 확인 모달

### 5. 상태 관리 부재 (C+)

```typescript
// 모든 상태가 컴포넌트 내부 useState
const [searchInput, setSearchInput] = useState(filterSearch || "");
const [pendingStatus, setPendingStatus] = useState<...>(null);
const [selectedFeedback, setSelectedFeedback] = useState<...>(null);
// ... 10개 이상의 useState
```

- 글로벌 상태 관리 라이브러리 없음
- 서버 상태 캐싱 없음 (TanStack Query 미사용)
- Props drilling이 심해질 가능성

### 6. 코드 중복 (C)

```typescript
// $projectId.tsx에서 THEME_PRESETS 정의
const THEME_PRESETS: Record<ThemePreset, ThemeStyles> = {
  default: { ... },
  minimal: { ... },
  rounded: { ... },
};

// packages/core/src/themes.ts에서도 동일하게 정의
export const THEME_PRESETS = { ... };
```

테마 프리셋이 **두 곳에서 중복 정의**됨. 동기화가 깨지면 버그 발생.

### 7. 접근성(a11y) 미흡 (D)

```typescript
// FeedbackDetailModal.tsx:76-80
<div
  className="fixed inset-0 bg-black/50 ..."
  onClick={onClose}
>
```

- 모달에 `role="dialog"`, `aria-modal` 없음
- ESC 키로 닫기 미구현
- 포커스 트랩 없음
- 스크린 리더 지원 없음

### 8. 의존성 버전 관리 (B-)

```json
"react": "^19.2.0"
```

React 19가 아직 정식 출시 전 버전인데 프로덕션에서 사용 중. 호환성 이슈 잠재적 위험.

### 9. CSS 관리 (B)

- Tailwind 유틸리티 클래스가 길게 나열됨
- 재사용되는 스타일 패턴이 추출되지 않음

```typescript
className={`px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider ...`}
```

---

## 아키텍처 개선 제안

### 1. 컴포넌트 분리 전략

```
components/
├── ui/              # 순수 UI (Button, Modal, Toast, etc.)
├── features/        # 기능별 (feedback/, project/, auth/)
│   ├── feedback/
│   │   ├── FeedbackList.tsx
│   │   ├── FeedbackDetail.tsx
│   │   └── hooks/useFeedbacks.ts
│   └── project/
│       ├── ProjectSettings.tsx
│       ├── ThemeEditor.tsx
│       └── ApiKeyManager.tsx
└── layouts/
```

### 2. 서버 상태 관리 도입

```typescript
// TanStack Query 활용
const { data, isLoading, error } = useQuery({
  queryKey: ["feedbacks", filters],
  queryFn: () => getFeedbacksFiltered(filters),
});
```

### 3. 에러 바운더리 & Toast

```typescript
// 전역 에러 처리
<ErrorBoundary fallback={<ErrorPage />}>
  <Toaster position="top-right" />
  <App />
</ErrorBoundary>
```

---

## 점수 요약

| 항목         | 점수 | 비고             |
| ------------ | ---- | ---------------- |
| 아키텍처     | B+   | 모노레포 구조 좋음 |
| 코드 품질    | C+   | 파일 비대화, 중복 |
| 타입 안전성  | C    | 캐스팅 남용       |
| 테스트       | F    | 전무             |
| 접근성       | D    | 미구현           |
| DX           | B    | 설정은 잘됨       |
| 유지보수성   | C    | 분리 필요         |

---

## 결론

**"MVP로는 충분하지만, 확장성과 유지보수를 위해 리팩토링 필요"**

### 당장 급한 것

1. `$projectId.tsx` 분리 (기술 부채 심각)
2. 테스트 작성 시작
3. Toast/Modal 시스템 도입
4. 타입 캐스팅 제거

### 중기 과제

1. TanStack Query 도입으로 서버 상태 관리
2. 접근성 개선 (a11y)
3. 에러 바운더리 구현
4. 컴포넌트 구조 재설계

### 장기 과제

1. 테스트 커버리지 80% 이상
2. Storybook 도입
3. 디자인 시스템 구축
