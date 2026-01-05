import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    return await auth.api.getSession({ headers: request.headers });
  }
);

export const requireAuth = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      throw new AppError("AUTH_UNAUTHORIZED");
    }

    return session;
  }
);
