import { createHmac } from "node:crypto";

// ============================================
// PAYMENT PROVIDER INTERFACE
// ============================================
export interface PaymentProvider {
  createCheckout(input: { orderId: string; amountInPaise: number; customerEmail?: string }): Promise<{ checkoutUrl: string; providerReference: string }>;
  verifyWebhook(payload: string, signature: string): Promise<{ orderId: string; status: "paid" | "failed" }>;
}

// ============================================
// SMS/NOTIFICATION PROVIDER INTERFACE
// ============================================
export interface NotificationProvider {
  send(input: { recipient: string; subject: string; body: string }): Promise<{ accepted: boolean; providerReference?: string }>;
}

export interface SmsProvider {
  sendOtp(input: { phone: string; code: string }): Promise<{ accepted: boolean; providerReference?: string }>;
  sendNotification(input: { phone: string; message: string }): Promise<{ accepted: boolean; providerReference?: string }>;
}

// ============================================
// MAPS PROVIDER INTERFACE
// ============================================
export interface MapsProvider {
  geocode(address: string): Promise<{ latitude: number; longitude: number; label: string }>;
  estimateDelivery(input: { restaurantId: string; latitude: number; longitude: number }): Promise<{ minutes: number; distanceKm: number }>;
}

// ============================================
// TEST PAYMENT PROVIDER (Development Only)
// ============================================
export class TestPaymentProvider implements PaymentProvider {
  async createCheckout(input: { orderId: string; amountInPaise: number }) {
    return { checkoutUrl: `/checkout/success?order=${encodeURIComponent(input.orderId)}`, providerReference: `test_${input.orderId}` };
  }

  async verifyWebhook(payload: string) {
    const parsed = JSON.parse(payload) as { orderId: string; status: "paid" | "failed" };
    return parsed;
  }
}

