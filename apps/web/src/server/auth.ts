import { createServerFn } from "@tanstack/react-start";
import { getCachedSession } from "@/lib/session-cache";
import { AppError } from "@/lib/errors";

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return await getCachedSession();
  }
);

export const requireAuth = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getCachedSession();

    if (!session) {
      throw new AppError("AUTH_UNAUTHORIZED");
    }

    return session;
  }
);
