export function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "--";
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}***${trimmed.slice(-2)}`;
  }
  return `${trimmed.slice(0, 6)}***${trimmed.slice(-4)}`;
}
