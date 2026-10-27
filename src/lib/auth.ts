import { createHash, randomInt, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { getSmsProvider } from "./providers";

const SESSION_COOKIE = "tabletrail_session";
const OTP_TTL_MS = 5 * 60 * 1000;
export type AuthRole = "CUSTOMER" | "PARTNER" | "ADMIN" | "DELIVERY";
type AuthUser = { id: string; name: string; phone: string | null; role: AuthRole };
type PartnerUser = Omit<AuthUser, "role"> & { role: "PARTNER" | "ADMIN" };
type DeliveryUser = Omit<AuthUser, "role"> & { role: "DELIVERY" | "ADMIN" };
type AdminUser = Omit<AuthUser, "role"> & { role: "ADMIN" };
const developmentUsers = new Map<string, AuthUser>();
const developmentSessions = new Map<string, { userId: string; expiresAt: Date }>();

const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function validateAuthConfiguration(env: NodeJS.ProcessEnv = process.env) {
  if (env.AUTH_PROVIDER !== "development") return;
  if (env.NODE_ENV !== "development") {
    throw new Error("AUTH_PROVIDER=development requires NODE_ENV=development");
  }
  if (env.ENABLE_DEV_AUTH !== "true") {
    throw new Error("Development authentication is disabled; set ENABLE_DEV_AUTH=true only for local testing");
  }
  for (const configuredHost of [env.HOST, env.APP_HOST].filter(Boolean)) {
    if (!localHosts.has(configuredHost!.replace(/^\[|\]$/g, ""))) {
      throw new Error("Development authentication may only bind to a local host");
    }
  }
  if (env.NEXT_PUBLIC_APP_URL) {
    let hostname: string;
    try {
      hostname = new URL(env.NEXT_PUBLIC_APP_URL).hostname;
    } catch {
      throw new Error("NEXT_PUBLIC_APP_URL must be a valid URL");
    }
    if (!localHosts.has(hostname)) {
      throw new Error("Development authentication requires a localhost application URL");
    }
  }
}

validateAuthConfiguration();

export function hasPartnerRole(user: Pick<AuthUser, "role"> | null): user is Pick<AuthUser, "role"> & { role: "PARTNER" | "ADMIN" } {
  return user?.role === "PARTNER" || user?.role === "ADMIN";
}

export function hasDeliveryRole(user: Pick<AuthUser, "role"> | null): user is Pick<AuthUser, "role"> & { role: "DELIVERY" | "ADMIN" } {
  return user?.role === "DELIVERY" || user?.role === "ADMIN";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizePhone(phone: string) {
  return phone.replace(/[ ()-]/g, "");
}

export async function requestOtp(phone: string) {
  const normalized = normalizePhone(phone);
  const code = String(randomInt(100000, 1000000));
  
  if (process.env.AUTH_PROVIDER === "development") {
    return { phone: normalized, code, expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString() };
  }
  
  if (process.env.AUTH_PROVIDER !== "postgres") {
    throw new Error("AUTH_PROVIDER must be configured before enabling authentication");
  }
  
  // Store OTP challenge
  await prisma.otpChallenge.create({ 
    data: { 
      phone: normalized, 
      codeHash: hash(code), 
      expiresAt: new Date(Date.now() + OTP_TTL_MS) 
    } 
  });
  
  // Send SMS via provider (Fire and forget—don't block response)
  try {
    const smsProvider = getSmsProvider();
    await smsProvider.sendOtp({ phone: normalized, code });
  } catch (error) {
    console.error("Failed to send OTP SMS:", error);
    // In production, log to error tracking service (Sentry, DataDog, etc.)
    // Continue anyway—customer will retry if SMS doesn't arrive
  }
  
  return { phone: normalized, expiresAt: new Date(Date.now() + OTP_TTL_MS).toISOString() };
}

export async function verifyOtp(phone: string, code: string) {
  const normalized = normalizePhone(phone);
  if (process.env.AUTH_PROVIDER === "development") {
    if (!/^\d{6}$/.test(code)) throw new Error("Invalid verification code");
    return createSession(normalized);
  }
  if (process.env.AUTH_PROVIDER !== "postgres") throw new Error("AUTH_PROVIDER must be configured before enabling authentication");
  const challenge = await prisma.otpChallenge.findFirst({ where: { phone: normalized, codeHash: hash(code), consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!challenge) throw new Error("Invalid or expired verification code");
  await prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
  return createSession(normalized);
}

async function createSession(phone: string) {
  const user = process.env.AUTH_PROVIDER === "postgres"
    ? await prisma.user.upsert({ where: { phone }, update: {}, create: { phone, name: "New customer" } })
    : { id: `dev_${hash(phone).slice(0, 16)}`, phone, name: "Development customer", role: "CUSTOMER" };
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  if (process.env.AUTH_PROVIDER === "postgres") await prisma.session.create({ data: { id: sessionId, userId: user.id, expiresAt } });
  else {
    developmentUsers.set(user.id, { id: user.id, name: user.name, phone: user.phone ?? phone, role: "CUSTOMER" });
    developmentSessions.set(sessionId, { userId: user.id, expiresAt });
  }
  (await cookies()).set(SESSION_COOKIE, sessionId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", expires: expiresAt, path: "/" });
  return { id: user.id, name: user.name, phone: user.phone, role: user.role };
}

export async function currentUser(): Promise<AuthUser | null> {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  if (process.env.AUTH_PROVIDER === "development") {
    const session = developmentSessions.get(sessionId);
    if (!session || session.expiresAt <= new Date()) return null;
    return developmentUsers.get(session.userId) ?? null;
  }

  if (process.env.AUTH_PROVIDER !== "postgres") return null;
  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
}

export async function currentPartner(): Promise<PartnerUser | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!hasPartnerRole(user)) return null;
  return { ...user, role: user.role };
}

export async function currentDelivery(): Promise<DeliveryUser | null> {
  const user = await currentUser();
  if (!user) return null;
  if (!hasDeliveryRole(user)) return null;
  return { ...user, role: user.role };
}

export async function currentAdmin(): Promise<AdminUser | null> {
  const user = await currentUser();
  if (!user || process.env.AUTH_PROVIDER !== "postgres" || user.role !== "ADMIN") return null;
  return { ...user, role: "ADMIN" };
}
