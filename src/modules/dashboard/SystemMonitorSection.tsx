import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Cpu,
  Database,
  FileText,
  Clock,
  MemoryStick,
  HardDrive,
  Network,
  ArrowUpRight,
  ArrowDownRight,
  Wifi,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/modules/ui/Card";
import type { SystemStats } from "./useSystemStats";
import {
  buildHealthScoreFactors,
  computeHealthScore,
  healthFactorTone,
  latencyToneClass,
} from "@/modules/dashboard/dashboard-system-utils";

const PANEL_SURFACE =
  "rounded-[16px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-neutral-800 dark:bg-neutral-950/85";
const INNER_SURFACE =
  "rounded-[16px] border border-slate-200/75 bg-slate-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatRate(bps: number): string {
  if (bps < 1024) return `${bps.toFixed(0)} B/s`;
  if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
  return `${(bps / 1024 / 1024).toFixed(2)} MB/s`;
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusColor(pct: number) {
  if (pct >= 95)
    return {
      text: "text-red-500",
      bg: "bg-red-500",
      ring: "stroke-red-500",
      bar: "bg-red-500",
      labelKey: "system_monitor.status_critical",
      labelBg: "bg-red-500/10 text-red-500",
      card: "border-rose-200/80 bg-rose-50/40 dark:border-rose-500/20 dark:bg-rose-500/10",
    };
  if (pct >= 80)
    return {
      text: "text-amber-500",
      bg: "bg-amber-500",
      ring: "stroke-amber-500",
      bar: "bg-amber-500",
      labelKey: "system_monitor.status_warn",
      labelBg: "bg-amber-500/10 text-amber-500",
      card: "border-amber-200/80 bg-amber-50/45 dark:border-amber-500/20 dark:bg-amber-500/10",
    };
  return {
    text: "text-emerald-500",
    bg: "bg-emerald-500",
    ring: "stroke-emerald-500",
    bar: "bg-emerald-500",
    labelKey: "system_monitor.status_normal",
    labelBg: "bg-emerald-500/10 text-emerald-500",
    card: "",
  };
}

function healthLabel(score: number) {
  if (score >= 90) return { key: "system_monitor.health_healthy", color: "text-emerald-500" };
  if (score >= 70) return { key: "system_monitor.health_good", color: "text-blue-500" };
  if (score >= 50) return { key: "system_monitor.health_warning", color: "text-amber-500" };
  return { key: "system_monitor.health_risk", color: "text-red-500" };
}

function healthRingColor(score: number) {
  if (score >= 90) return "stroke-emerald-500";
  if (score >= 70) return "stroke-blue-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-white/55">
      <span
        className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-neutral-600"}`}
      />
      {connected ? t("system_monitor.live") : t("system_monitor.polling")}
    </div>
  );
}

