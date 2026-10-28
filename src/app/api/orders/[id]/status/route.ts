import { NextRequest, NextResponse } from "next/server";
import { getOrderStatus, getOrderStatusForCustomer } from "@/lib/order-status";

/**
 * GET /api/orders/:id/status
 * 
 * Fetch complete order status including delivery timeline, courier details, and items.
 * 
 * Query parameters:
 *   - customerId (optional): If provided, validates order belongs to customer (authorization)
 * 
 * Response:
 *   {
 *     orderId, status, deliveryStatus,
 *     subtotal, deliveryFee, serviceFee, total,
 *     estimatedDeliveryAt, deliveredAt,
 *     restaurant, deliveryPartner,
 *     items,
 *     timeline: [ { status, courierId, reason, createdAt }, ... ]
 *   }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const customerId = request.nextUrl.searchParams.get("customerId");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required in path" },
        { status: 400 }
      );
    }

    // If customerId provided, use authorization-aware lookup
    const orderStatus = customerId
      ? await getOrderStatusForCustomer(orderId, customerId)
      : await getOrderStatus(orderId);

    return NextResponse.json(orderStatus, { status: 200 });
  } catch (error: any) {
    if (
      error.message.includes("not found") ||
      error.message.includes("does not belong")
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to fetch order status" },
      { status: 500 }
    );
  }
}
