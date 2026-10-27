import { describe, expect, it } from "vitest";
import { hasDeliveryRole, hasPartnerRole, validateAuthConfiguration } from "./auth";
import { canManageRestaurant } from "./partner";

describe("authentication configuration", () => {
  it("rejects development auth outside development mode", () => {
    expect(() => validateAuthConfiguration({
      AUTH_PROVIDER: "development",
      ENABLE_DEV_AUTH: "true",
      NODE_ENV: "production",
    })).toThrow("requires NODE_ENV=development");
  });

  it("requires explicit development auth opt-in", () => {
    expect(() => validateAuthConfiguration({
      AUTH_PROVIDER: "development",
      NODE_ENV: "development",
      ENABLE_DEV_AUTH: "false",
    })).toThrow("ENABLE_DEV_AUTH=true");
  });

  it("rejects public development URLs", () => {
    expect(() => validateAuthConfiguration({
      AUTH_PROVIDER: "development",
      ENABLE_DEV_AUTH: "true",
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "https://tabletrail.example",
    })).toThrow("localhost");
  });

  it("allows explicitly opted-in localhost development auth", () => {
    expect(() => validateAuthConfiguration({
      AUTH_PROVIDER: "development",
      ENABLE_DEV_AUTH: "true",
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      HOST: "127.0.0.1",
    })).not.toThrow();
  });

  it("does not grant customer access to privileged role guards", () => {
    expect(hasPartnerRole({ role: "CUSTOMER" })).toBe(false);
    expect(hasDeliveryRole({ role: "CUSTOMER" })).toBe(false);
  });

  it("does not let a partner manage another partner's restaurant", () => {
    expect(canManageRestaurant({ id: "partner-a", role: "PARTNER" }, "partner-b")).toBe(false);
    expect(canManageRestaurant({ id: "partner-a", role: "PARTNER" }, "partner-a")).toBe(true);
    expect(canManageRestaurant({ id: "admin", role: "ADMIN" }, "partner-b")).toBe(true);
  });
});
