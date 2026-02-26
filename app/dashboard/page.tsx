"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";
import { Button, Card, Input } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errorMessage";

type DashboardResponse = {
  summary: {
    expectedThisMonth: number;
    collectedThisMonth: number;
    outstandingUnpaid: number;
    expensesThisMonth: number;
    profitThisMonth: number;
    profitAllTime: number;
    overdueAmount: number;
    selectedMonth: {
      key: string;
      label: string;
      expected: number;
      collected: number;
      expenses: number;
      profit: number;
    };
  };
  overdue: Array<{
    id: string;
    projectId: string;
    clientId: string;
    projectName: string;
    clientName: string;
    monthLabel: string;
    amount: number;
  }>;
  trend: Array<{
    year: number;
    month: number;
    monthLabel: string;
    monthlyCollected: number;
    oneTimeCollected: number;
    collected: number;
    expenses: number;
    profit: number;
  }>;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);

function defaultPreviousMonthValue() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isValidYearMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value.trim());
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMonthInput, setViewMonthInput] = useState(defaultPreviousMonthValue);
  const [viewMonth, setViewMonth] = useState(defaultPreviousMonthValue);

  const trendStats = useMemo(() => {
    const rows = data?.trend || [];
    if (!rows.length) return null;
    const best = rows.reduce((a, b) => (a.profit >= b.profit ? a : b));
    const worst = rows.reduce((a, b) => (a.profit <= b.profit ? a : b));
    const last = rows[rows.length - 1];
    return { best, worst, last };
  }, [data]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: DashboardResponse }>(
          `/api/dashboard?viewMonth=${encodeURIComponent(viewMonth)}`
        );
        if (active) setData(res.data);
      } catch (e: unknown) {
        if (active) setError(errorMessage(e, "Failed to load dashboard"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [viewMonth]);

  return (
    <AuthGuard>
      <AppShell title="Dashboard">
        {loading ? (
          <Card>Loading...</Card>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50/80 text-rose-700">
            <div className="text-sm font-medium">Dashboard Error</div>
            <div className="mt-1 text-sm">{error}</div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <StatCard label="Expected This Month" value={money(data?.summary.expectedThisMonth || 0)} tone="blue" />
              <StatCard label="Collected This Month" value={money(data?.summary.collectedThisMonth || 0)} tone="teal" />
              <StatCard label="Outstanding Unpaid" value={money(data?.summary.outstandingUnpaid || 0)} tone="amber" />
              <StatCard label="Expenses This Month" value={money(data?.summary.expensesThisMonth || 0)} tone="slate" />
              <StatCard
                label="Profit This Month"
                value={money(data?.summary.profitThisMonth || 0)}
                tone={(data?.summary.profitThisMonth || 0) < 0 ? "rose" : "emerald"}
              />
              <StatCard
                label="Profit All Time"
                value={money(data?.summary.profitAllTime || 0)}
                tone={(data?.summary.profitAllTime || 0) < 0 ? "rose" : "indigo"}
              />
            </div>

            <Card className="overflow-visible">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
                    Selected Month
                  </div>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Snapshot: {data?.summary.selectedMonth.label}</h2>
                  <p className="text-sm text-slate-500">Quick month breakdown without leaving the dashboard.</p>
                </div>
                <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
                  <div className="w-32">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="YYYY-MM"
                      value={viewMonthInput}
                      onChange={(e) => setViewMonthInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isValidYearMonth(viewMonthInput)) {
                          setViewMonth(viewMonthInput.trim());
                        }
                      }}
                    />
                    {!isValidYearMonth(viewMonthInput) && (
                      <div className="mt-1 text-xs text-rose-600">Use format YYYY-MM</div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!isValidYearMonth(viewMonthInput) || viewMonthInput.trim() === viewMonth}
                    onClick={() => setViewMonth(viewMonthInput.trim())}
                  >
                    Apply
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <MiniStat label="Expected" value={money(data?.summary.selectedMonth.expected || 0)} tone="blue" />
                <MiniStat label="Collected" value={money(data?.summary.selectedMonth.collected || 0)} tone="teal" />
                <MiniStat label="Expenses" value={money(data?.summary.selectedMonth.expenses || 0)} tone="slate" />
                <MiniStat
                  label="Profit"
                  value={money(data?.summary.selectedMonth.profit || 0)}
                  negative={(data?.summary.selectedMonth.profit || 0) < 0}
                  tone={(data?.summary.selectedMonth.profit || 0) < 0 ? "rose" : "emerald"}
                />
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <Card className="bg-gradient-to-b from-white to-slate-50/70">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Profit Trend</h2>
                    <p className="text-sm text-slate-500">
                      Last 12 months (monthly paid bills + one-time payments - expenses)
                    </p>
                  </div>
                  {trendStats && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <TrendBadge label="Best" month={trendStats.best.monthLabel} value={trendStats.best.profit} />
                      <TrendBadge label="Worst" month={trendStats.worst.monthLabel} value={trendStats.worst.profit} />
                      <TrendBadge label="Latest" month={trendStats.last.monthLabel} value={trendStats.last.profit} />
                    </div>
                  )}
                </div>
                <ProfitTrendChart points={data?.trend || []} />
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="text-left text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Month</th>
                        <th className="py-2 pr-4">Collected</th>
                        <th className="py-2 pr-4">Expenses</th>
                        <th className="py-2">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.trend || []).slice(-6).map((row) => (
                        <tr key={`${row.year}-${row.month}`} className="border-t border-slate-100/90">
                          <td className="py-2 pr-4">{row.monthLabel}</td>
                          <td className="py-2 pr-4">{money(row.collected)}</td>
                          <td className="py-2 pr-4">{money(row.expenses)}</td>
                          <td className={`py-2 font-medium ${row.profit < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                            {money(row.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-white via-white to-amber-50/70">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Overdue Snapshot</h2>
                    <span className="rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Needs attention
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Items</div>
                      <div className="mt-1 text-xl font-semibold">{data?.overdue.length || 0}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Amount</div>
                      <div className="mt-1 text-xl font-semibold">{money(data?.summary.overdueAmount || 0)}</div>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gradient-to-b from-white to-slate-50/60">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Overdue Bills</h2>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                      {data?.overdue.length || 0} items
                    </span>
                  </div>
                  <div className="max-h-[26rem] overflow-auto rounded-2xl border border-slate-200/80 bg-white/80">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-white/95 text-left text-slate-500 backdrop-blur">
                        <tr>
                          <th className="py-2 pr-4">Client</th>
                          <th className="py-2 pr-4">Project</th>
                          <th className="py-2 pr-4">Month</th>
                          <th className="py-2 pr-4">Amount</th>
                          <th className="py-2">Open</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.overdue || []).map((row) => (
                          <tr key={row.id} className="border-t border-slate-100/90 hover:bg-amber-50/40">
                            <td className="py-2 pr-4">{row.clientName}</td>
                            <td className="py-2 pr-4">{row.projectName}</td>
                            <td className="py-2 pr-4">{row.monthLabel}</td>
                            <td className="py-2 pr-4 font-medium text-rose-700">{money(row.amount)}</td>
                            <td className="py-2">
                              <Link className="font-medium text-slate-900 underline decoration-slate-300" href={`/projects/${row.projectId}`}>
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {!data?.overdue?.length && (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500">
                              No overdue bills.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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

type Tone = "blue" | "teal" | "amber" | "slate" | "emerald" | "rose" | "indigo";

const toneStyles: Record<Tone, { halo: string; chip: string; value: string }> = {
  blue: {
    halo: "from-sky-100/90 via-white to-white",
    chip: "border-sky-200 bg-sky-100 text-sky-700",
    value: "text-sky-950",
  },
  teal: {
    halo: "from-teal-100/90 via-white to-white",
    chip: "border-teal-200 bg-teal-100 text-teal-700",
    value: "text-teal-950",
  },
  amber: {
    halo: "from-amber-100/90 via-white to-white",
    chip: "border-amber-200 bg-amber-100 text-amber-700",
    value: "text-amber-950",
  },
  slate: {
    halo: "from-slate-100/90 via-white to-white",
    chip: "border-slate-200 bg-slate-100 text-slate-700",
    value: "text-slate-900",
  },
  emerald: {
    halo: "from-emerald-100/90 via-white to-white",
    chip: "border-emerald-200 bg-emerald-100 text-emerald-700",
    value: "text-emerald-900",
  },
  rose: {
    halo: "from-rose-100/90 via-white to-white",
    chip: "border-rose-200 bg-rose-100 text-rose-700",
    value: "text-rose-900",
  },
  indigo: {
    halo: "from-indigo-100/90 via-white to-white",
    chip: "border-indigo-200 bg-indigo-100 text-indigo-700",
    value: "text-indigo-900",
  },
};

function StatCard({ label, value, tone = "slate" }: { label: string; value: string; tone?: Tone }) {
  const style = toneStyles[tone];
  return (
    <Card className={`bg-gradient-to-br ${style.halo}`}>
      <div className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${style.chip}`}>
        {label}
      </div>
      <div className={`mt-3 text-2xl font-semibold tracking-tight ${style.value}`}>{value}</div>
      <div className="mt-1 h-1.5 w-16 rounded-full bg-slate-200/80">
        <div className={`h-full w-10 rounded-full ${style.chip.split(" ")[1]}`} />
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  negative = false,
  tone = "slate",
}: {
  label: string;
  value: string;
  negative?: boolean;
  tone?: Tone;
}) {
  const style = toneStyles[tone];
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-3 shadow-sm ring-1 ring-inset ${style.halo} ${negative ? "border-rose-200 ring-rose-100" : "border-slate-200 ring-slate-100"}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${negative ? "text-rose-700" : style.value}`}>{value}</div>
    </div>
  );
}

function TrendBadge({ label, month, value }: { label: string; month: string; value: number }) {
  const positive = value >= 0;
  return (
    <div className="min-w-[5.7rem] rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-left shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-0.5 truncate text-[11px] text-slate-500">{month}</div>
      <div className={`mt-1 text-sm font-semibold ${positive ? "text-emerald-700" : "text-rose-700"}`}>{money(value)}</div>
    </div>
  );
}

function ProfitTrendChart({
  points,
}: {
  points: DashboardResponse["trend"];
}) {
  const width = 760;
  const height = 260;
  const padding = 24;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  if (!points.length) {
    return <div className="grid h-52 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500">No trend data yet.</div>;
  }

  const values = points.map((p) => p.profit);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / Math.max(points.length - 1, 1)) * innerW;
    const y = padding + ((max - p.profit) / range) * innerH;
    return { ...p, x, y };
  });

  const polyline = coords.map((p) => `${p.x},${p.y}`).join(" ");
  const rawZeroY = padding + ((max - 0) / range) * innerH;
  const zeroY = Math.min(height - padding, Math.max(padding, rawZeroY));
  const area = [
    `${coords[0].x},${zeroY}`,
    ...coords.map((p) => `${p.x},${p.y}`),
    `${coords.at(-1)?.x},${zeroY}`,
  ].join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <defs>
          <linearGradient id="profitArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding + t * innerH;
          return <line key={t} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#eef2f7" />;
        })}
        <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#cbd5e1" strokeDasharray="4 4" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#e2e8f0" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" />

        <polygon points={area} fill="url(#profitArea)" />
        <polyline points={polyline} fill="none" stroke="#0f172a" strokeWidth="2.5" />

        {coords.map((p) => (
          <g key={`${p.year}-${p.month}`}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={p.profit >= 0 ? "#059669" : "#dc2626"} stroke="white" strokeWidth="1.5" />
          </g>
        ))}

        {coords.filter((_, i) => i % 2 === 0 || i === coords.length - 1).map((p) => (
          <text key={`label-${p.year}-${p.month}`} x={p.x} y={height - 6} textAnchor="middle" fontSize="10" fill="#64748b">
            {new Date(p.year, p.month - 1, 1).toLocaleString("en-US", { month: "short" })}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Positive profit
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-600" />
          Negative profit
        </span>
      </div>
    </div>
  );
}
