import { useState, useEffect, useCallback, useRef } from 'react';
import { diffLines } from 'diff';
import type { AzureConfig, FileChange, PRThread } from '../types/azure';
import { getPRThreads, replyToThread, postPRComment } from '../api/pullRequests';
import type { ReviewIssue } from '../api/gemini';

// Simple markdown-ish rendering: **bold**, `code`, backtick blocks
function renderMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // `code`
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch ? { index: boldMatch.index!, length: boldMatch[0].length, el: <strong key={key++} className="font-semibold text-white">{boldMatch[1]}</strong> } : null,
      codeMatch ? { index: codeMatch.index!, length: codeMatch[0].length, el: <code key={key++} className="bg-gray-700 px-1 py-0.5 rounded text-[11px] font-mono text-purple-300">{codeMatch[1]}</code> } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }
    parts.push(first.el);
    remaining = remaining.slice(first.index + first.length);
  }

  return parts;
}

interface Props {
  config: AzureConfig;
  prId: number;
  files: FileChange[];
  issues: ReviewIssue[];
  onBack: () => void;
  hideBackButton?: boolean;
}

const CONTEXT_LINES = 3;

interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
  oldLine?: number;
  newLine?: number;
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const changes = diffLines(oldContent, newContent);
  const lines: DiffLine[] = [];
  let oldLine = 1;
  let newLine = 1;

  for (const change of changes) {
    const rawLines = change.value.replace(/\n$/, '').split('\n');
    for (const content of rawLines) {
      if (change.added) {
        lines.push({ type: 'add', content, newLine: newLine++ });
      } else if (change.removed) {
        lines.push({ type: 'remove', content, oldLine: oldLine++ });
      } else {
        lines.push({ type: 'unchanged', content, oldLine: oldLine++, newLine: newLine++ });
      }
    }
  }
  return lines;
}

interface CollapsedChunk {
  type: 'lines';
  lines: DiffLine[];
}

interface CollapsedSeparator {
  type: 'collapsed';
  count: number;
  startIndex: number;
}

type DiffChunk = CollapsedChunk | CollapsedSeparator;

function collapseUnchanged(lines: DiffLine[]): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].type !== 'unchanged') {
      // Find extent of this changed block + context
      const start = Math.max(0, i - CONTEXT_LINES);
      let end = i;
      while (end < lines.length && lines[end].type !== 'unchanged') end++;
      const contextEnd = Math.min(lines.length, end + CONTEXT_LINES);

      // Add context before (if not already added)
      const contextStart = chunks.length === 0 ? start : i;
      if (contextStart < i) {
        chunks.push({ type: 'lines', lines: lines.slice(contextStart, i) });
      }

      // Add changed lines
      chunks.push({ type: 'lines', lines: lines.slice(i, end) });

      // Add context after
      if (end < contextEnd) {
        chunks.push({ type: 'lines', lines: lines.slice(end, contextEnd) });
      }

      i = contextEnd;
    } else {
      // Accumulate unchanged lines
      const start = i;
      while (i < lines.length && lines[i].type === 'unchanged') i++;

      // Check if these unchanged lines are between changes or at edges
      const isStart = chunks.length === 0;
      const isEnd = i >= lines.length;
      const count = i - start;

      if (isStart && count > CONTEXT_LINES) {
        chunks.push({ type: 'collapsed', count: count - CONTEXT_LINES, startIndex: start });
        chunks.push({ type: 'lines', lines: lines.slice(i - CONTEXT_LINES, i) });
      } else if (isEnd && count > CONTEXT_LINES) {
        chunks.push({ type: 'lines', lines: lines.slice(start, start + CONTEXT_LINES) });
        chunks.push({ type: 'collapsed', count: count - CONTEXT_LINES, startIndex: start + CONTEXT_LINES });
      } else if (count > CONTEXT_LINES * 2) {
        chunks.push({ type: 'lines', lines: lines.slice(start, start + CONTEXT_LINES) });
        chunks.push({ type: 'collapsed', count: count - CONTEXT_LINES * 2, startIndex: start + CONTEXT_LINES });
        chunks.push({ type: 'lines', lines: lines.slice(i - CONTEXT_LINES, i) });
      } else {
        chunks.push({ type: 'lines', lines: lines.slice(start, i) });
      }
    }
  }

  return chunks;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

// File tree building
interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: FileChange;
}

function buildFileTree(files: FileChange[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map() };

  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
        });
      }
      current = current.children.get(part)!;
    }
    current.file = file;
  }

  return root;
}

const CHANGE_COLORS: Record<string, string> = {
  add: 'text-green-400',
  edit: 'text-yellow-400',
  delete: 'text-red-400',
  rename: 'text-blue-400',
};

