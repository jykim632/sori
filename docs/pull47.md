# PR #47 코드 리뷰 논의

## 1. TYPE_COLORS 상수 선언

### 현재 코드

```typescript
const TYPE_COLORS: Record<string, number> = {
  BUG: 0xef4444,
  FEATURE: 0x8b5cf6,
  INQUIRY: 0x3b82f6,
} as const;
```

### 문제점

`Record<string, number>` 타입 선언이 `as const`의 narrowing 효과를 덮어써서 `as const`가 무의미함.

### 검토한 옵션

1. **`as const satisfies` 사용**

   ```typescript
   const TYPE_COLORS = {
     BUG: 0xef4444,
     FEATURE: 0x8b5cf6,
     INQUIRY: 0x3b82f6,
   } as const satisfies Record<string, number>;
   ```

   - 타입 체크 + narrow 타입 유지
   - 단, `TYPE_COLORS[feedback.type]` 접근 시 에러 발생 (feedback.type이 string이므로)

2. **현재 방식 유지 (as const 제거)**
   ```typescript
   const TYPE_COLORS: Record<string, number> = {
     BUG: 0xef4444,
     FEATURE: 0x8b5cf6,
     INQUIRY: 0x3b82f6,
   };
   ```

### 결론

`feedback.type`이 `string` 타입이고 동적 키로 접근하므로 `Record<string, number>`가 적절. `as const`는 의미 없으니 제거하는 게 깔끔함.

---

## 2. discordFormatter 함수 길이 (20줄 규칙)

### 현재 상태

`format` 함수가 약 30줄이지만, 실제 로직은 3줄이고 나머지는 객체 구조 정의.

### 검토 결과

- 20줄 규칙의 취지: 복잡한 로직을 쪼개라는 것이지, 데이터 구조 정의를 쪼개라는 게 아님
- 가독성 저하: Discord embed 구조가 한눈에 안 보이고 흩어짐
- 과도한 추상화: 한 번만 쓰는 헬퍼 함수를 만드는 건 오버엔지니어링

### 결론

현재 코드가 "한 가지 일(Discord 포맷 생성)"을 하고, 로직도 단순하므로 그대로 유지.

---

## 3. getFormatter 스푸핑 문제

### 현재 코드

```typescript
export function getFormatter(webhookUrl: string): WebhookFormatter {
  const matched = formatters.find((config) =>
    webhookUrl.includes(config.pattern)
  );
  return matched?.formatter ?? genericFormatter;
}
```

### 제기된 문제

`includes`는 URL 어디에든 패턴이 있으면 매칭됨:

```
https://evil.com/hooks.slack.com/fake     → Slack으로 인식
https://hooks.slack.com.evil.com/webhook  → Slack으로 인식
```

### 검토 결과

1. Webhook URL은 관리자가 설정하는 값 (공격자가 임의 입력 불가)
2. 잘못된 formatter 선택 시 전송 실패할 뿐, 보안 취약점은 아님
3. 민감 데이터 유출 없음

### 방어적 코딩 옵션 (필요시)

```typescript
function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function getFormatter(webhookUrl: string): WebhookFormatter {
  const hostname = getHostname(webhookUrl);
  const matched = formatters.find((config) =>
    hostname?.endsWith(config.pattern)
  );
  return matched?.formatter ?? genericFormatter;
}
```

### 결론

신뢰된 사용자만 webhook URL을 설정하므로 현재 코드로 충분. 방어적 코딩은 이 맥락에서 오버엔지니어링.
