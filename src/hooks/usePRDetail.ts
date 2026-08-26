import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AzureConfig } from '../types/azure';
import { loadPRForReview } from '../services/reviewService';

export function usePRDetail(config: AzureConfig, prId: number) {
  const [status, setStatus] = useState('');

  const { data, isLoading: loadingFiles } = useQuery({
    queryKey: ['pr-detail', prId],
    queryFn: () => loadPRForReview(config, prId),
    enabled: !!prId,
  });

  return {
    loadingFiles,
    fileChanges: data?.files ?? [],
    stats: data?.stats ?? null,
    status,
    setStatus,
    prInfo: data?.prInfo ?? null,
    reviewers: data?.reviewers ?? [],
  };
}
