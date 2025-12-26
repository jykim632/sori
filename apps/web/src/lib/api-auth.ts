import { getProjectByApiKey } from "@sori/database";
import type { Project } from "@sori/database";

// ============================================
// API 인증 유틸리티
// ============================================

export type ApiAuthSuccess = {
  success: true;
  project: Project;
};

export type ApiAuthError = {
  success: false;
  error: string;
  status: number;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthError;

export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  // 1. Authorization 헤더 확인
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return { success: false, error: "Missing Authorization header", status: 401 };
  }

  // 2. Bearer 토큰 파싱
  if (!authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Invalid Authorization format. Use 'Bearer {API_KEY}'",
      status: 401,
    };
  }

  const apiKey = authHeader.slice(7).trim();

  if (!apiKey) {
    return { success: false, error: "API key is empty", status: 401 };
  }

  // 3. API 키 유효성 검사 (형식)
  if (!apiKey.startsWith("sk_live_")) {
    return { success: false, error: "Invalid API key format", status: 401 };
  }

  // 4. 프로젝트 조회
  try {
    const project = await getProjectByApiKey(apiKey);

    if (!project) {
      return { success: false, error: "Invalid API key", status: 401 };
    }

    return { success: true, project };
  } catch (error) {
    console.error("API authentication error:", error);
    return { success: false, error: "Authentication failed", status: 500 };
  }
}

// ============================================
// 응답 헬퍼
// ============================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function apiError(
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: {
        message,
        status,
        ...details,
      },
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    }
  );
}

export function apiSuccess<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

// OPTIONS preflight 응답
export function apiOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
