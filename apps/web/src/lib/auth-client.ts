import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
  if (import.meta.env.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL;
  }
  return typeof window !== "undefined" ? window.location.origin : "";
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signUp, signOut, useSession } = authClient;
