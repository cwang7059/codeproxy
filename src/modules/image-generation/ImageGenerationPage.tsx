import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authFilesApi } from "@/lib/http/apis";
import { ImageGenerationTestModal } from "@/modules/image-generation/components/ImageGenerationTestModal";
import {
  EndpointCallDoc,
  SpecTable,
} from "@/modules/image-generation/components/ImageGenerationEndpointCallDoc";
import {
  GPT_IMAGE_MODEL,
  VISIBLE_ENDPOINT_DOCS,
  isCodexOauthFile,
} from "@/modules/image-generation/image-generation-constants";
import type { ImageMode } from "@/modules/image-generation/image-generation-types";
import { Button } from "@/modules/ui/Button";
import { Card } from "@/modules/ui/Card";
import { PageToolbar } from "@/modules/ui/PageToolbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/ui/Tabs";

export function ImageGenerationPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(GPT_IMAGE_MODEL);
  const [activeMode, setActiveMode] = useState<ImageMode>("generations");
  const [hasCodexOauthChannel, setHasCodexOauthChannel] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [testOpen, setTestOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAvailability = async () => {
      setChannelsLoading(true);
      try {
        const response = await authFilesApi.list();
        if (cancelled) return;
        setHasCodexOauthChannel((response.files ?? []).some(isCodexOauthFile));
      } catch {
        if (!cancelled) {
          setHasCodexOauthChannel(false);
        }
      } finally {
        if (!cancelled) {
          setChannelsLoading(false);
        }
      }
    };

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, []);

  const disabled = !channelsLoading && !hasCodexOauthChannel;
  const activeDoc = useMemo(
    () => VISIBLE_ENDPOINT_DOCS.find((doc) => doc.mode === activeMode) ?? VISIBLE_ENDPOINT_DOCS[0],
    [activeMode],
  );

  const openTest = useCallback(() => {
    if (disabled || channelsLoading) return;
    setTestOpen(true);
  }, [channelsLoading, disabled]);

  return (
    <section className="page-stack min-w-0 overflow-x-hidden">
      <PageToolbar
        title={t("image_generation.title")}
        description={t("image_generation.description")}
        icon={<ImageIcon size={18} className="text-slate-900 dark:text-white" aria-hidden="true" />}
      />

      <section className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value={GPT_IMAGE_MODEL}>{GPT_IMAGE_MODEL}</TabsTrigger>
          </TabsList>

          <TabsContent value={GPT_IMAGE_MODEL} className="mt-4 space-y-4">
            {disabled ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
                {t("image_generation.channels_empty")}
              </div>
            ) : null}

            <div
              data-testid={disabled ? "image-generation-disabled-state" : undefined}
              className={disabled ? "space-y-4 opacity-60" : "space-y-4"}
              aria-disabled={disabled}
            >
              <Card
                title={t("image_generation.call_title")}
                description={t("image_generation.call_description")}
                actions={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={openTest}
                    disabled={channelsLoading || disabled}
                    aria-busy={channelsLoading}
                  >
                    {t("image_generation.open_test_button")}
                  </Button>
                }
              >
                <div className="space-y-4">
                  <Tabs
                    value={activeMode}
                    onValueChange={(value) => setActiveMode(value as ImageMode)}
                  >
                    <TabsList>
                      {VISIBLE_ENDPOINT_DOCS.map((doc) => (
                        <TabsTrigger key={doc.mode} value={doc.mode}>
                          {t(doc.titleKey)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {VISIBLE_ENDPOINT_DOCS.map((doc) => (
                      <TabsContent key={doc.mode} value={doc.mode} className="mt-4">
                        <EndpointCallDoc doc={doc} />
                      </TabsContent>
                    ))}
                  </Tabs>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white/55">
                    {t("image_generation.active_endpoint_hint", {
                      method: activeDoc.method,
                      path: activeDoc.path,
                    })}
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <SpecTable
                  title={t("image_generation.request_params_title")}
                  rows={activeDoc.requestRows}
                />
                <SpecTable
                  title={t("image_generation.response_schema_title")}
                  rows={activeDoc.responseRows}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>

      <ImageGenerationTestModal open={testOpen} onClose={() => setTestOpen(false)} />
    </section>
  );
}
