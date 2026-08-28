import { useState, useEffect } from 'react';
import type { AzureConfig, FileChange, PRThread } from '../../types/azure';
import type { ReviewIssue } from '../../types/review';
import { computeDiff, collapseUnchanged, type DiffLine, type DiffChunk } from '../../utils/diff';
import { InlineThread } from './InlineThread';
import { IssueInline } from './IssueInline';

interface Props {
  file: FileChange;
  threads: PRThread[];
  issues: ReviewIssue[];
  config: AzureConfig;
  prId: number;
  onThreadsUpdate: () => void;
  collapsed?: boolean;
  onReviewFile?: (file: FileChange) => void;
  isReviewingFile?: boolean;
  isFullReviewing?: boolean;
}

export function FileDiff({ file, threads, issues, config, prId, onThreadsUpdate, collapsed: initialCollapsed = false, onReviewFile, isReviewingFile = false, isFullReviewing = false }: Props) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [copiedPath, setCopiedPath] = useState(false);

  useEffect(() => {
    setCollapsed(initialCollapsed);
  }, [initialCollapsed]);

  const oldContent = file.oldContent ?? '';
  const newContent = file.newContent ?? '';

  let diffLines: DiffLine[];
  let chunks: DiffChunk[];

  if (file.changeType === 'add') {
    diffLines = newContent.split('\n').map((content, i) => ({
      type: 'add' as const, content, newLine: i + 1,
    }));
    chunks = [{ type: 'lines', lines: diffLines }];
  } else if (file.changeType === 'delete') {
    diffLines = oldContent.split('\n').map((content, i) => ({
      type: 'remove' as const, content, oldLine: i + 1,
    }));
    chunks = [{ type: 'lines', lines: diffLines }];
  } else {
    diffLines = computeDiff(oldContent, newContent);
    chunks = collapseUnchanged(diffLines);
  }

  const addedCount = diffLines.filter((l) => l.type === 'add').length;
  const removedCount = diffLines.filter((l) => l.type === 'remove').length;

  const threadsByLine = new Map<number, PRThread[]>();
  for (const t of threads) {
    const line = t.threadContext?.rightFileStart?.line;
    if (line) {
      if (!threadsByLine.has(line)) threadsByLine.set(line, []);
      threadsByLine.get(line)!.push(t);
    }
  }

  const issuesByLine = new Map<number, ReviewIssue[]>();
  for (const issue of issues) {
    const start = parseInt(issue.line.split('-')[0], 10);
    if (start) {
      if (!issuesByLine.has(start)) issuesByLine.set(start, []);
      issuesByLine.get(start)!.push(issue);
    }
  }

  const [expandedCollapsed, setExpandedCollapsed] = useState<Set<number>>(new Set());

  const lineColors = {
    add: 'bg-green-100',
    remove: 'bg-accent-200',
    unchanged: '',
  };

  const lineNumColors = {
    add: 'text-neutral-500',
    remove: 'text-neutral-500',
    unchanged: 'text-neutral-400',
  };

  const prefixColors = {
    add: 'text-neutral-800 font-bold',
    remove: 'text-accent-700 font-bold',
    unchanged: 'text-neutral-400',
  };

  const renderLine = (line: DiffLine, key: string) => {
    const lineNum = line.type === 'add' ? line.newLine : (line.type === 'remove' ? line.oldLine : line.newLine);
    const lineThreads = lineNum ? threadsByLine.get(lineNum) ?? [] : [];
    const lineIssues = lineNum ? issuesByLine.get(lineNum) ?? [] : [];

    return (
      <div key={key}>
        <div className={`grid font-mono text-[11.5px] leading-[1.6] ${lineColors[line.type]}`} style={{ gridTemplateColumns: '44px 44px 16px 1fr' }}>
          <span className={`text-right pr-2 select-none ${lineNumColors[line.type]}`}>
            {line.oldLine ?? ''}
          </span>
          <span className={`text-right pr-2 select-none ${lineNumColors[line.type]}`}>
            {line.newLine ?? ''}
          </span>
          <span className={`text-center select-none ${prefixColors[line.type]}`}>
            {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
          </span>
          <span className="whitespace-pre-wrap overflow-x-auto pr-4">
            {line.content}
          </span>
        </div>
        {lineThreads.map((t) => (
          <InlineThread key={t.id} thread={t} config={config} prId={prId} onReplySubmitted={onThreadsUpdate} />
        ))}
        {lineIssues.map((issue, j) => (
          <IssueInline key={`issue-${lineNum}-${j}`} issue={issue} config={config} prId={prId} onPublished={onThreadsUpdate} />
        ))}
      </div>
    );
  };

  return (
    <div className="border border-neutral-300 overflow-hidden">
      {/* File header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        className={`w-full flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors hover:bg-neutral-900/[0.04] ${
          !collapsed ? 'border-b border-neutral-300' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-neutral-500 shrink-0">{collapsed ? '▶' : '▼'}</span>
          <span
            className="font-mono text-[12px] font-semibold text-neutral-900 truncate hover:text-accent-500 transition-colors"
            title="Click para copiar path"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(file.path);
              setCopiedPath(true);
              setTimeout(() => setCopiedPath(false), 1500);
            }}
          >
            {copiedPath ? '✓ Copiado!' : file.path}
          </span>
          {issues.length > 0 && (
            <span className="text-[10px] font-bold uppercase bg-accent-500 text-white px-1.5 py-0.5 shrink-0">
              {issues.length} hallazgo{issues.length !== 1 ? 's' : ''} IA
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[12px] font-mono">
          {onReviewFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReviewFile(file);
              }}
              disabled={isReviewingFile || isFullReviewing}
              title="Revisar este archivo con IA"
              className="px-2 py-0.5 text-[11px] font-semibold border border-neutral-400 text-neutral-700 hover:bg-neutral-900/[0.07] disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isReviewingFile ? (
                <span className="inline-block animate-pulse">● IA</span>
              ) : (
                'Revisar con IA'
              )}
            </button>
          )}
          {removedCount > 0 && <span className="text-accent-700">−{removedCount}</span>}
          {addedCount > 0 && <span className="text-neutral-800">+{addedCount}</span>}
        </div>
      </div>

      {/* Diff content */}
      {!collapsed && (
        <div className="overflow-x-auto">
          {chunks.map((chunk, ci) => {
            if (chunk.type === 'collapsed') {
              if (expandedCollapsed.has(chunk.startIndex)) {
                const allLines = file.changeType === 'add'
                  ? newContent.split('\n').map((c, i) => ({ type: 'add' as const, content: c, newLine: i + 1 }))
                  : file.changeType === 'delete'
                  ? oldContent.split('\n').map((c, i) => ({ type: 'remove' as const, content: c, oldLine: i + 1 }))
                  : computeDiff(oldContent, newContent);
                const expandedLines = allLines.slice(chunk.startIndex, chunk.startIndex + chunk.count);
                return (
                  <div key={`chunk-${ci}`}>
                    {expandedLines.map((line, li) => renderLine(line, `exp-${ci}-${li}`))}
                  </div>
                );
              }
              return (
                <button
                  key={`chunk-${ci}`}
                  onClick={() => setExpandedCollapsed((prev) => new Set([...prev, chunk.startIndex]))}
                  className="w-full py-1.5 text-center text-[11px] text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100 border-y border-neutral-300 cursor-pointer transition-colors"
                >
                  ··· {chunk.count} lineas sin cambios ···
                </button>
              );
            }
            return (
              <div key={`chunk-${ci}`}>
                {chunk.lines.map((line, li) => renderLine(line, `line-${ci}-${li}`))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
