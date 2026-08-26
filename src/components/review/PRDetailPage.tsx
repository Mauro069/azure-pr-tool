import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AzureConfig, FileChange } from '../../types/azure';
import { usePRDetail } from '../../hooks/usePRDetail';
import { useAIReview } from '../../hooks/useAIReview';
import { useVote } from '../../hooks/useVote';
import { branchName } from '../../utils/paths';
import { DiffViewer } from '../diff/DiffViewer';
import { PRActionBar } from './PRActionBar';

interface Props {
  config: AzureConfig;
  geminiKey: string;
  onWideMode?: (wide: boolean) => void;
}

export function PRDetailPage({ config, geminiKey, onWideMode }: Props) {
  const { prId: prIdParam } = useParams<{ prId: string }>();
  const navigate = useNavigate();
  const prId = Number(prIdParam);

  const {
    loadingFiles,
    fileChanges,
    stats,
    status,
    setStatus,
    prInfo,
    reviewers,
    setReviewers,
  } = usePRDetail(config, prId);

  const { issues, reviewing, reviewDuration, reviewingFiles, startReview, reviewFile } = useAIReview(geminiKey, setStatus);
  const { voting, handleVote } = useVote(config, prId, setReviewers);

  useEffect(() => {
    if (prId) onWideMode?.(true);
    return () => { onWideMode?.(false); };
  }, [prId, onWideMode]);

  const handleBack = useCallback(() => {
    onWideMode?.(false);
    navigate('/review');
  }, [onWideMode, navigate]);

  const handleAIReview = useCallback(() => {
    if (prInfo) {
      startReview(prInfo.title, prInfo.description, fileChanges);
    }
  }, [prInfo, fileChanges, startReview]);

  const handleFileReview = useCallback((file: FileChange) => {
    if (prInfo) {
      reviewFile(prInfo.title, prInfo.description, file);
    }
  }, [prInfo, reviewFile]);

  if (loadingFiles) {
    return (
      <div className="space-y-4">
        <button onClick={handleBack} className="text-sm text-gray-400 hover:text-white cursor-pointer">← Volver a la lista</button>
        <div className="font-mono text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3">{status || 'Cargando archivos...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PRActionBar
        prId={prId}
        prTitle={prInfo?.title ?? ''}
        reviewers={reviewers}
        geminiKey={geminiKey}
        reviewing={reviewing}
        reviewingFileCount={reviewingFiles.size}
        voting={voting}
        issues={issues}
        reviewDuration={reviewDuration}
        fileCount={fileChanges.length}
        onVote={handleVote}
        onAIReview={handleAIReview}
        onBack={handleBack}
      />

      {/* Branch info */}
      {prInfo?.sourceRefName && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{branchName(prInfo.sourceRefName)}</span>
          <span className="text-gray-600 text-xs">→</span>
          <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{branchName(prInfo.targetRefName)}</span>
          {stats && (
            <span className="text-[10px] text-gray-500 ml-2">
              {stats.reviewed} archivos · {stats.skipped.length} skipeados · {stats.binary.length} binarios
            </span>
          )}
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="font-mono text-xs text-gray-400 bg-gray-800/50 rounded-lg p-2">{status}</div>
      )}

      {/* Diff viewer */}
      {fileChanges.length > 0 && (
        <DiffViewer
          config={config}
          prId={prId}
          files={fileChanges}
          issues={issues}
          onBack={handleBack}
          hideBackButton
          onReviewFile={geminiKey ? handleFileReview : undefined}
          reviewingFiles={reviewingFiles}
          reviewing={reviewing}
        />
      )}

      {fileChanges.length === 0 && !loadingFiles && (
        <div className="text-center py-8 text-gray-500 text-sm">No se encontraron archivos para mostrar.</div>
      )}
    </div>
  );
}
