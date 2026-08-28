import type { JSX } from 'react';

export function renderMarkdown(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text ?? '';
  let key = 0;

  while (remaining.length > 0) {
    // **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // `code`
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
