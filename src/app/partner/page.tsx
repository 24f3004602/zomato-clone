"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/money";

type PartnerData = { restaurant: { id: string; name: string; description: string; open: boolean }; items: Array<{ id: string; name: string; category: string; price: number; available: boolean }> };
type PartnerOrder = { id: string; status: string; total: number; createdAt: string; notes?: string | null; items: Array<{ id: string; name: string; quantity: number; unitPrice: number }>; address?: { label: string; line: string } | null };

export default function PartnerPage() {
  const [data, setData] = useState<PartnerData | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  async function loadWorkspace() {
    setRefreshing(true);
    try {
      const [partnerResponse, queueResponse] = await Promise.all([fetch("/api/partner", { cache: "no-store" }), fetch("/api/partner/orders", { cache: "no-store" })]);
      const [partner, queue] = await Promise.all([partnerResponse.json(), queueResponse.json()]);
      if (partner.data) setData(partner.data);
      if (queue.data) {
        setOrders(queue.data);
        setLastUpdated(new Date());
        setMessage("");
      } else {
        setMessage(queue.error ?? partner.error ?? "Unable to load partner portal");
      }
    } catch {
      setMessage("Unable to refresh partner portal");
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    void loadWorkspace();
    const interval = window.setInterval(() => void loadWorkspace(), 10000);
    const events = new EventSource("/api/events/orders");
    events.addEventListener("order", () => void loadWorkspace());
    events.addEventListener("error", () => events.close());
    return () => {
      window.clearInterval(interval);
      events.close();
    };
  }, []);
  async function advance(order: PartnerOrder) {
    const next = order.status === "CONFIRMED" ? "ACCEPTED" : order.status === "ACCEPTED" ? "PREPARING" : "READY_FOR_PICKUP";
    const response = await fetch("/api/partner/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: order.id, status: next }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Unable to update order");
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: next } : item));
  }
  async function toggleRestaurant() {
    if (!data) return;
    const response = await fetch("/api/partner", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ open: !data.restaurant.open }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Unable to update restaurant availability");
    setData((current) => current ? { ...current, restaurant: { ...current.restaurant, open: payload.data.open } } : current);
  }
  async function toggleItem(item: PartnerData["items"][number]) {
    const response = await fetch("/api/partner/menu", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, available: !item.available }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Unable to update menu availability");
    setData((current) => current ? { ...current, items: current.items.map((candidate) => candidate.id === item.id ? { ...candidate, available: payload.data.available } : candidate) } : current);
  }
  async function addItem(form: HTMLFormElement) {
    const formData = new FormData(form);
    const response = await fetch("/api/partner/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: formData.get("category"), name: formData.get("name"), description: formData.get("description"), price: Number(formData.get("price")), vegetarian: formData.get("vegetarian") === "on" }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Unable to add menu item");
    setData((current) => current ? { ...current, items: [...current.items, payload.data] } : current);
    form.reset();
  }
  return <main className="shell" style={{ maxWidth: 960, paddingTop: 44 }}><div className="section-head"><div><div className="eyebrow">Partner workspace</div><h1 style={{ fontSize: 50 }}>Restaurant operations.</h1></div><span style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="muted">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading..."}</span><button className="button ghost" onClick={() => void loadWorkspace()} disabled={refreshing} type="button">{refreshing ? "Refreshing..." : "Refresh"}</button><a className="button ghost" href="/">Customer view</a></span></div>{message && <p className="form-error">{message}</p>}{data && <><div className="modal"><div className="eyebrow">Active restaurant</div><div className="section-head"><div><h2>{data.restaurant.name}</h2><p className="muted">{data.restaurant.description}</p></div><button className="button ghost" onClick={toggleRestaurant} type="button">{data.restaurant.open ? "Pause orders" : "Resume orders"}</button></div><p><span className="chip">{data.restaurant.open ? "Accepting orders" : "Paused"}</span></p><h3>Menu availability</h3>{data.items.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--line)" }}><span>{item.name}<br /><span className="muted">₹{formatMoney(item.price)} · {item.category}</span></span><button className={item.available ? "rating" : "muted"} onClick={() => toggleItem(item)} type="button">{item.available ? "Available" : "Unavailable"}</button></div>)}<form onSubmit={(event) => { event.preventDefault(); void addItem(event.currentTarget); }} style={{ display: "grid", gap: 10, marginTop: 20 }}><h3>Add menu item</h3><input name="name" placeholder="Dish name" required /><input name="category" placeholder="Category" required /><input name="description" placeholder="Description" required /><input name="price" type="number" min="1" placeholder="Price" required /><label><input name="vegetarian" type="checkbox" /> Vegetarian</label><button className="button primary" type="submit">Add item</button></form></div><section className="section"><div className="section-head"><div><div className="eyebrow">Live queue</div><h2>Incoming orders</h2></div><p>{orders.length} active</p></div>{orders.length ? orders.map((order) => <div className="modal" key={order.id} style={{ marginBottom: 12 }}><div className="section-head"><span><strong>{order.id}</strong><br /><span className="muted">{new Date(order.createdAt).toLocaleString()} · ₹{formatMoney(order.total)}</span></span><span><span className="chip">{order.status}</span>{order.status !== "READY_FOR_PICKUP" && <button className="button primary" style={{ marginLeft: 10 }} onClick={() => advance(order)} type="button">{order.status === "CONFIRMED" ? "Accept" : order.status === "ACCEPTED" ? "Start preparing" : "Ready"}</button>}</span></div><div style={{ marginTop: 14 }}><strong>Items</strong>{order.items.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", paddingTop: 6 }}><span>{item.quantity} × {item.name}</span><span>₹{formatMoney(item.quantity * item.unitPrice)}</span></div>)}</div>{order.address && <p className="muted" style={{ marginBottom: 0 }}><strong>Deliver to:</strong> {order.address.label} — {order.address.line}</p>}{order.notes && <p className="muted" style={{ marginBottom: 0 }}><strong>Notes:</strong> {order.notes}</p>}</div>) : <div className="empty">No active orders. New orders will appear here.</div>}</section></>}</main>;
}
