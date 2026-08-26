import { useState, useCallback, useEffect, useMemo } from 'react';
import type { AzureConfig, PRListItem, PRStatusFilter } from '../types/azure';
import { getPullRequests, getCurrentUserId } from '../api/pullRequests';
import { branchName } from '../utils/paths';

export function usePRList(config: AzureConfig) {
  const [prs, setPrs] = useState<PRListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PRStatusFilter>('active');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [targetBranchFilter, setTargetBranchFilter] = useState('');

  useEffect(() => {
    getCurrentUserId(config).then(setCurrentUserId).catch(() => {});
  }, [config]);

  const fetchPRs = useCallback(async (tab: PRStatusFilter) => {
    setLoading(true);
    try {
      const status = tab === 'mine' ? 'active' : tab;
      const list = await getPullRequests(config, status);
      setPrs(list);
    } catch {
      setPrs([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchPRs(activeTab);
  }, [activeTab, fetchPRs]);

  const handleTabChange = (tab: PRStatusFilter) => {
    setActiveTab(tab);
    setSearchText('');
    setCreatedByFilter('');
    setTargetBranchFilter('');
  };

  const creators = useMemo(() => [...new Set(prs.map((pr) => pr.createdBy.displayName))].sort(), [prs]);
  const targetBranches = useMemo(() => [...new Set(prs.map((pr) => branchName(pr.targetRefName)))].sort(), [prs]);

  const hasFilters = searchText || createdByFilter || targetBranchFilter;

  const clearFilters = () => {
    setSearchText('');
    setCreatedByFilter('');
    setTargetBranchFilter('');
  };

  const filteredPrs = useMemo(() => {
    let result = prs;

    if (activeTab === 'mine' && currentUserId) {
      result = result.filter(
        (pr) =>
          pr.createdBy.id === currentUserId ||
          pr.reviewers?.some((r) => r.id === currentUserId)
      );
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (pr) =>
          pr.title.toLowerCase().includes(q) ||
          pr.pullRequestId.toString().includes(q)
      );
    }

    if (createdByFilter) {
      result = result.filter((pr) => pr.createdBy.displayName === createdByFilter);
    }

    if (targetBranchFilter) {
      result = result.filter((pr) => branchName(pr.targetRefName) === targetBranchFilter);
    }

    return result;
  }, [prs, activeTab, currentUserId, searchText, createdByFilter, targetBranchFilter]);

  return {
    loading,
    activeTab,
    filteredPrs,
    creators,
    targetBranches,
    hasFilters,
    searchText,
    createdByFilter,
    targetBranchFilter,
    setSearchText,
    setCreatedByFilter,
    setTargetBranchFilter,
    handleTabChange,
    clearFilters,
  };
}
