import { NextRequest, NextResponse } from "next/server";
import { assignCourier, getAssignedCourier } from "@/lib/courier-assignment";
import { getCurrentDeliveryStatus } from "@/lib/delivery-lifecycle";

export async function POST(request: NextRequest) {
  try {
    const { orderId, estimatedDeliveryMinutes } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const assignment = await assignCourier(
      orderId,
      estimatedDeliveryMinutes ?? 30
    );

    return NextResponse.json(
      {
        success: true,
        data: assignment,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to assign courier",
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId query parameter is required" },
        { status: 400 }
      );
    }

    const courier = await getAssignedCourier(orderId);

    if (!courier) {
      const status = await getCurrentDeliveryStatus(orderId);
      return NextResponse.json(
        {
          orderId,
          assigned: false,
          currentStatus: status.deliveryStatus,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        orderId,
        assigned: true,
        courier,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch courier",
      },
      { status: 400 }
    );
  }
}
