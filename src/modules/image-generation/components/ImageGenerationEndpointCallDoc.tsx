import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildCurlExample } from "@/modules/image-generation/image-generation-constants";
import type { EndpointDoc, SpecRow } from "@/modules/image-generation/image-generation-types";
import { VirtualTable, type VirtualTableColumn } from "@/modules/ui/VirtualTable";

export function EndpointCallDoc({ doc }: { doc: EndpointDoc }) {
  const { t } = useTranslation();
  const curl = useMemo(() => {
    const promptExample =
      doc.curlMode === "edits"
        ? t("image_generation.curl_edit_prompt_example")
        : t("image_generation.curl_prompt_example");
    return buildCurlExample(doc.curlMode, promptExample);
  }, [doc.curlMode, t]);

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {t(doc.titleKey)}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-white/55">
              {t(doc.descriptionKey)}
            </p>
          </div>
          <div className="flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs dark:border-neutral-800 dark:bg-neutral-950">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white dark:bg-white dark:text-neutral-950">
              {doc.method}
            </span>
            <span className="truncate text-slate-700 dark:text-white/75">{doc.path}</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-white/55">
          <span className="rounded-full bg-white px-2.5 py-1 dark:bg-neutral-950">
            Authorization: Bearer YOUR_API_KEY
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 dark:bg-neutral-950">
            {doc.contentType}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-[0_14px_42px_rgb(15_23_42_/_0.16)] dark:bg-black/45">
        <div className="border-b border-white/10 px-4 py-2 text-xs font-medium text-slate-300">
          curl
        </div>
        <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-6 text-slate-100">
          <code>{curl}</code>
        </pre>
      </div>
    </div>
  );
}

export function SpecTable({ title, rows }: { title: string; rows: SpecRow[] }) {
  const { t } = useTranslation();
  const columns = useMemo<VirtualTableColumn<SpecRow>[]>(
    () => [
      {
        key: "name",
        label: t("image_generation.table_param"),
        width: "w-40",
        cellClassName: "font-mono text-xs break-all leading-5 text-slate-900 dark:text-white",
        render: (row) => row.name,
      },
      {
        key: "type",
        label: t("image_generation.table_type"),
        width: "w-28",
        cellClassName: "font-mono text-xs text-slate-600 dark:text-white/55",
        render: (row) => row.type,
      },
      {
        key: "required",
        label: t("image_generation.table_required"),
        width: "w-20",
        cellClassName: "text-xs text-slate-600 dark:text-white/55",
        render: (row) => (row.required ? t("common.yes") : t("common.no")),
      },
      {
        key: "description",
        label: t("image_generation.table_description"),
        cellClassName: "text-xs leading-5 text-slate-600 dark:text-white/60",
        render: (row) => t(row.descriptionKey),
      },
    ],
    [t],
  );

  return (
    <div
      data-testid="image-generation-spec-card"
      className="overflow-hidden rounded-2xl bg-white p-4 dark:bg-neutral-950/80"
    >
      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
      <div className="mt-4">
        <VirtualTable<SpecRow>
          rows={rows}
          columns={columns}
          rowKey={(row) => row.name}
          virtualize={false}
          height="h-auto"
          minHeight="min-h-0"
          minWidth="min-w-[560px]"
          caption={`${title} table`}
          rowHeight={48}
          showAllLoadedMessage={false}
        />
      </div>
    </div>
  );
}
