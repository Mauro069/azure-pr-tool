import { useState } from 'react';
import type { ProcessedWorkItem } from '../types/azure';

interface Props {
  results: ProcessedWorkItem[];
}

export function ResultsList({ results }: Props) {
  const [copied, setCopied] = useState(false);

  if (results.length === 0) return null;

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  const groups = [
    { label: 'Bugs - App', items: successful.filter((r) => r.type === 'Bug' && r.platform === 'App') },
    { label: 'Bugs - Web', items: successful.filter((r) => r.type === 'Bug' && r.platform === 'Web') },
    { label: 'User Stories - App', items: successful.filter((r) => r.type === 'User Story' && r.platform === 'App') },
    { label: 'User Stories - Web', items: successful.filter((r) => r.type === 'User Story' && r.platform === 'Web') },
    { label: 'Issues - App', items: successful.filter((r) => r.type === 'Issue' && r.platform === 'App') },
    { label: 'Issues - Web', items: successful.filter((r) => r.type === 'Issue' && r.platform === 'Web') },
  ].filter((g) => g.items.length > 0);

  const buildGroupedText = () =>
    groups.map((g) => `${g.label}:\n${g.items.map((i) => i.url).join('\n')}`).join('\n\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildGroupedText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[13px] font-[800] uppercase tracking-[0.06em]">Previsualizacion</h2>
        <span className="text-[11px] text-neutral-600">
          {successful.length} de {results.length} seleccionados
        </span>
      </div>
      <div className="border-b-2 border-neutral-900 mb-3" />

      {/* Work items table */}
      <div>
        {/* Table header */}
        <div className="grid items-center py-2 border-b-2 border-neutral-900" style={{ gridTemplateColumns: '22px 90px 1fr 130px 110px' }}>
          <span />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">Work item</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">Titulo</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">Estado actual</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">PR</span>
        </div>

        {/* Rows */}
        {successful.map((item) => (
          <div
            key={item.id}
            className="grid items-center py-2.5 border-b border-neutral-300"
            style={{ gridTemplateColumns: '22px 90px 1fr 130px 110px' }}
          >
            <span className="flex justify-center">
              <input type="checkbox" defaultChecked className="w-[13px] h-[13px] accent-accent-500" />
            </span>
            <span className="font-mono text-[11.5px] font-semibold">{item.id}</span>
            <span className="text-[12.5px] truncate pr-3">{item.title}</span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-700">{item.newState}</span>
            <span className="font-mono text-[11px] text-neutral-600">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-accent-500 hover:text-accent-700">
                Abrir
              </a>
            </span>
          </div>
        ))}

        {failed.length > 0 && failed.map((item) => (
          <div
            key={item.id}
            className="grid items-center py-2.5 border-b border-neutral-300"
            style={{ gridTemplateColumns: '22px 90px 1fr 130px 110px' }}
          >
            <span />
            <span className="font-mono text-[11.5px] font-semibold text-accent-700">{item.id}</span>
            <span className="text-[12.5px] text-accent-700 truncate pr-3">{item.error}</span>
            <span className="text-[10px] font-bold uppercase bg-accent-500 text-white px-1.5 py-0.5 w-fit">Error</span>
            <span />
          </div>
        ))}
      </div>

      {/* Copy section */}
      {successful.length > 0 && (
        <div className="mt-4 border border-neutral-300 bg-neutral-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">URLs procesadas</span>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.04em] border border-neutral-400 text-neutral-700 hover:bg-neutral-900/[0.07] cursor-pointer transition-colors"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <pre className="font-mono text-[11.5px] text-neutral-800 whitespace-pre-wrap break-all leading-relaxed">
            {buildGroupedText()}
          </pre>
        </div>
      )}
    </div>
  );
}
