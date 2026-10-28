import { NextRequest, NextResponse } from "next/server";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from "@/lib/outbox-dispatcher";

/**
 * GET /api/notifications
 *
 * Fetch notifications for authenticated user
 *
 * Query parameters:
 *   - unreadOnly (optional, default false): fetch only unread notifications
 *   - limit (optional, default 50): max notifications to return
 *
 * Returns:
 *   {
 *     notifications: [
 *       {
 *         id, userId, orderId, type, title, message,
 *         read, readAt, sentAt, deliveredAt, createdAt
 *       }
 *     ],
 *     unreadCount: 5
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    // In production, extract userId from session/JWT
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required (use session in production)" },
        { status: 400 }
      );
    }

    const unreadOnly =
      request.nextUrl.searchParams.get("unreadOnly") === "true";
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50"),
      500
    );

    const notifications = await getUserNotifications(userId, unreadOnly, limit);
    const unreadCount = await getUnreadNotificationCount(userId);

    return NextResponse.json(
      {
        notifications,
        unreadCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
