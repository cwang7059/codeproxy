import type { ReactNode } from "react";

export function PageToolbar({
  title,
  description,
  icon,
  titleAs = "h2",
  actions,
  filters,
  after,
  className = "",
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  titleAs?: "h1" | "h2";
  actions?: ReactNode;
  filters?: ReactNode;
  after?: ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || actions);
  const Heading = titleAs;

  if (!hasHeader && !filters && !after) {
    return null;
  }

  return (
    <div className={["space-y-3", className].filter(Boolean).join(" ")}>
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          {title ? (
            <div className="min-w-0">
              <Heading className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                {icon ? <span className="shrink-0">{icon}</span> : null}
                <span>{title}</span>
              </Heading>
              {description ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-white/45">{description}</p>
              ) : null}
            </div>
          ) : (
            <div className="min-w-0" />
          )}
          {actions ? (
            <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {filters ? <div className="min-w-0">{filters}</div> : null}
      {after ? <div className="min-w-0 space-y-3">{after}</div> : null}
    </div>
  );
}
