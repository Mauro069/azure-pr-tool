import { diffLines as libDiffLines } from 'diff';

export const CONTEXT_LINES = 3;

export interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
  oldLine?: number;
  newLine?: number;
}

export interface CollapsedChunk {
  type: 'lines';
  lines: DiffLine[];
}

export interface CollapsedSeparator {
  type: 'collapsed';
  count: number;
  startIndex: number;
}

export type DiffChunk = CollapsedChunk | CollapsedSeparator;

export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const changes = libDiffLines(oldContent, newContent);
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

export function collapseUnchanged(lines: DiffLine[]): DiffChunk[] {
  const chunks: DiffChunk[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].type !== 'unchanged') {
      const start = Math.max(0, i - CONTEXT_LINES);
      let end = i;
      while (end < lines.length && lines[end].type !== 'unchanged') end++;
      const contextEnd = Math.min(lines.length, end + CONTEXT_LINES);

      const contextStart = chunks.length === 0 ? start : i;
      if (contextStart < i) {
        chunks.push({ type: 'lines', lines: lines.slice(contextStart, i) });
      }

      chunks.push({ type: 'lines', lines: lines.slice(i, end) });

      if (end < contextEnd) {
        chunks.push({ type: 'lines', lines: lines.slice(end, contextEnd) });
      }

      i = contextEnd;
    } else {
      const start = i;
      while (i < lines.length && lines[i].type === 'unchanged') i++;

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
