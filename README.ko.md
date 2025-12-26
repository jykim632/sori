<p align="center">
  <h1 align="center">Sori (소리)</h1>
  <p align="center">
    <strong>3KB로 끝나는 피드백 수집</strong>
    <br />
    가장 가벼운 피드백 위젯. 의존성 제로. 한 줄 설치.
  </p>
</p>

<p align="center">
  <a href="#설치">설치</a> •
  <a href="#사용법">사용법</a> •
  <a href="#기능">기능</a> •
  <a href="#셀프호스팅">셀프호스팅</a> •
  <a href="./README.md">English</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/gzip-3.2KB-brightgreen" alt="번들 사이즈" />
  <img src="https://img.shields.io/badge/의존성-0-blue" alt="의존성 제로" />
  <img src="https://img.shields.io/badge/라이선스-MIT-green" alt="MIT 라이선스" />
</p>

---

## 왜 Sori인가요?

| | Sori | Gleap | Canny | Hotjar |
|---|:---:|:---:|:---:|:---:|
| **번들 크기** | **3.2KB** | ~200KB | ~150KB | ~100KB |
| **의존성** | **0개** | 다수 | 다수 | 다수 |
| **오픈소스** | **O** | X | X | X |
| **무료 플랜** | **O** | 제한적 | X | 제한적 |
| **셀프호스팅** | **O** | X | X | X |

## 설치

### 방법 1: Script 태그 (권장)

```html
<script
  src="https://your-domain.com/api/v1/widget"
  data-project="프로젝트_ID"
  defer
></script>
```

끝입니다. 빌드 과정도, 설정도 필요 없습니다.

### 방법 2: npm

```bash
npm install @sori/core
# 또는
pnpm add @sori/core
```

```javascript
import { SoriWidget } from '@sori/core'

SoriWidget.init({
  projectId: '프로젝트_ID',
  apiUrl: 'https://your-domain.com'
})
```

### 방법 3: React

```bash
npm install @sori/react
```

```tsx
import { SoriWidget } from '@sori/react'

function App() {
  return (
    <>
      <YourApp />
      <SoriWidget projectId="프로젝트_ID" />
    </>
  )
}
```

## 사용법

### 기본

위젯은 화면 우측 하단에 플로팅 버튼으로 표시됩니다. 클릭하면 피드백 폼이 열립니다.

### 피드백 유형

사용자는 세 가지 유형의 피드백을 제출할 수 있습니다:
- **버그** - 오류 및 문제 신고
- **기능 요청** - 새로운 기능 제안
- **문의** - 일반 질문

### 커스터마이징

```javascript
SoriWidget.init({
  projectId: '프로젝트_ID',
  position: 'bottom-right', // 또는 'bottom-left'
  primaryColor: '#6366f1',
  locale: 'ko' // 또는 'en'
})
```

## 기능

- **초경량** - gzip 3.2KB, 즉시 로드
- **의존성 제로** - 순수 바닐라 자바스크립트
- **지연 로딩** - 클릭 시에만 폼 로드
- **모바일 친화적** - 반응형 디자인
- **접근성** - 키보드 탐색, 스크린 리더 지원
- **커스터마이징** - 색상, 위치, 언어 설정

## 어드민 대시보드

대시보드에서 피드백을 관리하세요:

- 모든 피드백을 한 곳에서 확인
- 상태, 유형, 프로젝트별 필터링
- 상태 업데이트 (접수 → 진행중 → 해결)
- 웹훅 알림 (Slack, Discord, Telegram, 카카오톡)

## 셀프호스팅

### 요구사항

- Node.js 20+
- PostgreSQL (Supabase 권장)
- pnpm

### 빠른 시작

```bash
# 저장소 클론
git clone https://github.com/your-org/sori.git
cd sori

# 의존성 설치
pnpm install

# 환경 변수 설정
cp apps/web/.env.example apps/web/.env
# .env 파일에 데이터베이스 URL 입력

# 데이터베이스 스키마 적용
pnpm db:push

# 개발 서버 시작
pnpm dev
```

### Docker

```bash
docker-compose up -d
```

## 프로젝트 구조

```
sori/
├── packages/
│   ├── core/       # 바닐라 JS 위젯 (MIT)
│   ├── react/      # React 래퍼 (MIT)
│   └── database/   # Prisma 클라이언트
└── apps/
    └── web/        # 어드민 대시보드
```

## 기술 스택

- **위젯**: 바닐라 자바스크립트, 의존성 없음
- **대시보드**: React 19, TanStack Start, Tailwind CSS
- **데이터베이스**: PostgreSQL + Prisma ORM
- **인증**: better-auth

## 기여하기

기여를 환영합니다! [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해주세요.

```bash
# 테스트 실행
pnpm test

# 타입 체크
pnpm typecheck

# 전체 빌드
pnpm build
```

## 라이선스

- `@sori/core`, `@sori/react` - [MIT](./LICENSE)
- 어드민 대시보드 - 상업 라이선스 문의

## 링크

- [문서](https://docs.sori.io)
- [Discord 커뮤니티](https://discord.gg/sori)
- [Twitter](https://twitter.com/sori_feedback)

---

<p align="center">
  Made with ❤️ in Korea
</p>
