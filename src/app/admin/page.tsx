"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; phone: string | null; role: string; createdAt: string };
type AuditLog = { id: string; action: string; entityType: string; entityId: string; metadata: Record<string, unknown> | null; createdAt: string; actor: { name: string; phone: string | null } | null };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [usersResponse, auditResponse] = await Promise.all([fetch("/api/admin/users"), fetch(`/api/admin/audit?action=${encodeURIComponent(actionFilter)}&entityType=${encodeURIComponent(entityFilter)}`)]);
    const [usersPayload, auditPayload] = await Promise.all([usersResponse.json(), auditResponse.json()]);
    if (!usersResponse.ok) return setMessage(usersPayload.error ?? "Unable to load users");
    if (!auditResponse.ok) return setMessage(auditPayload.error ?? "Unable to load audit history");
    setUsers(usersPayload.data);
    setLogs(auditPayload.data);
  }

  useEffect(() => { void load(); }, []);

  async function assignRole(userId: string, role: string) {
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.error ?? "Unable to assign role");
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, role: payload.data.role } : user));
    void load();
  }

  return <main className="shell" style={{ maxWidth: 960, paddingTop: 44 }}>
    <div className="section-head"><div><div className="eyebrow">Admin workspace</div><h1 style={{ fontSize: 50 }}>Manage access.</h1></div><a className="button ghost" href="/">Customer view</a></div>
    {message && <p className="form-error">{message}</p>}
    <section className="section"><div className="section-head"><div><div className="eyebrow">Accounts</div><h2>Role assignments</h2></div><p>{users.length} users</p></div>
      {users.length ? users.map((user) => <div className="modal" key={user.id} style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}><span><strong>{user.name}</strong><br /><span className="muted">{user.phone ?? "No phone"} · joined {new Date(user.createdAt).toLocaleDateString()}</span></span>{user.role === "ADMIN" ? <span className="chip">Admin</span> : <select value={user.role} onChange={(event) => void assignRole(user.id, event.target.value)}><option value="CUSTOMER">Customer</option><option value="PARTNER">Partner</option><option value="DELIVERY">Delivery</option></select>}</div>) : <div className="empty">No users found.</div>}
    </section><section className="section"><div className="section-head"><div><div className="eyebrow">Audit trail</div><h2>Privileged changes</h2></div><button className="button ghost" onClick={() => void load()} type="button">Apply filters</button></div><div style={{ display: "flex", gap: 10, marginBottom: 16 }}><input value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} placeholder="Filter action" /><input value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} placeholder="Entity type" /></div>{logs.length ? logs.map((log) => <div key={log.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}><strong>{log.action}</strong> <span className="muted">{log.entityType}/{log.entityId}</span><br /><span className="muted">{log.actor?.name ?? "System"} · {new Date(log.createdAt).toLocaleString()}</span></div>) : <div className="empty">No audit records match these filters.</div>}</section>
  </main>;
}
