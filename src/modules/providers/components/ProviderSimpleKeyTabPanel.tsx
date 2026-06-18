import type { LucideIcon } from "lucide-react";
import type { ProviderSimpleConfig } from "@/lib/http/types";
import type { ProviderKeyType } from "@/modules/providers/hooks/useProviderKeyEditor";
import type { ProviderAccessSummary } from "@/modules/providers/provider-access";
import type { KeyStatBucket, StatusBarData } from "@/modules/providers/provider-usage";
import { ProviderKeyListCard } from "@/modules/providers/ProviderKeyListCard";
import { TabsContent } from "@/modules/ui/Tabs";

interface ProviderSimpleKeyTabPanelProps {
  tabValue: ProviderKeyType;
  icon: LucideIcon;
  iconSrc?: string;
  iconDarkSrc?: string;
  title: string;
  description: string;
  items: ProviderSimpleConfig[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  onToggleEnabled?: (index: number, enabled: boolean) => void;
  getStats: (item: ProviderSimpleConfig) => KeyStatBucket;
  getStatusBar: (item: ProviderSimpleConfig) => StatusBarData;
  getAccessSummary: (item: ProviderSimpleConfig) => ProviderAccessSummary | null;
  getLatencyEntry?: (key: string) => { latencyMs: number | null; loading: boolean; error: boolean };
  checkLatency?: (key: string, baseUrl: string) => void;
  showBaseUrl?: boolean;
  selectedKeys: Set<string>;
  onToggleSelected: (key: string, checked: boolean) => void;
}

export function ProviderSimpleKeyTabPanel({
  tabValue,
  icon,
  iconSrc,
  iconDarkSrc,
  title,
  description,
  items,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onToggleEnabled,
  getStats,
  getStatusBar,
  getAccessSummary,
  getLatencyEntry,
  checkLatency,
  showBaseUrl = true,
  selectedKeys,
  onToggleSelected,
}: ProviderSimpleKeyTabPanelProps) {
  return (
    <TabsContent value={tabValue} className="flex min-h-0 flex-1 flex-col">
      <ProviderKeyListCard
        icon={icon}
        iconSrc={iconSrc}
        iconDarkSrc={iconDarkSrc}
        title={title}
        description={description}
        items={items}
        loading={loading}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleEnabled={onToggleEnabled}
        getStats={getStats}
        getStatusBar={getStatusBar}
        getAccessSummary={getAccessSummary}
        getLatencyEntry={getLatencyEntry}
        checkLatency={checkLatency}
        showBaseUrl={showBaseUrl}
        selectedKeys={selectedKeys}
        onToggleSelected={onToggleSelected}
      />
    </TabsContent>
  );
}
