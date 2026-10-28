import { NextRequest, NextResponse } from "next/server";
import { dispatchAllOutboxEvents } from "@/lib/outbox-dispatcher";

/**
 * POST /api/events/dispatch
 *
 * Manual trigger to process unprocessed outbox events
 * Can be called by cron jobs, background workers, or webhooks
 *
 * Query parameters:
 *   - limit (optional, default 100): max events to process in one batch
 *   - token (optional): authorization token for cron job security
 *
 * Response:
 *   {
 *     success: true,
 *     data: {
 *       total: 5,
 *       successful: 4,
 *       failed: 1
 *     }
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Check authorization token
    const token = request.nextUrl.searchParams.get("token");
    const secret = process.env.DISPATCH_SECRET;

    if (secret && (!token || token !== secret)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "100"),
      1000
    );

    const result = await dispatchAllOutboxEvents(limit);

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Dispatch failed:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch events" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/dispatch
 *
 * Health check / status
 * Returns stats on unprocessed events
 */
export async function GET(request: NextRequest) {
  try {
    // Check token if configured
    const token = request.nextUrl.searchParams.get("token");
    const secret = process.env.DISPATCH_SECRET;

    if (secret && (!token || token !== secret)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Could return stats here
    return NextResponse.json(
      {
        status: "ok",
        message: "Use POST to trigger dispatch",
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Health check failed" },
      { status: 500 }
    );
  }
}
