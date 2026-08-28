import type { JSX } from 'react';

function renderInline(text: string, keyBase: number): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text ?? '';
  let key = keyBase;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    const matches = [
      boldMatch ? { index: boldMatch.index!, length: boldMatch[0].length, el: <strong key={key++} className="font-semibold text-neutral-900">{boldMatch[1]}</strong> } : null,
      codeMatch ? { index: codeMatch.index!, length: codeMatch[0].length, el: <code key={key++} className="bg-neutral-200 px-1 py-0.5 text-[11px] font-mono text-accent-700">{codeMatch[1]}</code> } : null,
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

export function renderMarkdown(text: string): (string | JSX.Element)[] {
  if (!text) return [];

  const lines = text.split('\n');
  const elements: (string | JSX.Element)[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ### Heading
    const h3Match = line.match(/^###\s+(.+)/);
    if (h3Match) {
      elements.push(
        <strong key={key++} className="block text-[13px] font-[800] text-neutral-900 mt-1 mb-1">
          {h3Match[1]}
        </strong>
      );
      continue;
    }

    // ## Heading
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      elements.push(
        <strong key={key++} className="block text-[14px] font-[800] text-neutral-900 mt-1 mb-1">
          {h2Match[1]}
        </strong>
      );
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      elements.push(<br key={key++} />);
      continue;
    }

    // Regular line with inline formatting
    const inlineParts = renderInline(line, key * 100);
    elements.push(<span key={key++} className="block">{inlineParts}</span>);
  }

  return elements;
}
