import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AzureConfig } from '../types/azure';
import { votePR } from '../api/pullRequests';

export function useVote(config: AzureConfig, prId: number) {
  const queryClient = useQueryClient();
  const [voting, setVoting] = useState(false);

  const handleVote = useCallback(async (vote: number) => {
    setVoting(true);
    try {
      await votePR(config, prId, vote);
      queryClient.invalidateQueries({ queryKey: ['pr-detail', prId] });
    } catch {
      // ignore
    } finally {
      setVoting(false);
    }
  }, [config, prId, queryClient]);

  return { voting, handleVote };
}
