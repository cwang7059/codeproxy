/**
 * Resolver functions for extracting data from auth files.
 */

import type { AuthFileItem } from "@/lib/http/types";
import { normalizeStringValue, normalizePlanType, parseIdTokenPayload } from "./parsers";

const OPENAI_AUTH_CLAIM_KEY = "https://api.openai.com/auth";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const resolveCodexAuthPayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> | null => {
  const nested = payload[OPENAI_AUTH_CLAIM_KEY];
  return isRecord(nested) ? nested : null;
};

const readDefaultOrganizationId = (payload: Record<string, unknown>): string | null => {
  const organizations = Array.isArray(payload.organizations) ? payload.organizations : [];
  const records = organizations.filter(isRecord);
  if (records.length === 0) return null;

  const preferred =
    records.find((org) => org.is_default === true || org.isDefault === true) ?? records[0];
  return normalizeStringValue(
    preferred.id ??
      preferred.organization_id ??
      preferred.organizationId ??
      preferred.account_id ??
      preferred.accountId,
  );
};

const resolveCodexChatgptAccountIdFromPayload = (
  payload: Record<string, unknown>,
): string | null => {
  const direct = normalizeStringValue(
    payload.chatgpt_account_id ??
      payload.chatgptAccountId ??
      payload.account_id ??
      payload.accountId,
  );
  if (direct) return direct;

  const authPayload = resolveCodexAuthPayload(payload);
  if (authPayload) {
    const nested = normalizeStringValue(
      authPayload.chatgpt_account_id ??
        authPayload.chatgptAccountId ??
        authPayload.account_id ??
        authPayload.accountId,
    );
    if (nested) return nested;
    return readDefaultOrganizationId(authPayload);
  }

  return readDefaultOrganizationId(payload);
};

export function extractCodexChatgptAccountId(value: unknown): string | null {
  const payload = parseIdTokenPayload(value);
  if (!payload) return null;
  return resolveCodexChatgptAccountIdFromPayload(payload);
}

export function resolveCodexChatgptAccountId(file: AuthFileItem): string | null {
  const metadata =
    file && isRecord(file.metadata)
      ? (file.metadata as Record<string, unknown>)
      : null;
  const attributes =
    file && isRecord(file.attributes)
      ? (file.attributes as Record<string, unknown>)
      : null;

  const directCandidates = [
    file.chatgpt_account_id,
    file.chatgptAccountId,
    file.account_id,
    file.accountId,
    metadata?.chatgpt_account_id,
    metadata?.chatgptAccountId,
    metadata?.account_id,
    metadata?.accountId,
    attributes?.chatgpt_account_id,
    attributes?.chatgptAccountId,
    attributes?.account_id,
    attributes?.accountId,
  ];

  for (const candidate of directCandidates) {
    const id = normalizeStringValue(candidate);
    if (id) return id;
  }

  const candidates = [file.id_token, metadata?.id_token, attributes?.id_token];

  for (const candidate of candidates) {
    const id = extractCodexChatgptAccountId(candidate);
    if (id) return id;
  }

  return null;
}

export function resolveCodexPlanType(file: AuthFileItem): string | null {
  const metadata =
    file && isRecord(file.metadata)
      ? (file.metadata as Record<string, unknown>)
      : null;
  const attributes =
    file && isRecord(file.attributes)
      ? (file.attributes as Record<string, unknown>)
      : null;
  const idToken = isRecord(file.id_token) ? file.id_token : null;
  const metadataIdToken = isRecord(metadata?.id_token) ? metadata.id_token : null;
  const authPayload = idToken ? resolveCodexAuthPayload(idToken) : null;
  const metadataAuthPayload = metadataIdToken ? resolveCodexAuthPayload(metadataIdToken) : null;
  const candidates = [
    file.plan_type,
    file.planType,
    file["plan_type"],
    file["planType"],
    file.id_token,
    idToken?.plan_type,
    idToken?.planType,
    authPayload?.chatgpt_plan_type,
    authPayload?.chatgptPlanType,
    authPayload?.plan_type,
    authPayload?.planType,
    metadata?.plan_type,
    metadata?.planType,
    metadata?.id_token,
    metadataIdToken?.plan_type,
    metadataIdToken?.planType,
    metadataAuthPayload?.chatgpt_plan_type,
    metadataAuthPayload?.chatgptPlanType,
    metadataAuthPayload?.plan_type,
    metadataAuthPayload?.planType,
    attributes?.plan_type,
    attributes?.planType,
    attributes?.id_token,
  ];

  for (const candidate of candidates) {
    const planType = normalizePlanType(candidate);
    if (planType) return planType;
  }

  return null;
}

export function extractGeminiCliProjectId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const matches = Array.from(value.matchAll(/\(([^()]+)\)/g));
  if (matches.length === 0) return null;
  const candidate = matches[matches.length - 1]?.[1]?.trim();
  return candidate ? candidate : null;
}

export function resolveGeminiCliProjectId(file: AuthFileItem): string | null {
  const metadata =
    file && typeof file.metadata === "object" && file.metadata !== null
      ? (file.metadata as Record<string, unknown>)
      : null;
  const attributes =
    file && typeof file.attributes === "object" && file.attributes !== null
      ? (file.attributes as Record<string, unknown>)
      : null;

  const candidates = [file.account, file["account"], metadata?.account, attributes?.account];

  for (const candidate of candidates) {
    const projectId = extractGeminiCliProjectId(candidate);
    if (projectId) return projectId;
  }

  return null;
}
