"use client";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.55)] ring-1 ring-slate-200/70 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 ${
        props.className || ""
      }`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-100 ${
        props.className || ""
      }`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100 ${
        props.className || ""
      }`}
    />
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-slate-900 via-slate-800 to-teal-700 text-white shadow-[0_10px_20px_-10px_rgba(15,23,42,0.8)] hover:brightness-105"
      : variant === "danger"
      ? "bg-gradient-to-r from-rose-700 to-rose-600 text-white shadow-[0_10px_20px_-10px_rgba(190,24,93,0.7)] hover:brightness-105"
      : "border border-slate-200 bg-white/90 text-slate-800 shadow-sm hover:bg-slate-50";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}
