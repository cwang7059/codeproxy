import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import type { AuthFileItem } from "@/lib/http/types";
import {
  AUTH_FILES_PAGE_SIZE,
  authFilesSortCollator,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  resolveAuthFileAvailabilityRank,
  resolveAuthFileStats,
  resolveAuthFileSortKey,
  resolveAuthFilePlanType,
  resolveFileType,
  type AuthFilesSortMode,
  type UsageIndex,
} from "@/modules/auth-files/helpers/authFilesPageUtils";

interface UseAuthFilesListStateOptions {
  files: AuthFileItem[];
  filter: string;
  planFilter: string;
  sortMode: AuthFilesSortMode;
  search: string;
  usageIndex: UsageIndex;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  selectedFileNames: string[];
  setSelectedFileNames: Dispatch<SetStateAction<string[]>>;
}

export function useAuthFilesListState({
  files,
  filter,
  planFilter,
  sortMode,
  search,
  usageIndex,
  page,
  setPage,
  selectedFileNames,
  setSelectedFileNames,
}: UseAuthFilesListStateOptions) {
  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    files.forEach((file) => set.add(resolveFileType(file)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [files]);

  const planOptions = useMemo(() => {
    const set = new Set<string>();
    files.forEach((file) => {
      const planType = normalizeProviderKey(resolveAuthFilePlanType(file) ?? "");
      if (planType) set.add(planType);
    });
    const rank = (value: string) => {
      const order = ["plus", "team", "pro", "free"];
      const index = order.indexOf(value);
      return index === -1 ? order.length : index;
    };
    return Array.from(set).sort((a, b) => {
      const rankA = rank(a);
      const rankB = rank(b);
      return rankA === rankB ? a.localeCompare(b) : rankA - rankB;
    });
  }, [files]);

  const searchFilteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter((file) => {
      if (!q) return true;
      const name = String(file.name || "").toLowerCase();
      const provider = String(file.provider || "").toLowerCase();
      const type = String(file.type || "").toLowerCase();
      const planType = String(resolveAuthFilePlanType(file) || "").toLowerCase();
      return name.includes(q) || provider.includes(q) || type.includes(q) || planType.includes(q);
    });
  }, [files, search]);

  const searchAndProviderFilteredFiles = useMemo(() => {
    const normalizedFilter = normalizeProviderKey(filter);
    return !normalizedFilter || normalizedFilter === "all"
      ? searchFilteredFiles
      : searchFilteredFiles.filter(
          (file) => normalizeProviderKey(resolveFileType(file)) === normalizedFilter,
        );
  }, [filter, searchFilteredFiles]);

  const searchAndPlanFilteredFiles = useMemo(() => {
    const normalizedPlanFilter = normalizeProviderKey(planFilter);
    if (!normalizedPlanFilter || normalizedPlanFilter === "all") {
      return searchFilteredFiles;
    }
    return searchFilteredFiles.filter(
      (file) => normalizeProviderKey(resolveAuthFilePlanType(file) ?? "") === normalizedPlanFilter,
    );
  }, [planFilter, searchFilteredFiles]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    searchAndPlanFilteredFiles.forEach((file) => {
      const typeKey = normalizeProviderKey(resolveFileType(file));
      counts[typeKey] = (counts[typeKey] ?? 0) + 1;
    });
    return { total: searchAndPlanFilteredFiles.length, counts };
  }, [searchAndPlanFilteredFiles]);

  const providerScopedFiles = useMemo(() => {
    const normalizedFilter = normalizeProviderKey(filter);
    return !normalizedFilter || normalizedFilter === "all"
      ? searchAndPlanFilteredFiles
      : searchAndPlanFilteredFiles.filter(
          (file) => normalizeProviderKey(resolveFileType(file)) === normalizedFilter,
        );
  }, [filter, searchAndPlanFilteredFiles]);

  const planFilterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    searchAndProviderFilteredFiles.forEach((file) => {
      const planType = normalizeProviderKey(resolveAuthFilePlanType(file) ?? "");
      if (!planType) return;
      counts[planType] = (counts[planType] ?? 0) + 1;
    });
    return { total: searchAndProviderFilteredFiles.length, counts };
  }, [searchAndProviderFilteredFiles]);

  const filteredFiles = useMemo(() => {
    const compareByName = (a: AuthFileItem, b: AuthFileItem) =>
      authFilesSortCollator.compare(resolveAuthFileSortKey(a), resolveAuthFileSortKey(b));
    const resolveUsageTotal = (file: AuthFileItem) => {
      const stats = resolveAuthFileStats(file, usageIndex);
      return stats.success + stats.failure;
    };
    const nowMs = Date.now();

    return [...providerScopedFiles].sort((a, b) => {
      const availabilityDiff =
        resolveAuthFileAvailabilityRank(a, nowMs) - resolveAuthFileAvailabilityRank(b, nowMs);
      if (availabilityDiff !== 0) return availabilityDiff;

      if (sortMode === "usage_desc" || sortMode === "usage_asc") {
        const diff = resolveUsageTotal(a) - resolveUsageTotal(b);
        if (diff !== 0) return sortMode === "usage_desc" ? -diff : diff;
      }
      return compareByName(a, b);
    });
  }, [providerScopedFiles, sortMode, usageIndex]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / AUTH_FILES_PAGE_SIZE));
  const safePage = Math.min(totalPages, Math.max(1, page));

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * AUTH_FILES_PAGE_SIZE;
    return filteredFiles.slice(start, start + AUTH_FILES_PAGE_SIZE);
  }, [filteredFiles, safePage]);

  const selectableFilteredFiles = useMemo(
    () => filteredFiles.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [filteredFiles],
  );
  const selectablePageFiles = useMemo(
    () => pageItems.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [pageItems],
  );
  const selectableFilteredNameSet = useMemo(
    () => new Set(selectableFilteredFiles.map((file) => file.name)),
    [selectableFilteredFiles],
  );
  const selectablePageNames = useMemo(
    () => selectablePageFiles.map((file) => file.name),
    [selectablePageFiles],
  );
  const selectedFileNameSet = useMemo(() => new Set(selectedFileNames), [selectedFileNames]);
  const selectedCount = selectedFileNames.length;

  const allPageSelected =
    selectablePageNames.length > 0 &&
    selectablePageNames.every((name) => selectedFileNameSet.has(name));
  const somePageSelected =
    !allPageSelected && selectablePageNames.some((name) => selectedFileNameSet.has(name));
  const allFilteredSelected =
    selectableFilteredFiles.length > 0 &&
    selectableFilteredFiles.every((file) => selectedFileNameSet.has(file.name));

  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [page, safePage, setPage]);

  useEffect(() => {
    setSelectedFileNames((prev) => prev.filter((name) => selectableFilteredNameSet.has(name)));
  }, [selectableFilteredNameSet, setSelectedFileNames]);

  const toggleFileSelection = useCallback(
    (name: string, checked: boolean) => {
      setSelectedFileNames((prev) => {
        const next = new Set(prev);
        if (checked) next.add(name);
        else next.delete(name);
        return Array.from(next);
      });
    },
    [setSelectedFileNames],
  );

  const selectCurrentPage = useCallback(
    (checked: boolean) => {
      setSelectedFileNames((prev) => {
        const next = new Set(prev);
        selectablePageNames.forEach((name) => {
          if (checked) next.add(name);
          else next.delete(name);
        });
        return Array.from(next);
      });
    },
    [selectablePageNames, setSelectedFileNames],
  );

  const selectFilteredFiles = useCallback(
    (checked: boolean) => {
      setSelectedFileNames((prev) => {
        const next = new Set(prev);
        selectableFilteredFiles.forEach((file) => {
          if (checked) next.add(file.name);
          else next.delete(file.name);
        });
        return Array.from(next);
      });
    },
    [selectableFilteredFiles, setSelectedFileNames],
  );

  return {
    providerOptions,
    planOptions,
    filterCounts,
    planFilterCounts,
    filteredFiles,
    totalPages,
    safePage,
    pageItems,
    selectableFilteredFiles,
    selectablePageNames,
    selectedFileNameSet,
    selectedCount,
    allPageSelected,
    somePageSelected,
    allFilteredSelected,
    toggleFileSelection,
    selectCurrentPage,
    selectFilteredFiles,
  };
}
