# 차별화 전략

## 핵심 차별화 포인트

### 1. 개발자 친화적
```
✓ 위젯 오픈소스 (GitHub 공개)
✓ API 우선 설계 + 상세 문서
✓ 다양한 SDK: React, Vue, Svelte, Vanilla JS
✓ Webhook 지원 (Slack, Discord, 자체 서버)
✓ CLI 도구 (npx sori init)
✓ 셀프호스팅 옵션 (Docker)
```

### 2. 경량화
```
✓ 위젯 번들 < 10KB (gzipped) - 실제 3.2KB 달성!
✓ 의존성 제로 (Vanilla JS 코어)
✓ Lazy loading (아이콘만 먼저, 폼은 클릭 시)
✓ 이미지/스크린샷은 선택적
```

### 3. 한국 시장 특화
```
✓ 한국어 UI 기본
✓ 카카오 알림톡 연동 (새 피드백 알림)
✓ 슬랙/디스코드 한국 커뮤니티 공략
✓ 국내 결제 (토스페이먼츠)
✓ 한국 리전 배포
```

## 경쟁사 대비 포지셔닝

| 항목 | Gleap | Canny | Sori (우리) |
|------|-------|-------|-------------|
| 위젯 크기 | 무거움 | 무거움 | **3.2KB** |
| 오픈소스 | X | X | **O** |
| 한국어 | X | X | **O** |
| 가격 | $29~ | $99~ | 경쟁력 있게 |
| 설치 난이도 | 보통 | 보통 | **매우 쉬움** |

## 설치 경험 비교

### 경쟁사 (일반적)
```javascript
// 1. 라이브러리 설치
npm install @competitor/widget

// 2. 초기화 코드 작성
import { Widget } from '@competitor/widget'

Widget.init({
  apiKey: 'xxx',
  project: 'yyy',
  // ... 10줄 이상의 설정
})

// 3. 스타일 import
import '@competitor/widget/styles.css'
```

### Sori (우리)
```html
<!-- 끝. 이게 전부 -->
<script src="https://cdn.sori.io/widget.js" data-project-id="abc123"></script>
```

또는 React:
```tsx
import { SoriWidget } from '@sori/react'

<SoriWidget projectId="abc123" />
```

## 타겟 사용자 페르소나

### 1. 스타트업 개발자 (김개발, 28세)
- 1-5인 팀의 풀스택 개발자
- 시간이 없어서 빠르게 도입 가능한 솔루션 선호
- 가격에 민감, 무료 또는 저렴한 플랜 필요
- **니즈**: 5분 안에 설치, 설정 최소화

### 2. 제품 매니저 (이프로, 32세)
- 중소기업 PM
- 사용자 피드백 수집/분석 필요
- 개발팀 리소스 요청 어려움
- **니즈**: 개발자 도움 없이 설치 가능

### 3. 기술 리더 (박테크, 38세)
- 10-50인 개발팀 리드
- 보안, 데이터 소유권 중요시
- 셀프호스팅 선호
- **니즈**: 오픈소스, 커스터마이징 가능

## 마케팅 메시지

### 헤드라인
> "3KB로 끝나는 피드백 수집"

### 서브 헤드라인
> 스크립트 한 줄, 설정 없음, 바로 시작

### 키 메시지
1. 가장 가벼운 피드백 위젯 (3.2KB)
2. 한 줄 설치로 바로 시작
3. 오픈소스 & 개발자 친화적
4. 한국어 기본 지원