// ============================================
// RAZORPAY PAYMENT PROVIDER (Production)
// ============================================
export class RazorpayProvider implements PaymentProvider {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.PAYMENT_SECRET?.split(":")[0] || "";
    this.keySecret = process.env.PAYMENT_SECRET?.split(":")[1] || "";
    if (!this.keyId || !this.keySecret) {
      throw new Error("PAYMENT_SECRET must be set as KEY_ID:KEY_SECRET for Razorpay");
    }
  }

  async createCheckout(input: { orderId: string; amountInPaise: number; customerEmail?: string }) {
    // In production: call Razorpay API to create order
    // For now: return mock checkout URL that includes order details
    // Real implementation: POST https://api.razorpay.com/v1/orders with amount, currency, receipt, etc.
    
    const checkoutUrl = `https://checkout.razorpay.com/?key_id=${this.keyId}&order_id=${input.orderId}&amount=${input.amountInPaise}`;
    return { checkoutUrl, providerReference: `rzp_${input.orderId}` };
  }

  async verifyWebhook(payload: string, signature: string): Promise<{ orderId: string; status: "paid" | "failed" }> {
    // In production: verify webhook signature using HMAC
    try {
      const parsed = JSON.parse(payload) as { order_id?: string; payment?: { status?: string }; event?: string };
      
      // Verify signature
      const hash = createHmac("sha256", this.keySecret).update(payload).digest("hex");
      if (hash !== signature) {
        throw new Error("Invalid webhook signature");
      }

      // Map Razorpay statuses to our enum
      const status: "paid" | "failed" = parsed.payment?.status === "captured" ? "paid" : "failed";
      const orderId = parsed.order_id || "";

      if (!orderId) throw new Error("Missing order_id in webhook");

      return { orderId, status };
    } catch (error) {
      throw new Error(`Razorpay webhook verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

// ============================================
// FAST2SMS PROVIDER (OTP Delivery)
// ============================================
export class Fast2SmsProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;

  constructor() {
    this.apiKey = process.env.SMS_API_KEY || "";
    this.senderId = process.env.SMS_SENDER_ID || "TABLETRAIL";
    if (!this.apiKey) {
      throw new Error("SMS_API_KEY environment variable must be set for Fast2SMS");
    }
  }

  async sendOtp(input: { phone: string; code: string }) {
    try {
      const message = `Your TableTrail OTP is: ${input.code}. Valid for 5 minutes. Never share this code.`;
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          route: "otp",
          message,
          numbers: input.phone.replace(/^\+/, ""), // Fast2SMS expects phone without + prefix
          sender_id: this.senderId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Fast2SMS API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { return: boolean; request_id?: string };
      if (!data.return) {
        throw new Error("Fast2SMS returned false");
      }

      return { accepted: true, providerReference: data.request_id };
    } catch (error) {
      console.error("Fast2SMS OTP send failed:", error);
      throw error;
    }
  }

  async sendNotification(input: { phone: string; message: string }) {
    try {
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          route: "transactional",
          message: input.message,
          numbers: input.phone.replace(/^\+/, ""),
          sender_id: this.senderId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Fast2SMS API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { return: boolean; request_id?: string };
      if (!data.return) {
        throw new Error("Fast2SMS returned false");
      }

      return { accepted: true, providerReference: data.request_id };
    } catch (error) {
      console.error("Fast2SMS notification send failed:", error);
      throw error;
    }
  }
}

// ============================================
// LOG SMS PROVIDER (Development Only)
// ============================================
export class LogSmsProvider implements SmsProvider {
  async sendOtp(input: { phone: string; code: string }) {
    console.log(`[SMS OTP] Phone: ${input.phone}, Code: ${input.code}`);
    return { accepted: true, providerReference: `log_${Date.now()}` };
  }

  async sendNotification(input: { phone: string; message: string }) {
    console.log(`[SMS] Phone: ${input.phone}, Message: ${input.message}`);
    return { accepted: true, providerReference: `log_${Date.now()}` };
  }
}

// ============================================
// MOCK MAPS PROVIDER (Development Only)
// ============================================
export class MockMapsProvider implements MapsProvider {
  async geocode(address: string) {
    // Mock: return coordinates for Bangalore center
    return { latitude: 12.9716, longitude: 77.5946, label: address };
  }

  async estimateDelivery(input: { restaurantId: string; latitude: number; longitude: number }) {
    // Mock: return fixed delivery time
    return { minutes: 30, distanceKm: 5 };
  }
}

// ============================================
// MAPBOX PROVIDER (Real Maps API)
// ============================================
export class MapboxProvider implements MapsProvider {
  private token: string;

  constructor() {
    this.token = process.env.MAPS_API_KEY || "";
    if (!this.token) {
      throw new Error("MAPS_API_KEY environment variable must be set for Mapbox");
    }
  }

  async geocode(address: string) {
    try {
      const encoded = encodeURIComponent(address);
      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${this.token}`);
      const data = (await response.json()) as { features?: Array<{ center?: [number, number]; place_name?: string }> };

      if (!data.features || data.features.length === 0) {
        throw new Error("Address not found");
      }

      const [longitude, latitude] = data.features[0].center || [77.5946, 12.9716];
      return { latitude, longitude, label: data.features[0].place_name || address };
    } catch (error) {
      console.error("Mapbox geocoding failed:", error);
      throw error;
    }
  }

  async estimateDelivery(input: { restaurantId: string; latitude: number; longitude: number }) {
    try {
      // For now: return mock ETA based on distance
      // Real implementation: use Mapbox Directions API to get actual routing distance & time
      const distance = Math.random() * 10; // Mock: 0-10 km
      const minutes = Math.ceil(distance * 2 + 5); // Mock: ~2 min per km + 5 min prep
      return { minutes, distanceKm: distance };
    } catch (error) {
      console.error("Mapbox ETA estimation failed:", error);
      throw error;
    }
  }
}

// ============================================
// FACTORY FUNCTIONS (Get active provider based on env)
// ============================================
export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER;
  if (provider === "razorpay") {
    return new RazorpayProvider();
  }
  if (provider === "test") {
    console.warn("[WARNING] Payment provider is set to 'test'. This is development-only mode.");
    return new TestPaymentProvider();
  }
  throw new Error(`Unknown payment provider: ${provider}`);
}

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER;
  if (provider === "fast2sms") {
    return new Fast2SmsProvider();
  }
  if (provider === "log" || !provider) {
    return new LogSmsProvider();
  }
  throw new Error(`Unknown SMS provider: ${provider}`);
}

export function getMapsProvider(): MapsProvider {
  const provider = process.env.MAPS_PROVIDER;
  if (provider === "mapbox") {
    return new MapboxProvider();
  }
  if (provider === "mock" || !provider) {
    return new MockMapsProvider();
  }
  throw new Error(`Unknown maps provider: ${provider}`);
}
