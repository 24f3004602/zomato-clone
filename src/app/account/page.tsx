"use client";

import { useState } from "react";

export default function AccountPage() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [orders, setOrders] = useState<Array<{ id: string; total: number; status: string; createdAt: string }>>([]);

  async function requestCode() {
    const response = await fetch("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const payload = await response.json() as { data?: { code?: string }; error?: string };
    if (!response.ok) return setMessage(payload.error ?? "Unable to send code");
    setRequested(true);
    setMessage(payload.data?.code ? `Development code: ${payload.data.code}` : "Verification code sent.");
  }

  async function verifyCode() {
    const response = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, code }) });
    const payload = await response.json() as { data?: { name: string }; error?: string };
    setMessage(response.ok ? `Welcome, ${payload.data?.name}.` : (payload.error ?? "Unable to verify code"));
    if (response.ok) {
      setSignedIn(true);
      const history = await fetch("/api/orders");
      if (history.ok) setOrders((await history.json()).data);
    }
  }

  return <main className="shell" style={{ maxWidth: 720, paddingTop: 70 }}><a className="logo" href="/">table<span>trail</span></a><section className="section"><div className="eyebrow">Your account</div><h1 style={{ fontSize: 50 }}>{signedIn ? "Your TableTrail" : "Sign in to TableTrail."}</h1><p className="lede">Use your phone number to save addresses, track orders, and manage your account.</p>{!signedIn && <div className="modal" style={{ marginTop: 24 }}><label>Phone number<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" /></label>{requested && <label style={{ marginTop: 14 }}>Verification code<input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" placeholder="6-digit code" /></label>}<div style={{ display: "flex", gap: 10, marginTop: 18 }}>{!requested ? <button className="button primary" onClick={requestCode} type="button">Send code</button> : <button className="button primary" onClick={verifyCode} type="button">Verify and continue</button>}<a className="button ghost" href="/">Cancel</a></div>{message && <p role="status" style={{ marginBottom: 0 }}>{message}</p>}</div>}{signedIn && <div className="section"><h2>Order history</h2>{orders.length ? orders.map((order) => <div key={order.id} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--line)" }}><span><strong>{order.id}</strong><br /><span className="muted">{new Date(order.createdAt).toLocaleString()}</span></span><span><strong>₹{order.total}</strong><br /><span className="chip">{order.status}</span></span></div>) : <p className="muted">Your confirmed orders will appear here.</p>}</div>}</section></main>;
}
