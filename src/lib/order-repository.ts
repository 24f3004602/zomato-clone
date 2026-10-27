import type { CreateOrderInput, PricedOrder } from "./orders";
import { prisma } from "./db";
import { ORDER_CURRENCY } from "./money";

export type StoredOrder = {
  id: string;
  status: "confirmed";
  total: number;
  createdAt: string;
  userId?: string;
  restaurantId?: string;
};

type CreateInput = {
  userId: string;
  idempotencyKey: string;
  data: CreateOrderInput;
  priced?: PricedOrder;
};

export interface OrderRepository {
  findByIdempotencyKey(key: string): Promise<StoredOrder | null>;
  listForUser(userId: string): Promise<StoredOrder[]>;
  create(input: CreateInput): Promise<StoredOrder>;
}

const memoryOrders = new Map<string, StoredOrder>();

export class MemoryOrderRepository implements OrderRepository {
  async findByIdempotencyKey(key: string) {
    return memoryOrders.get(key) ?? null;
  }

  async listForUser(userId: string) {
    return [...memoryOrders.values()].filter((order) => order.userId === userId);
  }

  async create(input: CreateInput) {
    if (!input.priced) throw new Error("Pricing is required for memory order storage");
    const order = {
      id: `ord_${crypto.randomUUID()}`,
      status: "confirmed" as const,
      total: input.priced.total,
      createdAt: new Date().toISOString(),
      userId: input.userId,
      restaurantId: input.priced.restaurant.id,
    };
    memoryOrders.set(input.idempotencyKey, order);
    return order;
  }
}

export class PrismaOrderRepository implements OrderRepository {
  async findByIdempotencyKey(key: string) {
    const record = await prisma.orderIdempotency.findUnique({ where: { key }, include: { order: true } });
    return record ? toStoredOrder(record.order) : null;
  }

  async listForUser(userId: string) {
    const orders = await prisma.order.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return orders.map((order) => toStoredOrder(order));
  }

  async create(input: CreateInput) {
    try {
      const order = await prisma.$transaction(async (transaction) => {
        const restaurant = await transaction.restaurant.findUnique({ where: { id: input.data.restaurantId } });
        if (!restaurant) throw new Error("Restaurant not found");
        if (!restaurant.open) throw new Error("Restaurant is not accepting orders");

        const menu = await transaction.menuItem.findMany({
          where: {
            id: { in: input.data.lines.map((line) => line.itemId) },
            restaurantId: restaurant.id,
          },
        });
        const menuById = new Map(menu.map((item) => [item.id, item]));
        if (menu.length !== input.data.lines.length || input.data.lines.some((line) => !menuById.get(line.itemId)?.available)) {
          throw new Error("One or more menu items are unavailable");
        }

        for (const line of input.data.lines) {
          const reserved = await transaction.$executeRaw`
            UPDATE "MenuItem"
            SET "inventoryCount" = CASE WHEN "inventoryCount" IS NULL THEN NULL ELSE "inventoryCount" - ${line.quantity} END
            WHERE "id" = ${line.itemId}
              AND "restaurantId" = ${restaurant.id}
              AND "available" = true
              AND ("inventoryCount" IS NULL OR "inventoryCount" >= ${line.quantity})
          `;
          if (reserved !== 1) throw new Error("One or more menu items are unavailable");
        }

        const lines = input.data.lines.map((line) => {
          const item = menuById.get(line.itemId)!;
          return { id: item.id, name: item.name, price: item.price, quantity: line.quantity };
        });
        const subtotal = lines.reduce((total, line) => total + line.price * line.quantity, 0);
        const deliveryFee = subtotal >= 49900 ? 0 : restaurant.deliveryFee;
        const serviceFee = Math.round(subtotal * 5 / 100);
        const total = subtotal + deliveryFee + serviceFee;
        const user = await transaction.user.update({ where: { id: input.userId }, data: { name: input.data.customer.name } });
        const address = await transaction.address.create({
          data: { userId: user.id, label: "Delivery", line: input.data.customer.address },
        });
        const order = await transaction.order.create({
          data: {
            userId: user.id,
            restaurantId: restaurant.id,
            addressId: address.id,
            subtotal,
            deliveryFee,
            serviceFee,
            total,
            currency: ORDER_CURRENCY,
            notes: input.data.notes,
            items: {
              create: lines.map((line) => ({
                menuItemId: line.id,
                name: line.name,
                unitPrice: line.price,
                quantity: line.quantity,
                currency: ORDER_CURRENCY,
              })),
            },
          },
        });
        await transaction.orderIdempotency.create({ data: { key: input.idempotencyKey, orderId: order.id } });
        return order;
      });
      return toStoredOrder(order);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existing = await this.findByIdempotencyKey(input.idempotencyKey);
        if (existing) return existing;
      }
      throw error;
    }
  }
}

function toStoredOrder(order: { id: string; total: number; createdAt: Date; userId?: string | null; restaurantId?: string }) {
  return {
    id: order.id,
    status: "confirmed" as const,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    userId: order.userId ?? undefined,
    restaurantId: order.restaurantId,
  };
}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export function getOrderRepository(): OrderRepository {
  if (process.env.ORDER_STORE === "postgres") return new PrismaOrderRepository();
  if (process.env.NODE_ENV === "production") throw new Error("ORDER_STORE=postgres is required in production");
  return new MemoryOrderRepository();
}
