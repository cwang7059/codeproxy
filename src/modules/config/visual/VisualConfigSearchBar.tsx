import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TextInput } from "@/modules/ui/Input";
import { HoverTooltip } from "@/modules/ui/Tooltip";

export function VisualConfigSearchBar({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchStats,
  disabled,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: (direction: "next" | "prev") => void;
  searchStats: { current: number; total: number };
  disabled?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="space-y-1">
        <TextInput
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.currentTarget.value)}
          placeholder={t("visual_config.search_placeholder")}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            onSearch(e.shiftKey ? "prev" : "next");
          }}
          disabled={disabled}
          endAdornment={
            <HoverTooltip content={t("config_page.search_hint")} placement="bottom">
              <span className="inline-flex h-6 w-6 items-center justify-center text-slate-400 dark:text-white/45">
                <Search size={16} aria-hidden="true" />
              </span>
            </HoverTooltip>
          }
        />
        <p className="text-[11px] text-slate-500 dark:text-white/55">
          {t("visual_config.search_results")}:
          <span className="ml-1 font-mono tabular-nums">
            {!searchQuery.trim()
              ? t("config_page.not_searched")
              : searchStats.total
                ? `${searchStats.current}/${searchStats.total}`
                : t("config_page.no_match")}
          </span>
        </p>
      </div>
      <div className="flex h-11 items-center justify-end gap-3">
        <HoverTooltip
          content={t("config_page.prev_match_hint")}
          placement="top"
          disabled={!searchStats.total}
        >
          <button
            type="button"
            onClick={() => onSearch("prev")}
            disabled={!searchStats.total}
            aria-label={t("config_page.prev_match")}
            className="inline-flex h-8 w-8 items-center justify-center text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/35 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/45 dark:hover:text-white/80 dark:focus-visible:ring-white/15"
          >
            <ChevronUp size={18} aria-hidden="true" />
          </button>
        </HoverTooltip>
        <HoverTooltip
          content={t("config_page.next_match_hint")}
          placement="bottom"
          disabled={!searchStats.total}
        >
          <button
            type="button"
            onClick={() => onSearch("next")}
            disabled={!searchStats.total}
            aria-label={t("config_page.next_match")}
            className="inline-flex h-8 w-8 items-center justify-center text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/35 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/45 dark:hover:text-white/80 dark:focus-visible:ring-white/15"
          >
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </HoverTooltip>
      </div>
    </div>
  );
}
