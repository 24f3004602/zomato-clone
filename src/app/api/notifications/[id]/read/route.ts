import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead } from "@/lib/outbox-dispatcher";

/**
 * PATCH /api/notifications/:id/read
 *
 * Mark a notification as read
 *
 * Response:
 *   {
 *     success: true,
 *     notification: { id, userId, orderId, type, read: true, readAt, ... }
 *   }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: notificationId } = await params;

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const notification = await markNotificationAsRead(notificationId);

    return NextResponse.json(
      {
        success: true,
        notification,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
