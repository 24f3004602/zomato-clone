import { z } from "zod";
import { menuItems, restaurants, type CartLine, type Restaurant } from "./domain";
import { ORDER_CURRENCY } from "./money";

export const createOrderSchema = z.object({
  restaurantId: z.string().min(1),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().regex(/^\+?[0-9 ()-]{7,20}$/),
    address: z.string().trim().min(8).max(240),
  }),
  lines: z.array(z.object({
    itemId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
  })).min(1).max(50).superRefine((lines, context) => {
    const itemIds = new Set<string>();
    lines.forEach((line, index) => {
      if (itemIds.has(line.itemId)) {
        context.addIssue({ code: "custom", path: [index, "itemId"], message: "Duplicate menu item" });
      }
      itemIds.add(line.itemId);
    });
  }),
  notes: z.string().trim().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PricedOrder = { restaurant: Restaurant; lines: CartLine[]; subtotal: number; deliveryFee: number; serviceFee: number; total: number; currency: typeof ORDER_CURRENCY };

export function calculateOrderTotals(subtotal: number, deliveryFee: number) {
  const serviceFee = Math.round(subtotal * 5 / 100);
  return { subtotal, deliveryFee: subtotal >= 49900 ? 0 : deliveryFee, serviceFee, total: subtotal + (subtotal >= 49900 ? 0 : deliveryFee) + serviceFee };
}

export function reserveInventory(stock: number | null, quantity: number) {
  if (stock === null) return { success: true, remaining: null };
  if (stock < quantity) return { success: false, remaining: stock };
  return { success: true, remaining: stock - quantity };
}

export function priceOrder(input: CreateOrderInput) {
  const restaurant = restaurants.find((item) => item.id === input.restaurantId);
  if (!restaurant) throw new Error("Restaurant not found");
  if (!restaurant.open) throw new Error("Restaurant is not accepting orders");

  const pricedLines: CartLine[] = input.lines.map((line) => {
    const item = menuItems.find((candidate) => candidate.id === line.itemId && candidate.restaurantId === input.restaurantId);
    if (!item || item.available === false) throw new Error("One or more menu items are unavailable");
    return { ...item, quantity: line.quantity };
  });
  const subtotal = pricedLines.reduce((total, line) => total + line.price * line.quantity, 0);
  return { restaurant, lines: pricedLines, ...calculateOrderTotals(subtotal, restaurant.deliveryFee), currency: ORDER_CURRENCY as typeof ORDER_CURRENCY };
}
