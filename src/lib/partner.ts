import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { currentPartner, hasPartnerRole } from "./auth";
import type { AuthRole } from "./auth";
import { restaurants, menuItems } from "./domain";

const developmentRestaurant = { ...restaurants[0] };
const developmentMenuItems = menuItems.filter((item) => item.restaurantId === developmentRestaurant.id).map((item) => ({ ...item, available: true }));

export async function partnerRestaurant() {
  const partner = await currentPartner();
  if (!partner) return null;
  if (process.env.AUTH_PROVIDER !== "postgres") return null;
  const restaurant = partner.role === "ADMIN"
    ? await prisma.restaurant.findFirst({ include: { menuItems: true } })
    : await prisma.restaurant.findFirst({ where: { ownerId: partner.id }, include: { menuItems: true } });
  return restaurant ? { partner, restaurant, items: restaurant.menuItems } : null;
}

export function canManageRestaurant(user: { id: string; role: AuthRole } | null, ownerId: string | null) {
  return Boolean(user && hasPartnerRole(user) && (user.role === "ADMIN" || ownerId === user.id));
}

export async function partnerOrderQueue() {
  const context = await partnerRestaurant();
  if (!context) return null;
  const orders = await prisma.order.findMany({
    where: { restaurantId: context.restaurant.id, status: { in: ["CONFIRMED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP"] } },
    include: { items: true, address: true },
    orderBy: { createdAt: "asc" },
  });
  return { ...context, orders };
}

export function nextOrderStatus(status: string) {
  const transitions: Record<string, string> = { CONFIRMED: "ACCEPTED", ACCEPTED: "PREPARING", PREPARING: "READY_FOR_PICKUP" };
  return transitions[status];
}

export function developmentMenuItem(input: { restaurantId: string; category: string; name: string; description: string; price: number; vegetarian: boolean }) {
  const item = { id: `dev_item_${randomUUID()}`, ...input, available: true };
  developmentMenuItems.push(item);
  return item;
}

export function updateDevelopmentMenuItem(id: string, updates: { available?: boolean; price?: number }) {
  const item = developmentMenuItems.find((candidate) => candidate.id === id);
  if (!item) return null;
  if (updates.available !== undefined) item.available = updates.available;
  if (updates.price !== undefined) item.price = updates.price;
  return item;
}

export function updateDevelopmentRestaurant(updates: { name?: string; description?: string; open?: boolean }) {
  Object.assign(developmentRestaurant, updates);
  return developmentRestaurant;
}