function HealthGauge({ score }: { score: number }) {
  const { t } = useTranslation();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const hl = healthLabel(score);

  return (
    <div className="flex shrink-0 flex-col items-center justify-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="10"
            className="stroke-slate-200/70 dark:stroke-neutral-800"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${healthRingColor(score)} transition-all duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold font-mono tabular-nums ${hl.color}`}>
            {Math.round(score)}
          </span>
          <span className={`mt-0.5 text-xs font-semibold ${hl.color}`}>{t(hl.key)}</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-white/50">
        {t("system_monitor.health_score")}
      </p>
    </div>
  );
}

function HealthOverviewCard({ score, stats }: { score: number; stats: SystemStats }) {
  const { t } = useTranslation();
  const factors = buildHealthScoreFactors(stats);

  return (
    <Card
      padding="compact"
      className={`${INNER_SURFACE} h-full min-h-[246px]`}
      bodyClassName="mt-0 flex h-full flex-col gap-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <HealthGauge score={score} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold text-slate-600 dark:text-white/70">
            {t("system_monitor.health_breakdown_title")}
          </p>
          <ul className="space-y-1.5">
            {factors.map((factor) => {
              const tone = healthFactorTone(factor.pct);
              const hintKey =
                tone === "normal"
                  ? "system_monitor.health_factor_normal"
                  : "system_monitor.health_factor_high";
              return (
                <li key={factor.key}>
                  <Link
                    to="/system"
                    viewTransition
                    className="group flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/80 dark:hover:bg-white/[0.04]"
                  >
                    <span className="min-w-0 truncate text-xs text-slate-600 dark:text-white/65">
                      {t(hintKey, {
                        label: t(factor.labelKey),
                        pct: factor.pct.toFixed(1),
                      })}
                    </span>
                    <ChevronRight
                      size={14}
                      className="shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100 dark:text-white/35"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            to="/system"
            viewTransition
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {t("system_monitor.view_system_details")}
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

function DiskUsageRingCard({ stats }: { stats: SystemStats }) {
  const { t } = useTranslation();
  const pct = Math.min(Math.max(stats.disk_pct, 0), 100);
  const sc = statusColor(pct);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card
      padding="compact"
      className={`${INNER_SURFACE} h-full min-h-[246px] overflow-hidden`}
      bodyClassName="mt-0 flex h-full flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-white/80">
          <HardDrive size={15} className="text-slate-400" />
          {t("system_monitor.disk")}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sc.labelBg}`}>
          {t(sc.labelKey)}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-center py-2">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="11"
              className="stroke-slate-200/70 dark:stroke-neutral-800"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={`${sc.ring} transition-all duration-700 ease-out`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold font-mono tabular-nums ${sc.text}`}>
              {stats.disk_pct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-white/[0.06] dark:bg-neutral-900/50">
          <p className="text-[10px] text-slate-500 dark:text-white/50">{t("system_monitor.disk_free")}</p>
          <p className="mt-1 text-right text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatBytes(stats.disk_free)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-white/[0.06] dark:bg-neutral-900/50">
          <p className="text-[10px] text-slate-500 dark:text-white/50">
            {t("system_monitor.total_size", { size: formatBytes(stats.disk_total) })}
          </p>
          <p className="mt-1 text-right text-sm font-bold font-mono tabular-nums text-slate-700 dark:text-white">
            {formatBytes(stats.disk_used)}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ResourceBar({
  icon: Icon,
  label,
  value,
  pct,
  detail,
  href = "/system",
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  pct: number;
  detail?: string;
  href?: string;
}) {
  const { t } = useTranslation();
  const sc = statusColor(pct);
  const alert = pct >= 80;

  return (
    <Card
      padding="compact"
      bodyClassName="mt-0"
      className={`${INNER_SURFACE} h-full ${alert ? sc.card : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
          <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold font-mono tabular-nums ${sc.text}`}>{value}</span>
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${sc.bg}`}
            title={t(sc.labelKey)}
            role="img"
            aria-label={t(sc.labelKey)}
          />
        </div>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full ${sc.bar} transition-all duration-500`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {detail ? (
        <p className="mt-1.5 text-right text-[11px] font-mono tabular-nums text-slate-500 dark:text-white/50">
          {detail}
        </p>
      ) : null}
      {alert ? (
        <Link
          to={href}
          viewTransition
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:underline dark:text-amber-300"
        >
          {t("system_monitor.view_system_details")}
          <ChevronRight size={12} aria-hidden="true" />
        </Link>
      ) : null}
    </Card>
  );
}

function MiniKpi({
  label,
  value,
  icon: Icon,
  color = "text-slate-900 dark:text-white",
  sublabel,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  color?: string;
  sublabel?: string;
}) {
  return (
    <Card padding="compact" bodyClassName="mt-0" className={`${INNER_SURFACE} h-full`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/50">
        <Icon size={12} />
        {label}
      </div>
      <p className={`mt-2 text-2xl font-bold font-mono tabular-nums leading-none ${color}`}>{value}</p>
      {sublabel ? (
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500 dark:text-white/50">{sublabel}</p>
      ) : null}
    </Card>
  );
}

function NetworkCard({ stats }: { stats: SystemStats }) {
  const { t } = useTranslation();
  return (
    <Card padding="compact" bodyClassName="mt-0" className={`${INNER_SURFACE} h-full`}>
      <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/50">
        <Wifi size={12} />
        {t("system_monitor.network_traffic")}
      </div>
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={14} />
            <span className="text-sm font-bold font-mono tabular-nums">
              {formatRate(stats.net_send_rate)}
            </span>
          </div>
          <p className="mt-0.5 text-right text-[11px] text-slate-500 dark:text-white/50">
            {t("system_monitor.up_total", { size: formatBytes(stats.net_bytes_sent) })}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-end gap-1 text-blue-600 dark:text-blue-400">
            <ArrowDownRight size={14} />
            <span className="text-sm font-bold font-mono tabular-nums">
              {formatRate(stats.net_recv_rate)}
            </span>
          </div>
          <p className="mt-0.5 text-right text-[11px] text-slate-500 dark:text-white/50">
            {t("system_monitor.down_total", { size: formatBytes(stats.net_bytes_recv) })}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/60 px-2.5 py-1.5 dark:border-white/[0.06] dark:bg-neutral-900/50">
        <span className="text-[11px] text-slate-500 dark:text-white/50">
          {t("system_monitor.total_traffic")}
        </span>
        <span className="text-xs font-bold font-mono tabular-nums text-slate-700 dark:text-white">
          {formatBytes(stats.net_bytes_sent + stats.net_bytes_recv)}
        </span>
      </div>
    </Card>
  );
}

function AverageLatencyCard({ avgLatency }: { avgLatency: number }) {
  const { t } = useTranslation();
  const latencyClass = latencyToneClass(avgLatency);
  const isHigh = avgLatency >= 5_000;

  return (
    <Card
      padding="compact"
      bodyClassName="mt-0"
      className={`${INNER_SURFACE} h-full overflow-hidden`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-white/50">
          <Network size={12} />
          {t("system_monitor.channel_avg_latency")}
        </div>
      </div>
      <Link
        to="/monitor/request-logs"
        viewTransition
        className="block rounded-xl border border-slate-200/70 bg-white/60 px-3 py-3 transition hover:border-slate-300 hover:bg-white dark:border-white/[0.06] dark:bg-neutral-900/50 dark:hover:border-white/12"
      >
        <div className="text-[11px] font-medium text-slate-500 dark:text-white/50">
          {t("system_monitor.latency")}
        </div>
        <div className={`mt-1 text-right text-2xl font-bold font-mono tabular-nums ${latencyClass}`}>
          {formatMs(avgLatency)}
        </div>
        {isHigh ? (
          <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
            {t("system_monitor.latency_high")}
          </p>
        ) : null}
        <p className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400">
          {t("system_monitor.view_request_logs")} →
        </p>
      </Link>
    </Card>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 dark:bg-neutral-700 ${className}`} />;
}

