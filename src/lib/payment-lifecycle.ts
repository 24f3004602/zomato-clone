import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "@prisma/client";

export type PaymentCallback = {
  providerEventId: string;
  paymentAttemptId: string;
  status: "PAID" | "FAILED";
};

export function hashPaymentPayload(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}

export function verifyPaymentSignature(payload: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const provided = Buffer.from(signature, "utf8");
  const actual = Buffer.from(expected, "utf8");
  return provided.length === actual.length && timingSafeEqual(provided, actual);
}

export function canApplyPaymentTransition(current: PaymentStatus, next: PaymentStatus) {
  if (current === next) return true;
  if (current === "INITIATED") return next === "PAID" || next === "FAILED";
  if (current === "PAID") return next === "REFUND_PENDING";
  if (current === "REFUND_PENDING") return next === "REFUNDED" || next === "REFUND_FAILED";
  return false;
}

export function paymentStatusFromCallback(status: PaymentCallback["status"]): PaymentStatus {
  return status === "PAID" ? "PAID" : "FAILED";
}
