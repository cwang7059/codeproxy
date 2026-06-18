import type { SystemStats } from "@/modules/dashboard/useSystemStats";

export type HealthScoreFactor = {
  key: string;
  labelKey: string;
  pct: number;
};

export function computeHealthScore(stats: SystemStats): number {
  const cpuScore = Math.max(0, 100 - stats.system_cpu_pct);
  const memScore = Math.max(0, 100 - stats.system_mem_pct);
  const procCpu = Math.max(0, 100 - Math.min(stats.process_cpu_pct, 100));
  const procMem = Math.max(0, 100 - stats.process_mem_pct);
  return cpuScore * 0.3 + memScore * 0.3 + procCpu * 0.2 + procMem * 0.2;
}

export function buildHealthScoreFactors(stats: SystemStats): HealthScoreFactor[] {
  return [
    {
      key: "system_memory",
      labelKey: "system_monitor.system_memory",
      pct: stats.system_mem_pct,
    },
    {
      key: "system_cpu",
      labelKey: "system_monitor.system_cpu",
      pct: stats.system_cpu_pct,
    },
    {
      key: "service_cpu",
      labelKey: "system_monitor.service_cpu",
      pct: Math.min(stats.process_cpu_pct, 100),
    },
    {
      key: "service_memory",
      labelKey: "system_monitor.service_memory",
      pct: stats.process_mem_pct,
    },
    {
      key: "disk",
      labelKey: "system_monitor.disk",
      pct: stats.disk_pct,
    },
  ].sort((a, b) => b.pct - a.pct);
}

export function healthFactorTone(pct: number): "warn" | "critical" | "normal" {
  if (pct >= 95) return "critical";
  if (pct >= 80) return "warn";
  return "normal";
}

export function latencyTone(ms: number): "critical" | "warn" | "normal" {
  if (ms >= 10_000) return "critical";
  if (ms >= 5_000) return "warn";
  return "normal";
}

export function latencyToneClass(ms: number): string {
  const tone = latencyTone(ms);
  if (tone === "critical") return "text-rose-600 dark:text-rose-400";
  if (tone === "warn") return "text-amber-600 dark:text-amber-400";
  return "text-slate-900 dark:text-white";
}
