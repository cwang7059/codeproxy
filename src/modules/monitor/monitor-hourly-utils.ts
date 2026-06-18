export function parseHourTimestamp(hour: string): number {
  const match = hour.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return Number.NaN;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  ).getTime();
}

export function sortHourKeys(hours: string[]): string[] {
  return [...hours].sort((left, right) => {
    const leftTs = parseHourTimestamp(left);
    const rightTs = parseHourTimestamp(right);
    if (Number.isFinite(leftTs) && Number.isFinite(rightTs)) {
      return leftTs - rightTs;
    }
    return left.localeCompare(right);
  });
}

export function formatHourAxisLabel(hour: string, now = new Date()): string {
  const timestamp = parseHourTimestamp(hour);
  if (!Number.isFinite(timestamp)) return hour;

  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  const timeLabel = `${pad(date.getHours())}:${pad(date.getMinutes())}`;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const pointStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayOffset = Math.round((todayStart - pointStart) / 86_400_000);

  if (dayOffset === 0) return timeLabel;
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${timeLabel}`;
}
