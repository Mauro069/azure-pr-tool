import { useState, useCallback } from 'react';
import type { FileChange } from '../types/azure';
import type { ReviewIssue } from '../types/review';
import { runAIReview } from '../services/reviewService';

export function useAIReview(
  geminiKey: string,
  setStatus: (msg: string) => void
) {
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [reviewDuration, setReviewDuration] = useState(0);

  const startReview = useCallback(async (
    prTitle: string,
    prDescription: string,
    fileChanges: FileChange[]
  ) => {
    if (!geminiKey || fileChanges.length === 0) return;
    setReviewing(true);
    setIssues([]);
    setReviewDuration(0);

    try {
      setStatus(`Enviando ${fileChanges.length} archivos a Gemini...`);
      const result = await runAIReview(geminiKey, prTitle, prDescription, fileChanges);
      setIssues(result.issues);
      setReviewDuration(result.duration);
      setStatus(result.issues.length === 0
        ? 'Sin problemas relevantes.'
        : `${result.issues.length} problema(s) encontrado(s)`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`ERROR: ${msg}`);
    } finally {
      setReviewing(false);
    }
  }, [geminiKey, setStatus]);

  return { issues, reviewing, reviewDuration, startReview };
}
