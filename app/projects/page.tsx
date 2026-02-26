"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import Modal from "@/components/Modal";
import { apiFetch } from "@/lib/api";
import { Button, Card, Input, Select, Textarea } from "@/components/ui";
import { errorMessage } from "@/lib/errorMessage";

type Client = { _id: string; name: string };
type Project = {
  _id: string;
  name: string;
  status: "active" | "paused" | "completed";
  monthlyFee: number;
  oneTimeFee: number;
  billingStartDate: string;
  billingEndDate?: string | null;
  notes?: string;
  clientId: Client | string;
};

type ProjectForm = {
  clientId: string;
  name: string;
  monthlyFee: string;
  oneTimeFee: string;
  billingStartDate: string;
  billingEndDate: string;
  status: Project["status"];
  notes: string;
};

const initialForm: ProjectForm = {
  clientId: "",
  name: "",
  monthlyFee: "0",
  oneTimeFee: "0",
  billingStartDate: new Date().toISOString().slice(0, 10),
  billingEndDate: "",
  status: "active",
  notes: "",
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);

function statusBadge(status: Project["status"]) {
  if (status === "active") return "border-emerald-200 bg-emerald-100 text-emerald-700";
  if (status === "paused") return "border-amber-200 bg-amber-100 text-amber-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | Project["status"]>("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(initialForm);
  const [saving, setSaving] = useState(false);

  const filteredProjects = projects.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const clientName = typeof p.clientId === "string" ? p.clientId : p.clientId?.name || "";
    return [p.name, clientName, p.notes].some((v) => String(v || "").toLowerCase().includes(q));
  });
  const statusCounts = {
    active: projects.filter((p) => p.status === "active").length,
    paused: projects.filter((p) => p.status === "paused").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  const loadProjects = useCallback(async (filter = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const query = filter ? `?status=${filter}` : "";
      const res = await apiFetch<{ success: boolean; data: Project[] }>(`/api/projects${query}`);
      setProjects(res.data);
    } catch (e: unknown) {
      setError(errorMessage(e, "Failed to load projects"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  async function loadClients() {
    const res = await apiFetch<{ success: boolean; data: Client[] }>("/api/clients");
    setClients(res.data);
  }

  useEffect(() => {
    loadClients().catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    loadProjects(statusFilter);
  }, [loadProjects, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  }

  function openEdit(project: Project) {
    const clientId = typeof project.clientId === "string" ? project.clientId : project.clientId._id;
    setEditing(project);
    setForm({
      clientId,
      name: project.name,
      monthlyFee: String(project.monthlyFee ?? 0),
      oneTimeFee: String(project.oneTimeFee ?? 0),
      billingStartDate: String(project.billingStartDate).slice(0, 10),
      billingEndDate: project.billingEndDate ? String(project.billingEndDate).slice(0, 10) : "",
      status: project.status,
      notes: project.notes || "",
    });
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      monthlyFee: Number(form.monthlyFee),
      oneTimeFee: Number(form.oneTimeFee),
      billingEndDate: form.billingEndDate || null,
    };
    try {
      if (editing) {
        await apiFetch(`/api/projects/${editing._id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/projects", { method: "POST", body: JSON.stringify(payload) });
      }
      setOpen(false);
      await loadProjects();
    } catch (e: unknown) {
      alert(errorMessage(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(project: Project) {
    if (!confirm(`Delete project "${project.name}"?`)) return;
    try {
      await apiFetch(`/api/projects/${project._id}`, { method: "DELETE" });
      await loadProjects();
    } catch (e: unknown) {
      alert(errorMessage(e, "Delete failed"));
    }
  }

  return (
    <AuthGuard>
      <AppShell
        title="Projects"
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search project / client"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-72"
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | Project["status"])}
              className="w-44"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </Select>
            <Button onClick={openCreate}>Add Project</Button>
          </div>
        }
      >
        <Card className="bg-gradient-to-b from-white to-slate-50/60">
          {loading ? (
            <div className="grid min-h-52 place-items-center text-sm text-slate-500">Loading projects...</div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">Project Portfolio</h2>
                  <p className="text-sm text-slate-500">Recurring billing, one-time fees, and project status overview.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                    {statusCounts.active} active
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                    {statusCounts.paused} paused
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
                    {statusCounts.completed} completed
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/85 shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-white/95 text-left text-slate-500 backdrop-blur">
                  <tr>
                    <th className="px-4 py-3 pr-4">Project</th>
                    <th className="py-3 pr-4">Client</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Monthly</th>
                    <th className="py-3 pr-4">One-time</th>
                    <th className="py-3 pr-4">Period</th>
                    <th className="py-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((p) => (
                    <tr key={p._id} className="border-t border-slate-100/90 transition hover:bg-slate-50/70">
                      <td className="px-4 py-3 pr-4">
                        <div>
                          <div className="font-medium text-slate-900">{p.name}</div>
                          <div className="max-w-xs truncate text-xs text-slate-500">{p.notes || "No notes"}</div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">
                        {typeof p.clientId === "string" ? p.clientId : p.clientId?.name}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-900">{money(p.monthlyFee)}</td>
                      <td className="py-3 pr-4 text-slate-700">{money(p.oneTimeFee)}</td>
                      <td className="py-3 pr-4 text-xs text-slate-600">
                        {String(p.billingStartDate).slice(0, 10)} to{" "}
                        {p.billingEndDate ? String(p.billingEndDate).slice(0, 10) : "Open"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/projects/${p._id}`}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Details
                          </Link>
                          <button
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(p)}
                            className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredProjects.length && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        {projects.length ? "No projects match your filters." : "No projects found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </Card>

        <Modal open={open} title={editing ? "Edit Project" : "Add Project"} onClose={() => setOpen(false)}>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Client</label>
                <Select
                  required
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Project Name</label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Monthly Fee</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyFee}
                  onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">One-time Fee</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.oneTimeFee}
                  onChange={(e) => setForm({ ...form, oneTimeFee: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Status</label>
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Project["status"] })}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Billing Start Date</label>
                <Input
                  type="date"
                  required
                  value={form.billingStartDate}
                  onChange={(e) => setForm({ ...form, billingStartDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Billing End Date (optional)</label>
                <Input
                  type="date"
                  value={form.billingEndDate}
                  onChange={(e) => setForm({ ...form, billingEndDate: e.target.value })}
                />
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
