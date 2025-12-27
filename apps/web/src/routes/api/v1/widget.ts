import { createFileRoute } from "@tanstack/react-router";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

let cachedWidget: string | null = null;

function getWidgetScript(): string {
  // 개발 모드에서는 캐시 비활성화
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev && cachedWidget) return cachedWidget;

  // 여러 경로 시도
  const possiblePaths = [
    // 모노레포 루트에서 실행될 때
    resolve(process.cwd(), "packages/core/dist/cdn.js"),
    // apps/web에서 실행될 때
    resolve(process.cwd(), "../../packages/core/dist/cdn.js"),
    // 현재 파일 기준
    resolve(process.cwd(), "../../../packages/core/dist/cdn.js"),
  ];

  for (const widgetPath of possiblePaths) {
    try {
      const script = readFileSync(widgetPath, "utf-8");
      if (!isDev) cachedWidget = script;
      return script;
    } catch {
      // 다음 경로 시도
    }
  }

  console.error("Failed to load widget script from any path:", possiblePaths);
  return `console.error("Sori Widget: Failed to load widget script");`;
}

export const Route = createFileRoute("/api/v1/widget")({
  server: {
    handlers: {
      GET: async () => {
        const script = getWidgetScript();

        return new Response(script, {
          status: 200,
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
