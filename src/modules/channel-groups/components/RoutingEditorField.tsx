import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { HoverTooltip } from "@/modules/ui/Tooltip";

export function RoutingEditorField({
  label,
  hint,
  tooltip,
  children,
}: {
  label: string;
  hint?: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{label}</div>
        {tooltip ? (
          <HoverTooltip content={tooltip} placement="bottom">
            <span className="inline-flex h-6 w-6 items-center justify-center text-slate-400 dark:text-white/45">
              <CircleAlert size={16} aria-hidden="true" />
            </span>
          </HoverTooltip>
        ) : null}
      </div>
      {hint ? <div className="text-xs text-slate-500 dark:text-white/55">{hint}</div> : null}
      {children}
    </div>
  );
}
