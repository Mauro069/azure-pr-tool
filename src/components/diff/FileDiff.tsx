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
    add: 'bg-green-900/30',
    remove: 'bg-red-900/30',
    unchanged: '',
  };

  const lineNumColors = {
    add: 'text-green-700',
    remove: 'text-red-700',
    unchanged: 'text-gray-600',
  };

  const prefixChars = {
    add: '+',
    remove: '-',
    unchanged: ' ',
  };

  const prefixColors = {
    add: 'text-green-500',
    remove: 'text-red-500',
    unchanged: 'text-gray-600',
  };

  const renderLine = (line: DiffLine, key: string) => {
    const lineNum = line.type === 'add' ? line.newLine : (line.type === 'remove' ? line.oldLine : line.newLine);
    const lineThreads = lineNum ? threadsByLine.get(lineNum) ?? [] : [];
    const lineIssues = lineNum ? issuesByLine.get(lineNum) ?? [] : [];
    const hasAnnotations = lineThreads.length > 0 || lineIssues.length > 0;

    return (
      <div key={key}>
        <div className={`flex font-mono text-xs leading-5 ${lineColors[line.type]} ${hasAnnotations ? 'ring-1 ring-inset ring-purple-500/40 bg-purple-900/10' : ''}`}>
          <span className={`w-10 text-right pr-1 select-none shrink-0 ${lineNumColors[line.type]}`}>
            {line.oldLine ?? ''}
          </span>
          <span className={`w-10 text-right pr-1 select-none shrink-0 ${lineNumColors[line.type]}`}>
            {line.newLine ?? ''}
          </span>
          <span className={`w-4 text-center select-none shrink-0 ${hasAnnotations ? 'text-purple-400' : prefixColors[line.type]}`}>
            {hasAnnotations ? '\uD83D\uDCAC' : prefixChars[line.type]}
          </span>
          <span className="flex-1 whitespace-pre overflow-x-auto pr-4">
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

  const hasComments = threads.length > 0 || issues.length > 0;

  return (
    <div className={`border rounded-lg overflow-hidden ${hasComments ? 'border-purple-700/50' : 'border-gray-700'}`}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        role="button"
        className={`w-full flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
          collapsed ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-800 border-b border-gray-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-gray-500 shrink-0">{collapsed ? '▶' : '▼'}</span>
          <span
            className="text-xs font-mono text-gray-300 truncate hover:text-white transition-colors"
            title="Click para copiar path"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(file.path);
              setCopiedPath(true);
              setTimeout(() => setCopiedPath(false), 1500);
            }}
          >
            {copiedPath ? '✓ Copiado!' : <>{file.path} <span className="text-gray-500 text-[10px]">📋</span></>}
          </span>
          {hasComments && <span className="text-[10px] text-purple-400 shrink-0">{'\uD83D\uDCAC'} {threads.length + issues.length}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          {onReviewFile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReviewFile(file);
              }}
              disabled={isReviewingFile || isFullReviewing}
              title="Revisar este archivo con IA"
              className="px-1.5 py-0.5 text-[10px] rounded bg-purple-800/60 hover:bg-purple-700 text-purple-300 hover:text-white disabled:bg-gray-700 disabled:text-gray-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isReviewingFile ? (
                <span className="inline-block animate-pulse">● IA</span>
              ) : (
                '✦ IA'
              )}
            </button>
          )}
          {removedCount > 0 && <span className="text-red-400">-{removedCount}</span>}
          {addedCount > 0 && <span className="text-green-400">+{addedCount}</span>}
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto bg-gray-900">
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
                  className="w-full py-1 text-center text-[10px] text-blue-400 hover:text-blue-300 bg-gray-800/50 hover:bg-gray-800 border-y border-gray-700/50 cursor-pointer transition-colors"
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
