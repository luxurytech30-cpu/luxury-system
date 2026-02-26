"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";

type ClientDetails = {
  client: { _id: string; name: string; phone?: string; email?: string; notes?: string };
  projects: Array<{ _id: string; name: string; status: string; monthlyFee: number; oneTimeFee: number }>;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);

export default function ClientDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [data, setData] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: ClientDetails }>(`/api/clients/${id}`);
        if (active) setData(res.data);
      } catch (e: unknown) {
        if (active) setError(errorMessage(e, "Failed to load client"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AuthGuard>
      <AppShell title={data?.client.name || "Client Details"}>
        {loading ? (
          <Card>Loading...</Card>
        ) : error ? (
          <Card className="text-rose-700">{error}</Card>
        ) : !data ? (
          <Card>Not found</Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" value={data.client.name} />
                <Field label="Phone" value={data.client.phone || "-"} />
                <Field label="Email" value={data.client.email || "-"} />
                <Field label="Notes" value={data.client.notes || "-"} />
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Projects</h2>
                <Link href="/projects" className="text-sm underline">
                  Open all projects
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Project</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Monthly</th>
                      <th className="py-2 pr-4">One-time</th>
                      <th className="py-2">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projects.map((p) => (
                      <tr key={p._id} className="border-t border-slate-100">
                        <td className="py-2 pr-4">{p.name}</td>
                        <td className="py-2 pr-4 capitalize">{p.status}</td>
                        <td className="py-2 pr-4">{money(p.monthlyFee)}</td>
                        <td className="py-2 pr-4">{money(p.oneTimeFee)}</td>
                        <td className="py-2">
                          <Link href={`/projects/${p._id}`} className="underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!data.projects.length && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No projects for this client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
