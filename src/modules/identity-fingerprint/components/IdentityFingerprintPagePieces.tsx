import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { HeaderPreviewLine } from "@/modules/identity-fingerprint/identity-fingerprint-constants";
export function ProviderToolbar({
  toggle,
  actions,
}: {
  toggle?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 dark:border-neutral-800 lg:flex-row lg:items-start lg:justify-between">
      {toggle ? <div className="min-w-0 flex-1">{toggle}</div> : <div className="flex-1" />}
      <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function ProviderNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
      {children}
    </div>
  );
}

export function PreviewDisabledNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-neutral-700 dark:bg-neutral-900/70 dark:text-white/65">
      {children}
    </div>
  );
}

export function PreviewPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="sticky top-4 self-start rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function CollapsiblePanel({
  title,
  description,
  open,
  onOpenChange,
  toggleLabel,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggleLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/60">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">{description}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 dark:text-white/55">
          {toggleLabel}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>
      {open ? <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-neutral-800">{children}</div> : null}
    </section>
  );
}

export function SimplePanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">{description}</p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-700 dark:text-white/75">{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs text-slate-500 dark:text-white/45">{hint}</span>
      ) : null}
    </label>
  );
}

export function HeaderPreviewBlock({ lines }: { lines: HeaderPreviewLine[] }) {
  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-neutral-700 dark:text-white/35">
        —
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/80">
      <pre className="max-h-80 overflow-auto p-3 font-mono text-[11px] leading-5 text-slate-800 dark:text-slate-200">
        {lines.map((line) => (
          <div key={line.name} className="break-all">
            <span className="text-slate-500 dark:text-white/45">{line.name}: </span>
            <span>{line.value}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

export function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3 rounded-xl bg-white px-3 py-2 dark:bg-neutral-950/80">
      <div className="text-xs text-slate-500 dark:text-white/45">{label}</div>
      <div className="mt-1 break-all text-sm font-medium text-slate-900 dark:text-white">
        {value || "-"}
      </div>
    </div>
  );
}
