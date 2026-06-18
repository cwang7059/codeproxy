import type { BedrockProviderConfig, OpenAIProvider, ProviderSimpleConfig } from "@/lib/http/types";
import type { ProviderImportKind } from "@/modules/providers/provider-import-export";

export type ProviderTab =
  | "gemini"
  | "claude"
  | "codex"
  | "opencode-go"
  | "vertex"
  | "bedrock"
  | "openai"
  | "ampcode";

export type ProviderSimpleKeyType = Exclude<ProviderImportKind, "openai">;

export type ProviderDeleteConfirm =
  | {
      type: "deleteKey";
      keyType: ProviderSimpleKeyType;
      index: number;
    }
  | { type: "deleteOpenAI"; index: number };

export const getProviderSelectionKey = (
  kind: ProviderImportKind,
  item: ProviderSimpleConfig | BedrockProviderConfig | OpenAIProvider,
) =>
  kind === "openai"
    ? String((item as OpenAIProvider).name ?? "")
        .trim()
        .toLowerCase()
    : String((item as ProviderSimpleConfig).apiKey ?? "")
        .trim()
        .toLowerCase();
