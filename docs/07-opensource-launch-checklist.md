# 오픈소스 런칭 체크리스트

## Phase 1: 코드 준비 (1-2일)

### GitHub 저장소
- [ ] GitHub public repo 생성 (`sori` 또는 `sori-feedback`)
- [ ] 코드 push
- [ ] README.md URL 실제 도메인으로 교체
  - `your-domain.com` → 실제 도메인
  - `your-org/sori` → 실제 GitHub 경로
- [ ] About 섹션 작성
  - Description: "The lightest feedback widget. 3KB. Zero dependencies."
  - Website: 랜딩 페이지 URL
  - Topics: `feedback`, `widget`, `react`, `typescript`, `opensource`, `saas`
- [ ] Social preview 이미지 설정 (1280x640px)

### GitHub 템플릿
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` 생성
- [ ] `.github/ISSUE_TEMPLATE/feature_request.md` 생성
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` 생성

### 데모 자료
- [ ] 위젯 작동 GIF 녹화 (10초 이내)
  - 플로팅 버튼 클릭 → 폼 열림 → 피드백 입력 → 제출
- [ ] README.md에 GIF 추가
- [ ] 스크린샷 (대시보드 화면)

---

## Phase 2: npm 배포 (1일)

### 사전 확인
- [ ] 패키지명 사용 가능 여부 확인
  ```bash
  npm info @sori/core
  npm info @sori/react
  ```
- [ ] 이미 사용중이면 대안 검토
  - `@sori-feedback/core`
  - `@getsori/core`

### 패키지 정보 업데이트
- [ ] `packages/core/package.json` 수정
  - `repository.url` 실제 GitHub URL로
  - `homepage` 추가
  - `bugs.url` 추가
- [ ] `packages/react/package.json` 동일하게 수정

### 배포
- [ ] npm 로그인: `npm login`
- [ ] core 배포: `cd packages/core && npm publish --access public`
- [ ] react 배포: `cd packages/react && npm publish --access public`
- [ ] 배포 확인: npmjs.com에서 확인

---

## Phase 3: 서비스 배포 (2-3일)

### 도메인
- [ ] 도메인 확보
  - 1순위: `sori.io` 또는 `sori.dev`
  - 대안: `getsori.io`, `usesori.com`

### 랜딩 페이지
- [ ] 랜딩 페이지 구현 (또는 README를 랜딩으로 활용)
- [ ] 라이브 데모 위젯 포함
- [ ] Vercel/Cloudflare에 배포

### 프로덕션 배포
- [ ] Supabase 프로젝트 생성 (프로덕션용)
- [ ] 환경변수 설정
- [ ] `pnpm db:push` 실행
- [ ] Vercel에 apps/web 배포
- [ ] 커스텀 도메인 연결

---

## Phase 4: 홍보 (1주)

### 한국 커뮤니티
- [ ] **GeekNews** 제출 (https://news.hada.io)
  - 제목: "Sori - 3KB 피드백 위젯 오픈소스로 공개"
- [ ] **디스콜** 게시
  - #오픈소스 또는 #사이드프로젝트 채널
- [ ] **커리어리** 글 작성
  - 개발 과정, 기술 선택 이유 포함
- [ ] **velog/tistory** 기술 블로그
  - "3KB 위젯 만들기" 시리즈

### 해외 커뮤니티
- [ ] **Hacker News** (Show HN)
  - 제목: "Show HN: Sori – 3KB feedback widget, zero dependencies"
- [ ] **Reddit**
  - r/webdev
  - r/javascript
  - r/reactjs
  - r/SideProject
- [ ] **Twitter/X**
  - 개발자 계정으로 스레드 작성
  - #buildinpublic 해시태그

### Awesome 리스트 PR
- [ ] awesome-react
- [ ] awesome-javascript
- [ ] awesome-opensource

### Product Hunt
- [ ] 런칭 예약 (화요일~목요일 권장)
- [ ] Tagline: "The lightest feedback widget for your website"
- [ ] 스크린샷 5장 준비
- [ ] Maker comment 준비

---

## Phase 5: 지속 관리

### 커뮤니티
- [ ] Discord 서버 개설 (선택)
- [ ] GitHub Discussions 활성화
- [ ] Issue 응답 (24시간 내 첫 응답 목표)

### 문서화
- [ ] docs.sori.io 문서 사이트 (Docusaurus/Nextra)
- [ ] API 레퍼런스
- [ ] 예제 코드

### 마일스톤
- [ ] 100 GitHub Stars
- [ ] 첫 외부 기여자
- [ ] 1000 npm 주간 다운로드

---

## 참고: 홍보글 템플릿

### GeekNews/디스콜용
```
Sori - 3KB 피드백 위젯 오픈소스

웹사이트에 피드백 수집 기능이 필요해서 만들었습니다.

특징:
- 3.2KB (gzip) - 경쟁사 대비 1/50 크기
- 의존성 0개 - 순수 바닐라 JS
- 스크립트 한 줄로 설치

GitHub: https://github.com/xxx/sori
데모: https://sori.io

피드백 환영합니다!
```

### Hacker News용
```
Show HN: Sori – 3KB feedback widget with zero dependencies

I built a lightweight feedback widget because existing solutions (Canny, Gleap, etc.) were too heavy for my needs.

- 3.2KB gzipped (vs ~200KB for competitors)
- Zero dependencies, pure vanilla JS
- One line installation
- Self-hostable, MIT licensed

GitHub: https://github.com/xxx/sori
```

---

## 일정 요약

| 주차 | 목표 |
|------|------|
| 1주차 | Phase 1-2 완료 (GitHub + npm) |
| 2주차 | Phase 3 완료 (배포) |
| 3주차 | Phase 4 시작 (홍보) |
| 4주차+ | Phase 5 (지속 관리) |
