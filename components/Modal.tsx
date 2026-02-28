"use client";

export default function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative mx-auto my-4 flex w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/92 p-4 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.65)] ring-1 ring-slate-200/70 backdrop-blur sm:my-8 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500" />

        <div className="mb-4 flex items-center justify-between gap-3 pt-1">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Editor</div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-600 shadow-sm transition hover:bg-slate-50"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-inner shadow-slate-100">
          {children}
        </div>
      </div>
    </div>
  );
}
