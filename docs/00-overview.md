# Sori - 프로젝트 개요

## 프로젝트명
**Sori (소리)** - 고객의 목소리를 듣는 피드백 솔루션

## 솔루션 목적
웹 서비스를 운영하는 플랫폼들이 사용자 피드백을 쉽게 수집하고 관리할 수 있는 SaaS 솔루션

## 핵심 기능

### 1. 피드백 위젯
- 고객 사이트에 설치하는 경량 위젯
- 사이트 우측 하단에 플로팅 아이콘 표시
- 클릭/호버 시 피드백 폼 UI 노출
- 설치 방법: `<script>` 한 줄 또는 npm 패키지 import

### 2. Admin 대시보드
- 수집된 피드백 목록 조회
- 상태 관리 (OPEN → IN_PROGRESS → RESOLVED)
- 필터/검색 기능
- 프로젝트별 분류

## 타겟 고객
- 웹 서비스/플랫폼 운영자
- SaaS 제품 팀
- 스타트업 ~ 중소기업
- 한국 시장 우선 타겟

## 기술 스택
- **Frontend**: TanStack Start (React 19, Vite)
- **Backend**: TanStack Server Functions
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma 7.x
- **Widget**: Vanilla JS (의존성 0)
- **Monorepo**: pnpm + Turborepo

## 프로젝트 구조
```
sori/
├── packages/
│   ├── core/       # Vanilla JS 위젯
│   └── react/      # React wrapper
├── apps/
│   └── web/        # Admin 대시보드
└── tooling/
    └── tsconfig/   # 공유 설정
```

## 관련 문서
- [경쟁사 분석](./01-competitive-analysis.md)
- [차별화 전략](./02-differentiation.md)
- [아키텍처](./03-architecture.md)
- [스키마 설계](./04-schema-design.md)
- [라이선스 전략](./05-licensing.md)
- [모노레포 세팅](./06-monorepo-setup.md)
