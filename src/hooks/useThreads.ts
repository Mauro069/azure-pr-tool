import { useState, useCallback, useEffect } from 'react';
import type { AzureConfig, PRThread } from '../types/azure';
import { getPRThreads } from '../api/pullRequests';

export function useThreads(config: AzureConfig, prId: number) {
  const [threads, setThreads] = useState<PRThread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);

  const refresh = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const t = await getPRThreads(config, prId);
      setThreads(t.filter((th) => {
        if (!th.threadContext?.filePath) return false;
        // Filtrar threads donde todos los comentarios fueron borrados
        const visible = th.comments.filter((c) => c.commentType !== 2 && !c.isDeleted);
        return visible.length > 0;
      }));
    } catch {
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [config, prId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { threads, loadingThreads, refresh };
}