function SkeletonLayout() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_280px]">
        <Card padding="compact" bodyClassName="mt-0 min-h-[246px]" className={INNER_SURFACE}>
          <Skeleton className="h-full min-h-[200px] w-full" />
        </Card>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="compact" bodyClassName="mt-0" className={INNER_SURFACE}>
              <Skeleton className="mb-3 h-3 w-16" />
              <Skeleton className="h-6 w-20" />
            </Card>
          ))}
        </div>
        <Card padding="compact" bodyClassName="mt-0 min-h-[246px]" className={INNER_SURFACE}>
          <Skeleton className="mx-auto h-32 w-32 rounded-full" />
        </Card>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} padding="compact" bodyClassName="mt-0" className={INNER_SURFACE}>
            <Skeleton className="mb-2 h-3 w-12" />
            <Skeleton className="mb-2 h-4 w-16" />
            <Skeleton className="h-2 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SystemMonitorSection({
  stats,
  connected = false,
  apiKeyCount = 0,
  channelCount = 0,
}: {
  stats?: SystemStats | null;
  connected?: boolean;
  apiKeyCount?: number;
  channelCount?: number;
}) {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t("dashboard.section_system")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-white/55">
              {t("system_monitor.connecting")}
            </p>
          </div>
          <ConnectionStatus connected={connected} />
        </div>
        <div className={`${PANEL_SURFACE} p-4`}>
          <SkeletonLayout />
        </div>
      </section>
    );
  }

  const health = computeHealthScore(stats);
  const logDirSizeBytes = stats.log_dir_size_bytes || stats.log_size_bytes;
  const channelLatency = stats.channel_latency ?? [];
  const latencyWeight = channelLatency.reduce((acc, item) => acc + item.count, 0);
  const averageLatency =
    latencyWeight > 0
      ? channelLatency.reduce((acc, item) => acc + item.avg_ms * item.count, 0) / latencyWeight
      : 0;
  const activeChannels = channelCount > 0 ? channelCount : channelLatency.length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("dashboard.section_system")}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-white/55">
            {t("system_monitor.updated_at", { time: new Date().toLocaleTimeString() })}
          </p>
        </div>
        <ConnectionStatus connected={connected} />
      </div>

      <div className={`${PANEL_SURFACE} space-y-3 p-4`}>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_280px]">
          <HealthOverviewCard score={health} stats={stats} />

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniKpi
              label={t("system_monitor.uptime")}
              value={formatUptime(stats.uptime_seconds)}
              icon={Clock}
              sublabel={t("system_monitor.started", {
                time: new Date(stats.start_time).toLocaleString(),
              })}
            />
            <MiniKpi
              label={t("system_monitor.channel_count")}
              value={String(activeChannels)}
              icon={Activity}
              color="text-violet-600 dark:text-violet-400"
              sublabel={t("system_monitor.key_count_summary", { count: apiKeyCount })}
            />
            <MiniKpi
              label={t("system_monitor.database")}
              value={formatBytes(stats.db_size_bytes)}
              icon={Database}
              sublabel={t("system_monitor.database_sublabel")}
            />
            <MiniKpi
              label={t("system_monitor.log_storage")}
              value={formatBytes(stats.log_content_store_bytes)}
              icon={FileText}
              sublabel={t("system_monitor.log_storage_sublabel")}
            />
          </div>

          <DiskUsageRingCard stats={stats} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ResourceBar
            icon={Cpu}
            label={t("system_monitor.system_cpu")}
            value={`${stats.system_cpu_pct.toFixed(1)}%`}
            pct={stats.system_cpu_pct}
          />
          <ResourceBar
            icon={MemoryStick}
            label={t("system_monitor.system_memory")}
            value={`${stats.system_mem_pct.toFixed(1)}%`}
            pct={stats.system_mem_pct}
            detail={`${formatBytes(stats.system_mem_used)} / ${formatBytes(stats.system_mem_total)}`}
          />
          <ResourceBar
            icon={Cpu}
            label={t("system_monitor.service_cpu")}
            value={`${stats.process_cpu_pct.toFixed(1)}%`}
            pct={Math.min(stats.process_cpu_pct, 100)}
          />
          <ResourceBar
            icon={MemoryStick}
            label={t("system_monitor.service_memory")}
            value={`${stats.process_mem_pct.toFixed(1)}%`}
            pct={stats.process_mem_pct}
            detail={formatBytes(stats.process_mem_bytes)}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_220px]">
          <NetworkCard stats={stats} />
          <AverageLatencyCard avgLatency={averageLatency} />
          <MiniKpi
            label={t("system_monitor.log_dir")}
            value={formatBytes(logDirSizeBytes)}
            icon={Layers}
            sublabel={t("system_monitor.log_files")}
          />
        </div>
      </div>
    </section>
  );
}
