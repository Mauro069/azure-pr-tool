import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AzureConfig, PRStatusFilter } from '../types/azure';
import { getPullRequests, getCurrentUserId } from '../api/pullRequests';
import { branchName } from '../utils/paths';

export function usePRList(config: AzureConfig) {
  const [activeTab, setActiveTab] = useState<PRStatusFilter>('active');

  const [searchText, setSearchText] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [targetBranchFilter, setTargetBranchFilter] = useState('');

  const status = activeTab === 'mine' ? 'active' : activeTab;

  const { data: prs = [], isLoading: loading } = useQuery({
    queryKey: ['pr-list', status],
    queryFn: () => getPullRequests(config, status),
  });

  const { data: currentUserId = null } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => getCurrentUserId(config),
    staleTime: Infinity,
  });

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
