import { z } from "zod";

// User
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  termsAgreedAt: z.coerce.date().nullable(),
  privacyAgreedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Session
export const SessionSchema = z.object({
  id: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Account
export const AccountSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  providerId: z.string(),
  userId: z.string(),
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  idToken: z.string().nullable(),
  accessTokenExpiresAt: z.coerce.date().nullable(),
  refreshTokenExpiresAt: z.coerce.date().nullable(),
  scope: z.string().nullable(),
  password: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Verification
export const VerificationSchema = z.object({
  id: z.string(),
  identifier: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
