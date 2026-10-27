import { describe, expect, it } from "vitest";
import { menuItems, searchRestaurants } from "./domain";
import { createOrderSchema, priceOrder, reserveInventory } from "./orders";

describe("restaurant discovery", () => {
  it("finds restaurants by menu item", () => {
    expect(searchRestaurants("biryani").length).toBe(0);
    expect(searchRestaurants("ramen").map((restaurant) => restaurant.id)).toContain("tokyo-table");
  });

  it("applies vegetarian and open filters", () => {
    expect(searchRestaurants("", { vegetarian: true }).every((restaurant) => restaurant.vegetarian)).toBe(true);
    expect(searchRestaurants("", { open: true }).every((restaurant) => restaurant.open)).toBe(true);
  });

  it("prices a valid order and applies free delivery over the threshold", () => {
    const priced = priceOrder({
      restaurantId: "pepper-bloom",
      customer: { name: "Asha Rao", phone: "+919999999999", address: "12 Market Street, Bengaluru" },
      lines: [{ itemId: "pb-bowl", quantity: 2 }],
    });
    expect(priced.subtotal).toBe(57800);
    expect(priced.deliveryFee).toBe(0);
    expect(priced.total).toBe(60690);
  });

  it("rejects duplicate menu lines at the request boundary", () => {
    expect(createOrderSchema.safeParse({
      restaurantId: "pepper-bloom",
      customer: { name: "Asha Rao", phone: "+919999999999", address: "12 Market Street, Bengaluru" },
      lines: [{ itemId: "pb-bowl", quantity: 1 }, { itemId: "pb-bowl", quantity: 1 }],
    }).success).toBe(false);
  });

  it("uses the current catalogue price instead of a stale cart price", () => {
    const priced = priceOrder({
      restaurantId: "pepper-bloom",
      customer: { name: "Asha Rao", phone: "+919999999999", address: "12 Market Street, Bengaluru" },
      lines: [{ itemId: "pb-bowl", quantity: 1 }],
    });
    expect(priced.lines[0].price).toBe(28900);
  });

  it("rejects an item that became unavailable before checkout", () => {
    const item = menuItems.find((candidate) => candidate.id === "pb-bowl")!;
    item.available = false;
    try {
      expect(() => priceOrder({
        restaurantId: "pepper-bloom",
        customer: { name: "Asha Rao", phone: "+919999999999", address: "12 Market Street, Bengaluru" },
        lines: [{ itemId: "pb-bowl", quantity: 1 }],
      })).toThrow("unavailable");
    } finally {
      item.available = undefined;
    }
  });

  it("does not accept client-supplied totals", () => {
    const parsed = createOrderSchema.parse({
      restaurantId: "pepper-bloom",
      customer: { name: "Asha Rao", phone: "+919999999999", address: "12 Market Street, Bengaluru" },
      lines: [{ itemId: "pb-bowl", quantity: 1 }],
      total: 1,
    });
    expect("total" in parsed).toBe(false);
  });

  it("allows exactly one claimant to reserve the last unit", async () => {
    let stock: number | null = 1;
    const claims = await Promise.all([1, 2].map(async () => {
      const result = reserveInventory(stock, 1);
      if (result.success) stock = result.remaining;
      return result.success;
    }));
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(stock).toBe(0);
  });
});
