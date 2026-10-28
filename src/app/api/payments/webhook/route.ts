import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { canApplyPaymentTransition, hashPaymentPayload, paymentStatusFromCallback, verifyPaymentSignature } from "@/lib/payment-lifecycle";

const callbackSchema = z.object({
  providerEventId: z.string().min(1).max(200),
  paymentAttemptId: z.string().min(1).max(100),
  status: z.enum(["PAID", "FAILED"]),
});

export async function POST(request: Request) {
  const signature = request.headers.get("x-payment-signature");
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Payment webhook is not configured" }, { status: 503 });

  const payload = await request.text();
  if (!verifyPaymentSignature(payload, signature, secret)) {
    return NextResponse.json({ error: "Invalid payment signature" }, { status: 401 });
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = callbackSchema.safeParse(parsedPayload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment event", details: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const existingEvent = await transaction.paymentEvent.findUnique({ where: { providerEventId: parsed.data.providerEventId } });
      if (existingEvent) return { duplicate: true as const };

      const payment = await transaction.paymentAttempt.findUnique({ where: { id: parsed.data.paymentAttemptId } });
      if (!payment) throw new Error("Payment attempt not found");
      const nextStatus = paymentStatusFromCallback(parsed.data.status);
      if (!canApplyPaymentTransition(payment.status, nextStatus)) throw new Error(`Cannot move payment from ${payment.status} to ${nextStatus}`);

      await transaction.paymentEvent.create({
        data: {
          providerEventId: parsed.data.providerEventId,
          paymentAttemptId: payment.id,
          eventType: parsed.data.status,
          payloadHash: hashPaymentPayload(payload),
          appliedAt: new Date(),
        },
      });
      await transaction.paymentAttempt.update({ where: { id: payment.id }, data: { status: nextStatus } });
      await transaction.auditLog.create({
        data: {
          action: "payment.status_changed",
          entityType: "PaymentAttempt",
          entityId: payment.id,
          metadata: { from: payment.status, to: nextStatus, providerEventId: parsed.data.providerEventId },
        },
      });
      return { duplicate: false as const, status: nextStatus };
    });

    return result.duplicate
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json({ data: { status: result.status } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to apply payment event" }, { status: 409 });
  }
}
