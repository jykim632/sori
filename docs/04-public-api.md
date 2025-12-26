# Public API

고객 플랫폼에서 피드백을 자체적으로 관리할 수 있는 Public API를 제공합니다.

## 개요

- **인증**: Project 단위 API 키 (Bearer Token)
- **Rate Limit**: 100 requests/minute per API key
- **Base URL**: `https://app.sori.life/api/v1`

## API 키 발급

1. Admin 대시보드 → 프로젝트 탭 → 프로젝트 선택 → "위젯 설정"
2. API 키 섹션에서 "API 키 생성" 클릭
3. 생성된 키는 **한 번만 표시**되므로 안전하게 보관

```
sk_live_abc123xyz789...
```

## 인증

모든 API 요청에 `Authorization` 헤더 필요:

```bash
curl -H "Authorization: Bearer sk_live_your_api_key" \
  https://app.sori.life/api/v1/feedbacks
```

## 엔드포인트

### 피드백 목록 조회

```
GET /api/v1/feedbacks
```

**Query Parameters:**

| 파라미터 | 타입 | 기본값 | 설명 |
|----------|------|--------|------|
| page | number | 1 | 페이지 번호 |
| limit | number | 20 | 페이지당 항목 수 (최대 100) |
| status | string | - | 필터: OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| type | string | - | 필터: BUG, INQUIRY, FEATURE |

**Response:**

```json
{
  "data": [
    {
      "id": "fb_abc123",
      "type": "BUG",
      "message": "로그인이 안 됩니다",
      "email": "user@example.com",
      "status": "OPEN",
      "priority": "HIGH",
      "metadata": { "url": "https://example.com/login" },
      "createdAt": "2024-01-15T10:30:00Z",
      "resolvedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### 피드백 상세 조회

```
GET /api/v1/feedbacks/:feedbackId
```

**Response:**

```json
{
  "id": "fb_abc123",
  "type": "BUG",
  "message": "로그인이 안 됩니다",
  "email": "user@example.com",
  "status": "OPEN",
  "priority": "HIGH",
  "metadata": { "url": "https://example.com/login" },
  "createdAt": "2024-01-15T10:30:00Z",
  "resolvedAt": null,
  "replies": [
    {
      "id": "rp_xyz789",
      "content": "확인 중입니다. 브라우저 버전을 알려주세요.",
      "authorName": "Support Team",
      "authorType": "API",
      "createdAt": "2024-01-15T11:00:00Z"
    }
  ]
}
```

> **참고**: `isInternal: true`인 내부 메모는 API 응답에서 제외됩니다.

---

### 피드백 상태 변경

```
PATCH /api/v1/feedbacks/:feedbackId
```

**Request Body:**

```json
{
  "status": "IN_PROGRESS",
  "priority": "HIGH"
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| status | string | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| priority | string | LOW, MEDIUM, HIGH, URGENT |

**Response:** 업데이트된 피드백 객체

---

### 답변 생성

```
POST /api/v1/feedbacks/:feedbackId/replies
```

**Request Body:**

```json
{
  "content": "문의 주셔서 감사합니다. 확인 후 답변 드리겠습니다.",
  "authorName": "Support Team"
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| content | string | O | 답변 내용 (1-10000자) |
| authorName | string | X | 작성자 이름 (최대 100자) |

**Response:**

```json
{
  "id": "rp_xyz789",
  "content": "문의 주셔서 감사합니다. 확인 후 답변 드리겠습니다.",
  "feedbackId": "fb_abc123",
  "authorName": "Support Team",
  "authorType": "API",
  "isInternal": false,
  "createdAt": "2024-01-15T11:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

### 답변 수정

```
PUT /api/v1/feedbacks/:feedbackId/replies/:replyId
```

**Request Body:**

```json
{
  "content": "수정된 답변 내용입니다."
}
```

> **참고**: API로 생성한 답변(`authorType: API`)만 수정 가능합니다.

---

### 답변 삭제

```
DELETE /api/v1/feedbacks/:feedbackId/replies/:replyId
```

**Response:** `204 No Content`

> **참고**: API로 생성한 답변(`authorType: API`)만 삭제 가능합니다.

---

## 에러 응답

```json
{
  "error": {
    "message": "Unauthorized",
    "status": 401
  }
}
```

| 상태 코드 | 설명 |
|-----------|------|
| 400 | 잘못된 요청 (유효성 검사 실패) |
| 401 | 인증 실패 (API 키 없음 또는 유효하지 않음) |
| 403 | 권한 없음 (다른 프로젝트 리소스 접근 시도) |
| 404 | 리소스 없음 |
| 429 | Rate limit 초과 |
| 500 | 서버 에러 |

## Rate Limiting

- **제한**: 100 requests/minute per API key
- **응답 헤더**:
  - `X-RateLimit-Remaining`: 남은 요청 수
  - `X-RateLimit-Reset`: 리셋 시간 (ISO 8601)

Rate limit 초과 시:

```json
{
  "error": {
    "message": "Rate limit exceeded",
    "status": 429,
    "retryAfter": 30
  }
}
```

## 보안 고려사항

1. **API 키 관리**
   - 생성 시 한 번만 전체 표시
   - 서버 사이드에서만 사용 (클라이언트 노출 금지)
   - 정기적으로 키 재발급 권장

2. **소유권 확인**
   - 모든 요청은 API 키가 속한 프로젝트의 리소스만 접근 가능
   - 다른 프로젝트 리소스 접근 시 404 반환 (정보 유출 방지)

3. **Reply 권한**
   - API로 생성된 Reply만 API로 수정/삭제 가능
   - Admin이 생성한 Reply는 수정/삭제 불가

## 사용 예시

### Node.js

```javascript
const API_KEY = 'sk_live_your_api_key';
const BASE_URL = 'https://app.sori.life/api/v1';

// 피드백 목록 조회
const response = await fetch(`${BASE_URL}/feedbacks?status=OPEN`, {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
  },
});
const { data, pagination } = await response.json();

// 답변 작성
await fetch(`${BASE_URL}/feedbacks/${feedbackId}/replies`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    content: '답변 내용입니다.',
    authorName: 'Support Bot',
  }),
});
```

### Python

```python
import requests

API_KEY = 'sk_live_your_api_key'
BASE_URL = 'https://app.sori.life/api/v1'
headers = {'Authorization': f'Bearer {API_KEY}'}

# 피드백 목록 조회
response = requests.get(f'{BASE_URL}/feedbacks', headers=headers)
feedbacks = response.json()['data']

# 상태 변경
requests.patch(
    f'{BASE_URL}/feedbacks/{feedback_id}',
    headers=headers,
    json={'status': 'RESOLVED'}
)
```

## Reply 모델

```
Feedback : Reply = 1 : N (대화 스레드)
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | Reply ID |
| content | string | 답변 내용 |
| feedbackId | string | 피드백 ID |
| authorId | string? | 작성자 User ID (Admin인 경우) |
| authorName | string? | 작성자 이름 |
| authorType | enum | USER, ADMIN, API |
| isInternal | boolean | 내부 메모 여부 (true면 API에서 제외) |
| createdAt | datetime | 생성일시 |
| updatedAt | datetime | 수정일시 |
