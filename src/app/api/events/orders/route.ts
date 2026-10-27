import { currentDelivery, currentPartner } from "@/lib/auth";
import { subscribeToOrderEvents } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const partner = await currentPartner();
  const delivery = await currentDelivery();
  if (!partner && !delivery) return new Response("Access required", { status: 403 });
  if (!process.env.REDIS_URL) return new Response("Realtime events are not configured", { status: 503 });

  const scope = partner ? "partner" : `delivery:${delivery?.id}`;
  const encoder = new TextEncoder();
  let closeSubscription: (() => Promise<void>) | null = null;
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ scope })}\n\n`));
      closeSubscription = await subscribeToOrderEvents(scope, (event) => {
        controller.enqueue(encoder.encode(`event: order\ndata: ${JSON.stringify(event)}\n\n`));
      });
    },
    async cancel() {
      await closeSubscription?.();
    },
  });
  request.signal.addEventListener("abort", () => { void closeSubscription?.(); });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
