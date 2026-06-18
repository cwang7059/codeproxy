import { parseLogLine } from "@/modules/logs/logsHelpers";

export type LogLevelStats = {
  total: number;
  error: number;
  warn: number;
  info: number;
};

export function computeLogLevelStats(lines: string[]): LogLevelStats {
  const stats: LogLevelStats = { total: lines.length, error: 0, warn: 0, info: 0 };
  for (const line of lines) {
    const { level } = parseLogLine(line);
    if (level === "error" || level === "fatal") stats.error += 1;
    else if (level === "warn") stats.warn += 1;
    else if (level === "info") stats.info += 1;
  }
  return stats;
}

export function readLoggingToFile(config: Record<string, unknown>): boolean {
  const value = config["logging-to-file"] ?? config.loggingToFile;
  return Boolean(value);
}

export type LiveLogsEmptyKind = "loading" | "logging_disabled" | "waiting" | "filtered";

export function resolveLiveLogsEmptyKind(input: {
  loading: boolean;
  loggingToFile: boolean | null;
  bufferCount: number;
  filteredCount: number;
}): LiveLogsEmptyKind | null {
  if (input.filteredCount > 0) return null;
  if (input.loading && input.bufferCount === 0) return "loading";
  if (input.loggingToFile === false) return "logging_disabled";
  if (input.bufferCount > 0) return "filtered";
  return "waiting";
}
