import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canApplyPaymentTransition, verifyPaymentSignature } from "./payment-lifecycle";

describe("payment lifecycle", () => {
  it("allows only terminal payment outcomes from an initiated attempt", () => {
    expect(canApplyPaymentTransition("INITIATED", "PAID")).toBe(true);
    expect(canApplyPaymentTransition("INITIATED", "FAILED")).toBe(true);
    expect(canApplyPaymentTransition("PAID", "FAILED")).toBe(false);
  });

  it("verifies webhook signatures without accepting a mismatched signature", () => {
    const payload = JSON.stringify({ paymentAttemptId: "pay_1", status: "PAID" });
    const signature = createHmac("sha256", "local-test-secret").update(payload).digest("hex");
    expect(verifyPaymentSignature(payload, signature, "local-test-secret")).toBe(true);
    expect(verifyPaymentSignature(payload, `${signature}0`, "local-test-secret")).toBe(false);
  });
});
