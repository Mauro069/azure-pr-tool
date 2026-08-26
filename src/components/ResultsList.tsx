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

  const renderItem = (item: ProcessedWorkItem) => (
    <div
      key={item.id}
      className="flex items-center justify-between p-3 bg-green-900/30 border border-green-700 rounded-lg"
    >
      <div className="text-left">
        <span className="text-green-400 font-mono text-sm">#{item.id}</span>
        <span className="text-gray-300 mx-2">|</span>
        <span className="text-white">{item.title}</span>
        <span className="text-gray-300 mx-2">-&gt;</span>
        <span className="text-green-400 text-sm">{item.newState}</span>
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 text-sm shrink-0 ml-4"
      >
        Abrir
      </a>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white">
        Resultados ({successful.length}/{results.length} exitosos)
      </h2>

      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <h3 className="text-lg text-green-400">{group.label}</h3>
          {group.items.map(renderItem)}
        </div>
      ))}

      {failed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg text-red-400">Errores</h3>
          {failed.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-left"
            >
              <span className="text-red-400 font-mono text-sm">#{item.id}</span>
              <span className="text-gray-300 mx-2">-</span>
              <span className="text-red-300 text-sm">{item.error}</span>
            </div>
          ))}
        </div>
      )}

      {successful.length > 0 && (
        <div className="mt-4 p-4 bg-gray-800 border border-gray-600 rounded-lg text-left">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-400">URLs de Work Items procesados:</h3>
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors cursor-pointer"
            >
              {copied ? 'Copiado!' : 'Copiar URLs'}
            </button>
          </div>
          <pre className="text-blue-400 text-sm whitespace-pre-wrap break-all">
            {buildGroupedText()}
          </pre>
        </div>
      )}
    </div>
  );
}
