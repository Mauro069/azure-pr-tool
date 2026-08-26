import { useState, useCallback } from 'react';
import type { AzureConfig, ProcessedWorkItem } from '../types/azure';
import { executeDeploy } from '../services/deployService';

export function useDeploy(config: AzureConfig) {
  const [results, setResults] = useState<ProcessedWorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const handleProcess = useCallback(async (prIds: number[]) => {
    setLoading(true);
    setResults([]);
    setLog([]);

    const allResults: ProcessedWorkItem[] = [];

    await executeDeploy(config, prIds, {
      onLog: (msg) => setLog((prev) => [...prev, msg]),
      onResult: (result) => allResults.push(result),
    });

    setResults(allResults);
    setLoading(false);
  }, [config]);

  return { results, loading, log, handleProcess };
}
