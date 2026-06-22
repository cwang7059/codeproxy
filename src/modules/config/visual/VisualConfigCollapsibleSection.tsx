import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";
import type { VisualConfigSectionId } from "@/modules/config/visual/visual-config-sections";

export function VisualConfigCollapsibleSection({
  id,
  title,
  description,
  open,
  onOpenChange,
  toggleLabel,
  highlighted,
  sectionRef,
  children,
}: {
  id: VisualConfigSectionId;
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toggleLabel: string;
  highlighted?: boolean;
  sectionRef?: (node: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section
      id={`visual-config-section-${id}`}
      ref={sectionRef}
      data-section-id={id}
      className={[
        "scroll-mt-4 rounded-2xl border bg-white transition-colors dark:bg-neutral-950/60",
        highlighted
          ? "border-indigo-300 ring-2 ring-indigo-200/70 dark:border-indigo-500/40 dark:ring-indigo-500/20"
          : "border-slate-200 dark:border-neutral-800",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
        aria-expanded={open}
        aria-controls={`visual-config-panel-${id}`}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/60">{description}</p>
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 dark:text-white/55">
          {toggleLabel}
          {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </span>
      </button>
      {open ? (
        <div
          id={`visual-config-panel-${id}`}
          className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-neutral-800"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
