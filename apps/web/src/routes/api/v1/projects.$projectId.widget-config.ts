import { createFileRoute } from "@tanstack/react-router";
import { getProjectById } from "@sori/database";

// CORS 헤더 (위젯은 어디서든 설정을 가져올 수 있어야 함)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60", // 1분 캐시
};

export const Route = createFileRoute("/api/v1/projects/$projectId/widget-config")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { projectId } = params;

          if (!projectId) {
            return new Response(
              JSON.stringify({ error: "Project ID is required" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          const project = await getProjectById(projectId);

          if (!project) {
            return new Response(
              JSON.stringify({ error: "Project not found" }),
              {
                status: 404,
                headers: { "Content-Type": "application/json", ...CORS_HEADERS },
              }
            );
          }

          // widgetConfig만 반환 (민감한 정보 제외)
          const widgetConfig = project.widgetConfig || null;

          return new Response(
            JSON.stringify({
              projectId: project.id,
              config: widgetConfig,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            }
          );
        } catch (error) {
          console.error("Widget config fetch error:", error);
          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json", ...CORS_HEADERS },
            }
          );
        }
      },
      OPTIONS: async () => {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      },
    },
  },
});
