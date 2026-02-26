"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/expenses", label: "Expenses" },
];

export default function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="absolute right-[-4rem] top-12 h-96 w-96 rounded-full bg-indigo-200/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[92rem] px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.6)] ring-1 ring-slate-200/60 backdrop-blur-xl">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />
          </div>
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Luxury System</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">Operations, billing, expenses, and collections in one place.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white shadow-[0_10px_20px_-12px_rgba(15,23,42,0.9)]"
                        : "border border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  clearToken();
                  router.replace("/login");
                }}
                className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3">
          {actions ? (
            <div className="w-full overflow-hidden rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm ring-1 ring-slate-200/60 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-2">{actions}</div>
            </div>
          ) : (
            <div />
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
