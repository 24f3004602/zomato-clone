"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { MenuItem, Restaurant } from "@/lib/domain";

export default function RestaurantPage({ restaurant, items }: { restaurant: Restaurant; items: MenuItem[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const grouped = useMemo(() => items.reduce<Record<string, MenuItem[]>>((groups, item) => {
    (groups[item.category] ??= []).push(item);
    return groups;
  }, {}), [items]);
  const cartItems = items.filter((item) => cart[item.id]);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [checkoutError, setCheckoutError] = useState("");

  function change(itemId: string, delta: number) {
    setCart((current) => {
      const quantity = Math.max(0, (current[itemId] ?? 0) + delta);
      const next = { ...current };
      if (quantity === 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutState("submitting");
    setCheckoutError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          customer: { name: form.get("name"), phone: form.get("phone"), address: form.get("address") },
          lines: cartItems.map((item) => ({ itemId: item.id, quantity: cart[item.id] })),
          notes: form.get("notes") || undefined,
        }),
      });
      const payload = await response.json() as { data?: { id: string }; error?: string };
      if (!response.ok || !payload.data) {
        setCheckoutError(payload.error ?? "Unable to place order");
        setCheckoutState("error");
        return;
      }
      setCheckoutState("success");
      setCart({});
    } catch {
      setCheckoutError("We could not reach the order service. Check your connection and try again.");
      setCheckoutState("error");
    }
  }

  return (
    <>
      <header className="topbar"><div className="shell nav"><a className="logo" href="/">table<span>trail</span></a><a className="button ghost" href="/">Back to discovery</a></div></header>
      <main className="shell">
        <section className="section" style={{ paddingBottom: 20 }}>
          <div className={`restaurant-image ${restaurant.accent}`} style={{ height: 220, borderRadius: 24, padding: 24 }}><span>{restaurant.image}</span><span className="pill">{restaurant.open ? "Open now" : "Closed"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "start", marginTop: 22 }}>
            <div><div className="eyebrow">{restaurant.cuisine.join(" · ")}</div><h1 style={{ fontSize: 48, marginTop: 8 }}>{restaurant.name}</h1><p className="lede">{restaurant.description}</p><div className="meta"><span className="rating">★ {restaurant.rating}</span><span>{restaurant.reviews.toLocaleString()} reviews</span><span>{restaurant.deliveryMinutes} min delivery</span><span>₹{formatMoney(restaurant.priceForTwo)} for two</span></div></div>
            <button className="button ghost" type="button">♡ Save</button>
          </div>
        </section>
        <section className="section" style={{ paddingTop: 10 }}>
          <div className="section-head"><div><div className="eyebrow">Made for you</div><h2>Menu</h2></div><p>{restaurant.open ? "Accepting orders" : "Currently closed"}</p></div>
          {Object.entries(grouped).map(([category, categoryItems]) => <div key={category} style={{ marginBottom: 30 }}><h3>{category}</h3>{categoryItems.map((item) => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 18, padding: "18px 0", borderBottom: "1px solid var(--line)" }}><div><h3 style={{ margin: "0 0 6px", fontSize: 17 }}>{item.name} {item.popular && <span className="chip">Popular</span>}</h3><p style={{ color: "var(--muted)", margin: 0, maxWidth: 620, lineHeight: 1.5 }}>{item.description}</p><strong style={{ display: "block", marginTop: 9 }}>₹{formatMoney(item.price)}</strong></div><div style={{ alignSelf: "center" }}>{cart[item.id] ? <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--line)", borderRadius: 999, padding: 5 }}><button className="filter" onClick={() => change(item.id, -1)} type="button">−</button><strong>{cart[item.id]}</strong><button className="filter" onClick={() => change(item.id, 1)} type="button">+</button></div> : <button className="button ghost" onClick={() => change(item.id, 1)} type="button">Add</button>}</div></div>)}</div>)}
        </section>
      </main>
      {itemCount > 0 && <aside style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", width: "min(560px, calc(100% - 32px))", background: "var(--ink)", color: "white", borderRadius: 18, padding: "15px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 12px 30px rgba(0,0,0,.2)" }}><div><strong>{itemCount} item{itemCount === 1 ? "" : "s"}</strong><div style={{ opacity: .7, fontSize: 12 }}>₹{formatMoney(subtotal)} + delivery and taxes</div></div><button className="button primary" onClick={() => setCheckoutOpen(true)} type="button">Review cart</button></aside>}
      {checkoutOpen && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><div className="section-head"><div><div className="eyebrow">Almost there</div><h2 id="checkout-title">Delivery details</h2></div><button className="filter" onClick={() => setCheckoutOpen(false)} type="button">Close</button></div>{checkoutState === "success" ? <div className="success-box"><h3>Order confirmed</h3><p>Your order has been sent to {restaurant.name}. The next step is payment-provider integration.</p><button className="button primary" onClick={() => setCheckoutOpen(false)} type="button">Done</button></div> : <form onSubmit={submitOrder}><label>Name<input name="name" required minLength={2} maxLength={80} /></label><label>Phone<input name="phone" required pattern="\+?[0-9 ()-]{7,20}" /></label><label>Delivery address<textarea name="address" required minLength={8} maxLength={240} /></label><label>Notes <span className="muted">(optional)</span><textarea name="notes" maxLength={500} /></label><div className="checkout-total"><span>Total estimate</span><strong>₹{formatMoney(subtotal + (subtotal >= 49900 ? 0 : restaurant.deliveryFee) + Math.round(subtotal * 5 / 100))}</strong></div>{checkoutError && <p className="form-error" role="alert">{checkoutError}</p>}<button className="button primary" disabled={checkoutState === "submitting"} type="submit">{checkoutState === "submitting" ? "Placing order..." : "Place order"}</button></form>}</section></div>}
    </>
  );
}
