"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";

type ProjectDetailsResponse = {
  project: {
    _id: string;
    name: string;
    status: "active" | "paused" | "completed";
    monthlyFee: number;
    oneTimeFee: number;
    billingStartDate: string;
    billingEndDate?: string | null;
    notes?: string;
    pausePeriods: Array<{ from: string; to?: string | null }>;
    clientId: { _id: string; name: string; phone?: string; email?: string };
  };
  months: Array<{ _id: string; year: number; month: number; amount: number; status: "paid" | "unpaid"; paidAt?: string | null }>;
  payments: Array<{
    _id: string;
    amount: number;
    date: string;
    note?: string;
    oneTimeAmount: number;
    monthlyAllocations: Array<{ projectMonthId: string; year: number; month: number; amount: number }>;
  }>;
  oneTimePaid: number;
  oneTimeRemaining: number;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);

function ymLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
}

function isOverdue(year: number, month: number, status: string) {
  if (status === "paid") return false;
  const due = new Date(year, month - 1, 15, 23, 59, 59, 999);
  return new Date() > due;
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [data, setData] = useState<ProjectDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ success: boolean; data: ProjectDetailsResponse }>(`/api/projects/${id}`);
      setData(res.data);
    } catch (e: unknown) {
      setError(errorMessage(e, "Failed to load project"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function pauseProject() {
    await apiFetch(`/api/projects/${id}/pause`, { method: "POST" });
    await load();
  }

  async function resumeProject() {
    await apiFetch(`/api/projects/${id}/resume`, { method: "POST" });
    await load();
  }

  async function markPaid(monthId: string) {
    await apiFetch(`/api/projects/${id}/billing/${monthId}/mark-paid`, { method: "POST" });
    await load();
  }

  async function markUnpaid(monthId: string) {
    await apiFetch(`/api/projects/${id}/billing/${monthId}/mark-unpaid`, { method: "POST" });
    await load();
  }

  async function submitPayment(e: FormEvent) {
    e.preventDefault();
    setPaying(true);
    try {
      await apiFetch(`/api/projects/${id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(payForm.amount || 0),
          date: payForm.date,
          note: payForm.note,
        }),
      });
      setPayForm({ amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
      await load();
    } catch (e: unknown) {
      alert(errorMessage(e, "Payment failed"));
    } finally {
      setPaying(false);
    }
  }

  return (
    <AuthGuard>
      <AppShell title={data?.project.name || "Project Details"}>
        {loading ? (
          <Card>Loading...</Card>
        ) : error ? (
          <Card className="text-rose-700">{error}</Card>
        ) : !data ? (
          <Card>Not found</Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Client</div>
                  <Link href={`/clients/${data.project.clientId._id}`} className="text-lg font-semibold underline">
                    {data.project.clientId.name}
                  </Link>
                  <div className="text-sm text-slate-600 capitalize">Status: {data.project.status}</div>
                  <div className="text-sm text-slate-600">Monthly Fee: {money(data.project.monthlyFee)}</div>
                  <div className="text-sm text-slate-600">One-time Fee: {money(data.project.oneTimeFee)}</div>
                  <div className="text-sm text-slate-600">One-time Remaining: {money(data.oneTimeRemaining)}</div>
                  <div className="text-sm text-slate-600">
                    Billing: {String(data.project.billingStartDate).slice(0, 10)} to{" "}
                    {data.project.billingEndDate ? String(data.project.billingEndDate).slice(0, 10) : "Open"}
                  </div>
                  {data.project.notes ? <p className="max-w-2xl text-sm text-slate-700">{data.project.notes}</p> : null}
                </div>
                <div className="flex gap-2">
                  {data.project.status !== "paused" ? (
                    <Button variant="secondary" onClick={pauseProject}>
                      Pause
                    </Button>
                  ) : (
                    <Button onClick={resumeProject}>Resume</Button>
                  )}
                </div>
              </div>
              {!!data.project.pausePeriods?.length && (
                <div className="mt-4">
                  <div className="mb-2 text-sm font-semibold">Pause Periods</div>
                  <div className="space-y-1 text-sm text-slate-700">
                    {data.project.pausePeriods.map((p, i) => (
                      <div key={i}>
                        {String(p.from).slice(0, 10)} to {p.to ? String(p.to).slice(0, 10) : "Current"}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <Card>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Billing Table</h2>
                  <span className="text-sm text-slate-500">Due by 15th of same month</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Month</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Paid At</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.months.map((m) => (
                        <tr key={m._id} className="border-t border-slate-100">
                          <td className="py-2 pr-4">{ymLabel(m.year, m.month)}</td>
                          <td className="py-2 pr-4">{money(m.amount)}</td>
                          <td className="py-2 pr-4">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                m.status === "paid"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : isOverdue(m.year, m.month, m.status)
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {m.status === "unpaid" && isOverdue(m.year, m.month, m.status) ? "overdue" : m.status}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{m.paidAt ? String(m.paidAt).slice(0, 10) : "-"}</td>
                          <td className="py-2">
                            {m.status === "unpaid" ? (
                              <button onClick={() => markPaid(m._id)} className="underline">
                                Mark Paid
                              </button>
                            ) : (
                              <button onClick={() => markUnpaid(m._id)} className="underline text-rose-700">
                                Mark Unpaid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!data.months.length && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-500">
                            No monthly bills generated.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="space-y-4">
                <Card>
                  <h2 className="mb-3 text-lg font-semibold">Record Payment</h2>
                  <form className="space-y-3" onSubmit={submitPayment}>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Amount</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={payForm.amount}
                        onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Date</label>
                      <Input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Note</label>
                      <Textarea rows={3} value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })} />
                    </div>
                    <Button disabled={paying} className="w-full">
                      {paying ? "Saving..." : "Record Payment"}
                    </Button>
                  </form>
                  <p className="mt-3 text-xs text-slate-500">
                    Single payment input: amount is auto-applied to the one-time balance first, then to oldest unpaid
                    monthly bills. No credit is stored.
                  </p>
                </Card>

                <Card>
                  <h2 className="mb-3 text-lg font-semibold">Recent Payments</h2>
                  <div className="space-y-3">
                    {data.payments.map((p) => (
                      <div key={p._id} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{money(p.amount)}</div>
                          <div className="text-xs text-slate-500">{String(p.date).slice(0, 10)}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          One-time: {money(p.oneTimeAmount || 0)} | Months:{" "}
                          {p.monthlyAllocations?.length
                            ? p.monthlyAllocations.map((a) => ymLabel(a.year, a.month)).join(", ")
                            : "None"}
                        </div>
                        {p.note ? <div className="mt-1 text-xs text-slate-700">{p.note}</div> : null}
                      </div>
                    ))}
                    {!data.payments.length && <div className="text-sm text-slate-500">No payments yet.</div>}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}
