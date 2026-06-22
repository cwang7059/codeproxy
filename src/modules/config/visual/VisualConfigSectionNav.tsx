import { useTranslation } from "react-i18next";
import {
  VISUAL_CONFIG_SECTIONS,
  type VisualConfigSectionId,
} from "@/modules/config/visual/visual-config-sections";

export function VisualConfigSectionNav({
  activeSection,
  matchingSections,
  searchQuery,
  onSelect,
}: {
  activeSection: VisualConfigSectionId | null;
  matchingSections: VisualConfigSectionId[];
  searchQuery: string;
  onSelect: (id: VisualConfigSectionId) => void;
}) {
  const { t } = useTranslation();
  const hasSearch = searchQuery.trim().length > 0;
  const visibleSections = hasSearch
    ? VISUAL_CONFIG_SECTIONS.filter((section) => matchingSections.includes(section.id))
    : VISUAL_CONFIG_SECTIONS;

  return (
    <nav
      aria-label={t("visual_config.section_nav")}
      className="hidden shrink-0 lg:block lg:w-52 xl:w-56"
    >
      <div className="sticky top-0 space-y-1 rounded-2xl border border-slate-200 bg-white/80 p-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/70">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-white/45">
          {t("visual_config.section_nav")}
        </p>
        {visibleSections.length === 0 ? (
          <p className="px-2 py-2 text-xs text-slate-500 dark:text-white/55">
            {t("config_page.no_match")}
          </p>
        ) : (
          visibleSections.map((section) => {
            const isActive = activeSection === section.id;
            const isMatch = matchingSections.includes(section.id);
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelect(section.id)}
                className={[
                  "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition",
                  isActive
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-700 hover:bg-slate-100 dark:text-white/75 dark:hover:bg-white/10",
                  hasSearch && isMatch && !isActive
                    ? "ring-1 ring-indigo-200 dark:ring-indigo-500/30"
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="truncate">{t(section.titleKey)}</span>
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
}
