import { prisma } from "@/lib/db";

/**
 * Test Fixtures
 *
 * Shared test data and setup helpers for integration tests.
 * All fixtures must be cleaned up in afterAll hooks to prevent data pollution.
 */

export const testFixtures = {
  /**
   * Create a test restaurant
   */
  async createTestRestaurant(overrides?: Partial<Parameters<typeof prisma.restaurant.create>[0]["data"]>) {
    return prisma.restaurant.create({
      data: {
        id: `restaurant_${Date.now()}`,
        name: "Test Restaurant",
        rating: 4.5,
        reviewCount: 100,
        deliveryMinutes: 30,
        deliveryFee: 5000,
        priceForTwo: 50000,
        open: true,
        ...overrides,
      },
    });
  },

  /**
   * Create a test customer user
   */
  async createTestCustomer(overrides?: Partial<Parameters<typeof prisma.user.create>[0]["data"]>) {
    return prisma.user.create({
      data: {
        id: `customer_${Date.now()}`,
        phone: `+91-cust-${Date.now()}`,
        name: "Test Customer",
        role: "CUSTOMER",
        ...overrides,
      },
    });
  },

  /**
   * Create a test delivery partner user
   */
  async createTestDeliveryPartner(
    index?: number,
    overrides?: Partial<Parameters<typeof prisma.user.create>[0]["data"]>
  ) {
    const idx = index ?? Date.now();
    return prisma.user.create({
      data: {
        id: `delivery_${idx}`,
        phone: `+91-delivery-${idx}`,
        name: `Delivery Partner ${idx}`,
        role: "DELIVERY",
        ...overrides,
      },
    });
  },

  /**
   * Create a test partner user (restaurant owner)
   */
  async createTestPartner(overrides?: Partial<Parameters<typeof prisma.user.create>[0]["data"]>) {
    return prisma.user.create({
      data: {
        id: `partner_${Date.now()}`,
        phone: `+91-partner-${Date.now()}`,
        name: "Test Partner",
        role: "PARTNER",
        ...overrides,
      },
    });
  },

  /**
   * Create a test admin user
   */
  async createTestAdmin(overrides?: Partial<Parameters<typeof prisma.user.create>[0]["data"]>) {
    return prisma.user.create({
      data: {
        id: `admin_${Date.now()}`,
        phone: `+91-admin-${Date.now()}`,
        name: "Test Admin",
        role: "ADMIN",
        ...overrides,
      },
    });
  },

  /**
   * Create multiple test delivery partners
   */
  async createDeliveryPartners(count: number) {
    return Promise.all(Array.from({ length: count }, (_, i) => this.createTestDeliveryPartner(i)));
  },

  /**
   * Create a test order
   */
  async createTestOrder(
    restaurantId: string,
    customerId: string,
    overrides?: Partial<Parameters<typeof prisma.order.create>[0]["data"]>
  ) {
    return prisma.order.create({
      data: {
        restaurantId,
        userId: customerId,
        status: "CONFIRMED",
        subtotal: 50000,
        deliveryFee: 5000,
        serviceFee: 2500,
        total: 57500,
        currency: "INR",
        ...overrides,
      },
    });
  },

  /**
   * Create a test menu item
   */
  async createTestMenuItem(
    restaurantId: string,
    overrides?: Partial<Parameters<typeof prisma.menuItem.create>[0]["data"]>
  ) {
    return prisma.menuItem.create({
      data: {
        id: `item_${Date.now()}`,
        restaurantId,
        category: "Main",
        name: "Test Dish",
        description: "A test dish for testing",
        price: 25000,
        available: true,
        ...overrides,
      },
    });
  },

  /**
   * Create a session for a user (for testing authenticated endpoints)
   */
  async createTestSession(userId: string) {
    return prisma.session.create({
      data: {
        id: `session_${Date.now()}`,
        userId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  },

  /**
   * Create an OTP challenge for testing authentication
   */
  async createTestOtpChallenge(phone: string, code: string = "123456") {
    const crypto = await import("node:crypto");
    const hash = crypto.createHash("sha256").update(code).digest("hex");
    return prisma.otpChallenge.create({
      data: {
        phone,
        codeHash: hash,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });
  },

  /**
   * Get or create a test restaurant with menu items
   */
  async getOrCreateRestaurantWithMenu(itemCount: number = 3) {
    const restaurant = await this.createTestRestaurant();
    const items = await Promise.all(
      Array.from({ length: itemCount }, (_, i) =>
        this.createTestMenuItem(restaurant.id, {
          id: `${restaurant.id}_item_${i}`,
          name: `Item ${i}`,
          price: 10000 + i * 5000,
        })
      )
    );
    return { restaurant, items };
  },

  /**
   * Clean up a user and all related data
   */
  async cleanupUser(userId: string) {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { userId } });
    await prisma.order.deleteMany({ where: { deliveryPartnerId: userId } });
    await prisma.user.delete({ where: { id: userId } });
  },

  /**
   * Clean up a restaurant and all related data
   */
  async cleanupRestaurant(restaurantId: string) {
    await prisma.order.deleteMany({ where: { restaurantId } });
    await prisma.menuItem.deleteMany({ where: { restaurantId } });
    await prisma.restaurant.delete({ where: { id: restaurantId } });
  },
};
