import { useTranslation } from "react-i18next";
import { Button } from "@/modules/ui/Button";
import { Modal } from "@/modules/ui/Modal";
import type { ProviderImportDiff } from "@/modules/providers/provider-import-export";

interface ProvidersImportPreviewModalProps {
  open: boolean;
  importing: boolean;
  filename?: string;
  diff: ProviderImportDiff | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProvidersImportPreviewModal({
  open,
  importing,
  filename,
  diff,
  onClose,
  onConfirm,
}: ProvidersImportPreviewModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      title={t("providers.import_preview_title")}
      description={filename ? t("providers.import_preview_desc", { filename }) : undefined}
      maxWidth="max-w-2xl"
      onClose={() => {
        if (importing) return;
        onClose();
      }}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={!diff?.hasChanges || importing}
          >
            {t("providers.confirm_import")}
          </Button>
        </>
      }
    >
      {diff ? (
        <div className="space-y-4 text-sm text-slate-700 dark:text-white/75">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div>{t("providers.diff_added", { count: diff.added })}</div>
              <div>{t("providers.diff_updated", { count: diff.changed })}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div>{t("providers.diff_removed", { count: diff.removed })}</div>
              <div>
                {t("providers.diff_duplicates_cleaned", {
                  count: diff.duplicateEntriesRemoved,
                })}
              </div>
            </div>
          </div>

          {!diff.hasChanges ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {t("providers.import_no_changes")}
            </div>
          ) : null}

          {diff.addedLabels.length ? (
            <div>
              <p className="font-semibold">{t("providers.diff_added_label")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {diff.addedLabels.map((label) => (
                  <span
                    key={`added-${label}`}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {diff.changedLabels.length ? (
            <div>
              <p className="font-semibold">{t("providers.diff_updated_label")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {diff.changedLabels.map((label) => (
                  <span
                    key={`changed-${label}`}
                    className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {diff.removedLabels.length ? (
            <div>
              <p className="font-semibold">{t("providers.diff_removed_label")}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {diff.removedLabels.map((label) => (
                  <span
                    key={`removed-${label}`}
                    className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
