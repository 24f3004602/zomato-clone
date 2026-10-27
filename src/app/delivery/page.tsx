"use client";

import { useEffect, useState } from "react";

type DeliveryOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  restaurant?: { name: string };
  address?: { label: string; line: string } | null;
  items: Array<{ id: string; name: string; quantity: number }>;
  deliveryPartnerId?: string | null;
};

export default function DeliveryPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    setRefreshing(true);
    try {
      const response = await fetch("/api/delivery/orders", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Unable to load delivery queue");
        return;
      }
      setOrders(payload.data);
      setLastUpdated(new Date());
      setMessage("");
    } catch {
      setMessage("Unable to refresh delivery queue");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 10000);
    const events = new EventSource("/api/events/orders");
    events.addEventListener("order", () => void load());
    events.addEventListener("error", () => events.close());
    return () => {
      window.clearInterval(interval);
      events.close();
    };
  }, []);

  async function act(order: DeliveryOrder, action: "CLAIM" | "PICKUP" | "DELIVER") {
    const response = await fetch("/api/delivery/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, action }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Unable to update delivery");
    await load();
  }

  return <main className="shell" style={{ maxWidth: 960, paddingTop: 44 }}>
    <div className="section-head"><div><div className="eyebrow">Delivery workspace</div><h1 style={{ fontSize: 50 }}>Move orders forward.</h1></div><span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="muted">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading..."}</span><button className="button ghost" onClick={() => void load()} disabled={refreshing} type="button">{refreshing ? "Refreshing..." : "Refresh"}</button><a className="button ghost" href="/">Customer view</a></span></div>
    {message && <p className="form-error">{message}</p>}
    <section className="section"><div className="section-head"><div><div className="eyebrow">Active runs</div><h2>Delivery queue</h2></div><p>{orders.length} orders</p></div>
      {orders.length ? orders.map((order) => <div className="modal" key={order.id} style={{ marginBottom: 12 }}>
        <div className="section-head"><span><strong>{order.restaurant?.name ?? "Restaurant order"}</strong><br /><span className="muted">{order.id} · ₹{order.total}</span></span><span className="chip">{order.status}</span></div>
        <div style={{ marginTop: 12 }}>{order.items.map((item) => <div key={item.id}>{item.quantity} × {item.name}</div>)}</div>
        {order.address && <p className="muted"><strong>Deliver to:</strong> {order.address.label} — {order.address.line}</p>}
        <div style={{ display: "flex", gap: 10 }}>
          {order.status === "READY_FOR_PICKUP" && !order.deliveryPartnerId && <button className="button primary" onClick={() => act(order, "CLAIM")} type="button">Claim order</button>}
          {order.status === "READY_FOR_PICKUP" && order.deliveryPartnerId && <button className="button primary" onClick={() => act(order, "PICKUP")} type="button">Confirm pickup</button>}
          {order.status === "OUT_FOR_DELIVERY" && <button className="button primary" onClick={() => act(order, "DELIVER")} type="button">Mark delivered</button>}
        </div>
      </div>) : <div className="empty">No delivery orders are ready right now.</div>}
    </section>
  </main>;
}