function FileTreeView({ node, activeFile, onSelect, depth = 0 }: {
  node: TreeNode;
  activeFile: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const entries = Array.from(node.children.values());
  const folders = entries.filter((e) => e.children.size > 0 && !e.file);
  const files = entries.filter((e) => e.file);
  const mixed = entries.filter((e) => e.children.size > 0 && e.file);

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      {depth > 0 && !node.file && (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white py-0.5 cursor-pointer w-full text-left"
        >
          <span className="text-[10px]">{open ? '▼' : '▶'}</span>
          <span>{node.name}</span>
        </button>
      )}
      {open && [...folders, ...mixed, ...files].map((child) => {
        if (child.file && child.children.size === 0) {
          const isActive = child.file.path === activeFile;
          const color = CHANGE_COLORS[child.file.changeType] ?? 'text-gray-300';
          return (
            <button
              key={child.path}
              onClick={() => onSelect(child.file!.path)}
              className={`flex items-center gap-1.5 text-xs py-0.5 pl-3 cursor-pointer w-full text-left rounded ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className={`text-[10px] ${color}`}>●</span>
              <span className="truncate">{child.name}</span>
            </button>
          );
        }
        return <FileTreeView key={child.path} node={child} activeFile={activeFile} onSelect={onSelect} depth={depth + 1} />;
      })}
    </div>
  );
}

function InlineThread({ thread, config, prId, onReplySubmitted }: {
  thread: PRThread;
  config: AzureConfig;
  prId: number;
  onReplySubmitted: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await replyToThread(config, prId, thread.id, replyText);
      setReplyText('');
      setShowReply(false);
      onReplySubmitted();
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const statusColors: Record<number, string> = {
    1: 'border-blue-600 bg-blue-900/20',
    2: 'border-green-600 bg-green-900/20',
    3: 'border-yellow-600 bg-yellow-900/20',
    4: 'border-gray-600 bg-gray-800/40',
  };

  const visibleComments = thread.comments.filter((c) => c.commentType !== 2);

  return (
    <div className={`mx-2 my-2 border-l-4 rounded-r-lg p-3 space-y-2 shadow-lg ${statusColors[thread.status] ?? statusColors[1]}`}>
      {visibleComments.map((comment) => (
        <div key={comment.id}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-gray-200">{comment.author.displayName}</span>
            <span className="text-[10px] text-gray-500">{timeAgo(comment.publishedDate)}</span>
          </div>
          <div className="text-xs text-gray-300 whitespace-pre-wrap">{renderMarkdown(comment.content)}</div>
        </div>
      ))}
      {showReply ? (
        <div className="flex gap-2 mt-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribir respuesta..."
            className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && handleReply()}
          />
          <button
            onClick={handleReply}
            disabled={sending || !replyText.trim()}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            {sending ? '...' : 'Enviar'}
          </button>
          <button
            onClick={() => { setShowReply(false); setReplyText(''); }}
            className="px-2 py-1 text-xs text-gray-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowReply(true)}
          className="text-[10px] text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          Responder
        </button>
      )}
    </div>
  );
}

function IssueInline({ issue, config, prId, onPublished }: { issue: ReviewIssue; config: AzureConfig; prId: number; onPublished: () => void }) {
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');

  const colors: Record<string, string> = {
    bug: 'border-red-500 bg-red-900/30',
    security: 'border-orange-500 bg-orange-900/30',
    improvement: 'border-blue-500 bg-blue-900/30',
    suggestion: 'border-teal-500 bg-teal-900/30',
  };
  const labels: Record<string, string> = {
    bug: 'Bug',
    security: 'Seguridad',
    improvement: 'Mejora',
    suggestion: 'Sugerencia',
  };
  const badgeColors: Record<string, string> = {
    bug: 'bg-red-600',
    security: 'bg-orange-600',
    improvement: 'bg-blue-600',
    suggestion: 'bg-teal-600',
  };

  const handlePublish = async () => {
    setPublishState('publishing');
    try {
      const comment = `**[${labels[issue.severity] ?? issue.severity}]** ${issue.message}`;
      await postPRComment(config, prId, issue.file, issue.line, comment);
      setPublishState('published');
      onPublished();
    } catch {
      setPublishState('error');
    }
  };

  return (
    <div className={`mx-2 my-2 border-l-4 rounded-r-lg p-3 shadow-lg ${colors[issue.severity] ?? colors.improvement}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] text-white px-1.5 py-0.5 rounded font-medium ${badgeColors[issue.severity] ?? badgeColors.improvement}`}>
            {labels[issue.severity] ?? 'Mejora'}
          </span>
          <span className="text-[10px] text-gray-500">IA Review</span>
        </div>
        <button
          onClick={handlePublish}
          disabled={publishState === 'publishing' || publishState === 'published'}
          className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
            publishState === 'published' ? 'bg-green-700 text-green-200' :
            publishState === 'error' ? 'bg-red-700 text-red-200 hover:bg-red-600' :
            publishState === 'publishing' ? 'bg-gray-600 text-gray-300' :
            'bg-purple-700 text-purple-100 hover:bg-purple-600'
          } disabled:cursor-not-allowed`}
        >
          {publishState === 'published' ? 'Publicado' : publishState === 'publishing' ? '...' : publishState === 'error' ? 'Reintentar' : 'Publicar'}
        </button>
      </div>
      <div className="text-xs text-gray-200 leading-relaxed">{renderMarkdown(issue.message)}</div>
    </div>
  );
}

function FileDiff({ file, threads, issues, config, prId, onThreadsUpdate, collapsed: initialCollapsed = false }: {
  file: FileChange;
  threads: PRThread[];
  issues: ReviewIssue[];
  config: AzureConfig;
  prId: number;
  onThreadsUpdate: () => void;
  collapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // Sync with parent when collapsed prop changes (e.g. after AI review)
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

  // Map threads by line
  const threadsByLine = new Map<number, PRThread[]>();
  for (const t of threads) {
    const line = t.threadContext?.rightFileStart?.line;
    if (line) {
      if (!threadsByLine.has(line)) threadsByLine.set(line, []);
      threadsByLine.get(line)!.push(t);
    }
  }

  // Map issues by line
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
            {hasAnnotations ? '💬' : prefixChars[line.type]}
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
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
          collapsed ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-800 border-b border-gray-700'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-gray-500 shrink-0">{collapsed ? '▶' : '▼'}</span>
          <span className="text-xs font-mono text-gray-300 truncate">{file.path}</span>
          {hasComments && <span className="text-[10px] text-purple-400 shrink-0">💬 {threads.length + issues.length}</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          {removedCount > 0 && <span className="text-red-400">-{removedCount}</span>}
          {addedCount > 0 && <span className="text-green-400">+{addedCount}</span>}
        </div>
      </button>
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

export function DiffViewer({ config, prId, files, issues, onBack, hideBackButton }: Props) {
  const [threads, setThreads] = useState<PRThread[]>([]);
  const [activeFile, setActiveFile] = useState(files[0]?.path ?? '');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const prevIssuesLen = useRef(0);
  const fileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const tree = buildFileTree(files);

  const fetchThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const t = await getPRThreads(config, prId);
      setThreads(t.filter((th) => th.threadContext?.filePath));
    } catch {
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [config, prId]);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  // Auto-collapse files without comments when AI review completes
  useEffect(() => {
    if (prevIssuesLen.current === 0 && issues.length > 0) {
      const filesWithIssues = new Set<string>();
      for (const issue of issues) {
        // Normalize path for comparison
        const ip = issue.file.startsWith('/') ? issue.file : `/${issue.file}`;
        for (const f of files) {
          const fp = f.path.startsWith('/') ? f.path : `/${f.path}`;
          if (ip === fp || issue.file === f.path || issue.file === f.path.replace(/^\//, '')) {
            filesWithIssues.add(f.path);
          }
        }
      }
      // Also keep files with existing threads expanded
      for (const t of threads) {
        const tp = t.threadContext?.filePath ?? '';
        for (const f of files) {
          const fp = f.path.startsWith('/') ? f.path : `/${f.path}`;
          if (tp === f.path || tp === fp || tp === f.path.replace(/^\//, '')) {
            filesWithIssues.add(f.path);
          }
        }
      }
      // Collapse files that have no issues/threads
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

  const scrollToFile = (path: string) => {
    setActiveFile(path);
    fileRefs.current.get(path)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getThreadsForFile = (filePath: string) => {
    const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return threads.filter((t) => {
      const tp = t.threadContext?.filePath ?? '';
      return tp === filePath || tp === normalized || tp === filePath.replace(/^\//, '');
    });
  };

  const getIssuesForFile = (filePath: string) =>
    issues.filter((i) => {
      const ip = i.file.startsWith('/') ? i.file : `/${i.file}`;
      const fp = filePath.startsWith('/') ? filePath : `/${filePath}`;
      return ip === fp || i.file === filePath || i.file === filePath.replace(/^\//, '');
    });

  return (
    <div className="space-y-3">
      {!hideBackButton && (
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Volver al resumen
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {loadingThreads && <span>Cargando comentarios...</span>}
            <span>{files.length} archivo{files.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{threads.length} thread{threads.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3" style={{ minHeight: '70vh' }}>
        {/* File tree sidebar */}
        <div className="w-56 shrink-0 bg-gray-800/50 border border-gray-700 rounded-lg p-2 overflow-y-auto" style={{ maxHeight: '80vh' }}>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">Archivos</div>
          <FileTreeView node={tree} activeFile={activeFile} onSelect={scrollToFile} />
        </div>

        {/* Diff panel */}
        <div className="flex-1 min-w-0 space-y-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
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
                onThreadsUpdate={fetchThreads}
                collapsed={collapsedFiles.has(file.path)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
