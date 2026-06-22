export function createUploadPreviewUrl(file: File): string {
  if (typeof URL.createObjectURL === "function") {
    return URL.createObjectURL(file);
  }
  return `data:${file.type || "image/png"};base64,`;
}

export function revokeUploadPreviewUrl(url: string) {
  if (url && url.startsWith("blob:") && typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

export function formatGenerationElapsed(ms: number | null): string | null {
  if (ms === null) return null;
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function extractImageGenerationTaskError(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const body =
    "body" in error && error.body && typeof error.body === "object"
      ? (error.body as Record<string, unknown>)
      : null;
  const nested =
    body?.error && typeof body.error === "object" && !Array.isArray(body.error)
      ? (body.error as Record<string, unknown>)
      : null;
  const message = nested?.message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}
