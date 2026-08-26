import { useState, useCallback } from 'react';
import type { FileChange } from '../types/azure';
import type { ReviewIssue } from '../types/review';
import { runAIReview } from '../services/reviewService';
import { pathsMatch } from '../utils/paths';

export function useAIReview(
  geminiKey: string,
  setStatus: (msg: string) => void
) {
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [reviewDuration, setReviewDuration] = useState(0);
  const [reviewingFiles, setReviewingFiles] = useState<Set<string>>(new Set());

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

  const reviewFile = useCallback(async (
    prTitle: string,
    prDescription: string,
    file: FileChange
  ) => {
    if (!geminiKey) return;
    setReviewingFiles(prev => new Set([...prev, file.path]));

    try {
      setStatus(`Revisando ${file.path}...`);
      const result = await runAIReview(geminiKey, prTitle, prDescription, [file]);
      setIssues(prev => {
        const otherIssues = prev.filter(i => !pathsMatch(i.file, file.path));
        return [...otherIssues, ...result.issues];
      });
      const fileName = file.path.split('/').pop() ?? file.path;
      setStatus(result.issues.length === 0
        ? `${fileName}: sin problemas`
        : `${fileName}: ${result.issues.length} problema(s)`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`ERROR (${file.path}): ${msg}`);
    } finally {
      setReviewingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.path);
        return next;
      });
    }
  }, [geminiKey, setStatus]);

  return { issues, reviewing, reviewDuration, reviewingFiles, startReview, reviewFile };
}
