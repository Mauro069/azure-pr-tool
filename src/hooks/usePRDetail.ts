import { useState, useEffect } from 'react';
import type { AzureConfig, FileChange, PRReviewer } from '../types/azure';
import type { FileStats } from '../types/review';
import { loadPRForReview, type PRInfo } from '../services/reviewService';

export function usePRDetail(config: AzureConfig, prId: number) {
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [status, setStatus] = useState('');
  const [prInfo, setPrInfo] = useState<PRInfo | null>(null);
  const [reviewers, setReviewers] = useState<PRReviewer[]>([]);

  useEffect(() => {
    if (!prId) return;

    const load = async () => {
      setLoadingFiles(true);
      setStatus('Cargando archivos...');
      try {
        const result = await loadPRForReview(config, prId);
        setPrInfo(result.prInfo);
        setFileChanges(result.files);
        setStats(result.stats);
        setReviewers(result.reviewers);
        setStatus('');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`ERROR: ${msg}`);
      } finally {
        setLoadingFiles(false);
      }
    };

    load();
  }, [config, prId]);

  return {
    loadingFiles,
    fileChanges,
    stats,
    status,
    setStatus,
    prInfo,
    reviewers,
    setReviewers,
  };
}
