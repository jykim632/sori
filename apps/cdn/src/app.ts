import { Hono } from "hono";
import { widget } from "./widget";

const app = new Hono();

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "sori-cdn" }));

// Widget script
app.get("/widget.js", widget);

export default app;
