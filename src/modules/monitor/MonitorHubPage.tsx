import { Activity, ScrollText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { MonitorPage } from "@/modules/monitor/MonitorPage";
import { RequestLogsPage } from "@/modules/monitor/RequestLogsPage";
import { Tabs, TabsList, TabsTrigger } from "@/modules/ui/Tabs";

export type MonitorHubTab = "overview" | "request-logs";

export function resolveMonitorHubTab(pathname: string): MonitorHubTab {
  return pathname.includes("/request-logs") ? "request-logs" : "overview";
}

export function monitorHubTabPath(tab: MonitorHubTab): string {
  return tab === "request-logs" ? "/monitor/request-logs" : "/monitor";
}

export function MonitorHubPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const tab = resolveMonitorHubTab(pathname);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Tabs
        value={tab}
        onValueChange={(next) => {
          navigate(monitorHubTabPath(next as MonitorHubTab));
        }}
      >
        <TabsList aria-label={t("monitor.hub_nav")}>
          <TabsTrigger value="overview">
            <Activity size={14} aria-hidden="true" />
            {t("monitor.tab_overview")}
          </TabsTrigger>
          <TabsTrigger value="request-logs">
            <ScrollText size={14} aria-hidden="true" />
            {t("shell.nav_request_logs")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "request-logs" ? <RequestLogsPage /> : <MonitorPage />}
    </div>
  );
}
