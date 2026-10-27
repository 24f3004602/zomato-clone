import { prisma } from "./db";

export async function recordAudit(input: {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  if (process.env.AUTH_PROVIDER !== "postgres") return;
  await prisma.auditLog.create({ data: input });
}
