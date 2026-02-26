"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";

type Client = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: string;
};

const emptyForm = { name: "", phone: "", email: "", notes: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = clients.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return rows;
    return rows.filter((c) =>
      [c.name, c.phone, c.email, c.notes].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [clients, query]);
  const visibleCount = filteredClients.length;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: Client[] }>("/api/clients");
      setClients(res.data);
    } catch (e: unknown) {
      setError(errorMessage(e, "Failed to load clients"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function startEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      notes: client.notes || "",
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/clients/${editing._id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch("/api/clients", { method: "POST", body: JSON.stringify(form) });
      }
      setOpen(false);
      await load();
    } catch (e: unknown) {
      alert(errorMessage(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(client: Client) {
    if (!confirm(`Delete client "${client.name}"?`)) return;
    try {
      await apiFetch(`/api/clients/${client._id}`, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      alert(errorMessage(e, "Delete failed"));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="Clients"
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name / phone / email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-72"
            />
            <Button onClick={startCreate}>Add Client</Button>
          </div>
        }
      >
        <Card className="bg-gradient-to-b from-white to-slate-50/60">
          {loading ? (
            <div className="grid min-h-52 place-items-center text-sm text-slate-500">Loading clients...</div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">Client Directory</h2>
                  <p className="text-sm text-slate-500">Manage contacts, notes, and quick project access.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
                    {visibleCount} shown
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-600">
                    {clients.length} total
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/85 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white/95 text-left text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-4 py-3 pr-4">Name</th>
                    <th className="py-3 pr-4">Phone</th>
                    <th className="py-3 pr-4">Email</th>
                    <th className="py-3 pr-4">Notes</th>
                    <th className="py-3 pr-4">Profile</th>
                    <th className="py-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client._id} className="border-t border-slate-100/90 transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white text-sm font-semibold text-slate-700 shadow-sm">
                            {(client.name || "?").trim().charAt(0).toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{client.name}</div>
                            <div className="text-xs text-slate-500">{client.email || client.phone || "No contact"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{client.phone || "-"}</td>
                      <td className="py-3 pr-4 text-slate-700">{client.email || "-"}</td>
                      <td className="py-3 pr-4">
                        <div className="max-w-xs truncate text-slate-600">{client.notes || "-"}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                          href={`/clients/${client._id}`}
                        >
                            Details
                          </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                            onClick={() => startEdit(client)}
                          >
                            Edit
                          </button>
                          <button
                            className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100"
                            onClick={() => onDelete(client)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredClients.length && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        {clients.length ? "No clients match your search." : "No clients yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </Card>

        <Modal open={open} title={editing ? "Edit Client" : "Add Client"} onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Notes</label>
              <Textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </Modal>
      </AppShell>
    </AuthGuard>
  );
}
