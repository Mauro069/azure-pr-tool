import { useState, useCallback } from 'react';
import type { AzureConfig, PRReviewer } from '../types/azure';
import { votePR, getPRReviewers } from '../api/pullRequests';

export function useVote(
  config: AzureConfig,
  prId: number,
  setReviewers: (reviewers: PRReviewer[]) => void
) {
  const [voting, setVoting] = useState(false);

  const handleVote = useCallback(async (vote: number) => {
    setVoting(true);
    try {
      await votePR(config, prId, vote);
      const revs = await getPRReviewers(config, prId);
      setReviewers(revs);
    } catch {
      // ignore
    } finally {
      setVoting(false);
    }
  }, [config, prId, setReviewers]);

  return { voting, handleVote };
}
