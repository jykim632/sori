import { serve } from "@hono/node-server";
import app from "./app";

const port = Number(process.env.PORT) || 3001;

console.log(`CDN server running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
