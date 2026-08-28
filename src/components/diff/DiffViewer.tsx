import { useState, useEffect, useRef } from 'react';
import type { AzureConfig, FileChange } from '../../types/azure';
import type { ReviewIssue } from '../../types/review';
import { useThreads } from '../../hooks/useThreads';
import { pathsMatch } from '../../utils/paths';
import { FileDiff } from './FileDiff';

interface Props {
  config: AzureConfig;
  prId: number;
  files: FileChange[];
  issues: ReviewIssue[];
  onBack: () => void;
  hideBackButton?: boolean;
  onReviewFile?: (file: FileChange) => void;
  reviewingFiles?: Set<string>;
  reviewing?: boolean;
}

export function DiffViewer({ config, prId, files, issues, onBack, hideBackButton, onReviewFile, reviewingFiles, reviewing }: Props) {
  const { threads, loadingThreads, refresh: refreshThreads } = useThreads(config, prId);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const prevIssuesLen = useRef(0);
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-collapse files without comments when AI review completes
  useEffect(() => {
    if (prevIssuesLen.current === 0 && issues.length > 0) {
      const filesWithIssues = new Set<string>();
      for (const issue of issues) {
        for (const f of files) {
          if (pathsMatch(issue.file, f.path)) {
            filesWithIssues.add(f.path);
          }
        }
      }
      for (const t of threads) {
        const tp = t.threadContext?.filePath ?? '';
        for (const f of files) {
          if (pathsMatch(tp, f.path)) {
            filesWithIssues.add(f.path);
          }
        }
      }
      const toCollapse = new Set<string>();
      for (const f of files) {
        if (!filesWithIssues.has(f.path)) {
          toCollapse.add(f.path);
        }
      }
      setCollapsedFiles(toCollapse);
    }
    prevIssuesLen.current = issues.length;
  }, [issues, files, threads]);

  const getThreadsForFile = (filePath: string) =>
    threads.filter((t) => pathsMatch(t.threadContext?.filePath ?? '', filePath));

  const getIssuesForFile = (filePath: string) =>
    issues.filter((i) => pathsMatch(i.file, filePath));

  return (
    <div className="space-y-3">
      {!hideBackButton && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-500 hover:text-accent-700 cursor-pointer"
          >
            ← Volver al resumen
          </button>
          <div className="flex items-center gap-2 text-[11px] text-neutral-600">
            {loadingThreads && <span>Cargando comentarios...</span>}
            <span>{files.length} archivo{files.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '80vh' }}>
        {files.map((file) => (
          <div
            key={file.path}
            ref={(el) => { if (el) fileRefs.current.set(file.path, el); }}
          >
            <FileDiff
              file={file}
              threads={getThreadsForFile(file.path)}
              issues={getIssuesForFile(file.path)}
              config={config}
              prId={prId}
              onThreadsUpdate={refreshThreads}
              collapsed={collapsedFiles.has(file.path)}
              onReviewFile={onReviewFile}
              isReviewingFile={reviewingFiles?.has(file.path) ?? false}
              isFullReviewing={reviewing ?? false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
