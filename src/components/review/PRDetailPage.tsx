import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AzureConfig, FileChange } from '../../types/azure';
import type { AIProvider } from '../../types/ai';
import { usePRDetail } from '../../hooks/usePRDetail';
import { useAIReview } from '../../hooks/useAIReview';
import { useVote } from '../../hooks/useVote';
import { branchName } from '../../utils/paths';
import { DiffViewer } from '../diff/DiffViewer';
import { PRActionBar } from './PRActionBar';

interface Props {
  config: AzureConfig;
  aiProvider: AIProvider | null;
}

export function PRDetailPage({ config, aiProvider }: Props) {
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
  } = usePRDetail(config, prId);

  const { issues, reviewing, reviewDuration, reviewingFiles, startReview, reviewFile } = useAIReview(aiProvider, setStatus);
  const { voting, handleVote } = useVote(config, prId);

  const handleBack = useCallback(() => {
    navigate('/review');
  }, [navigate]);

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
      <div>
        <button
          onClick={handleBack}
          className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-500 hover:text-accent-700 cursor-pointer mb-4"
        >
          ← Volver a pull requests
        </button>
        <div className="font-mono text-[12px] text-accent-800 bg-accent-50 border-l-[3px] border-accent-500 px-3 py-2">
          {status || 'Cargando archivos...'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PRActionBar
        prId={prId}
        prTitle={prInfo?.title ?? ''}
        reviewers={reviewers}
        hasAI={!!aiProvider}
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[11px] border border-neutral-400 text-neutral-800 px-1.5 py-0.5">
            {branchName(prInfo.sourceRefName)}
          </span>
          <span className="text-neutral-500 text-[11px]">→</span>
          <span className="font-mono text-[11px] border border-neutral-400 text-neutral-800 px-1.5 py-0.5">
            {branchName(prInfo.targetRefName)}
          </span>
          {stats && (
            <span className="text-[11px] text-neutral-600 ml-2">
              {stats.reviewed} archivos · {stats.skipped.length} skipeados · {stats.binary.length} binarios
            </span>
          )}
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="font-mono text-[12px] text-accent-800 bg-accent-50 border-l-[3px] border-accent-500 px-3 py-2">
          {status}
        </div>
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
          onReviewFile={aiProvider ? handleFileReview : undefined}
          reviewingFiles={reviewingFiles}
          reviewing={reviewing}
        />
      )}

      {fileChanges.length === 0 && !loadingFiles && (
        <div className="text-center py-8 text-neutral-500 text-[13px]">No se encontraron archivos para mostrar.</div>
      )}
    </div>
  );
}
