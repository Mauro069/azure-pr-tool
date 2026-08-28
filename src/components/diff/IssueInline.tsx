import { useState } from 'react';
import type { AzureConfig } from '../../types/azure';
import type { ReviewIssue } from '../../types/review';
import { postPRComment } from '../../api/pullRequests';
import { renderMarkdown } from '../../utils/markdown.tsx';

const SEV_LABELS: Record<string, string> = {
  bug: 'Alta',
  security: 'Alta',
  improvement: 'Media',
  suggestion: 'Baja',
};

const SEV_TAG_STYLES: Record<string, string> = {
  bug: 'bg-accent-500 text-white',
  security: 'bg-accent-500 text-white',
  improvement: 'bg-accent-50 text-accent-700 border border-accent-300',
  suggestion: 'bg-neutral-200 text-neutral-700',
};

export function IssueInline({ issue, config, prId, onPublished }: {
  issue: ReviewIssue;
  config: AzureConfig;
  prId: number;
  onPublished: () => void;
}) {
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  const buildMarkdown = () =>
    `**[${SEV_LABELS[issue.severity] ?? issue.severity}]**\n\n**Problema:** ${issue.problem}\n\n**Sugerencia:** ${issue.suggestion}`;

  const handlePublish = async () => {
    setPublishState('publishing');
    try {
      await postPRComment(config, prId, issue.file, issue.line, buildMarkdown());
      setPublishState('published');
      onPublished();
    } catch {
      setPublishState('error');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ml-[44px] border-l-[3px] border-accent-500 bg-neutral-50 px-3 py-2.5 my-1">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${SEV_TAG_STYLES[issue.severity] ?? SEV_TAG_STYLES.improvement}`}>
            {SEV_LABELS[issue.severity] ?? 'Media'}
          </span>
          <span className="font-mono text-[10px] text-neutral-600">IA Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 text-[10px] font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-900/[0.07] transition-colors cursor-pointer"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishState === 'publishing' || publishState === 'published'}
            className={`px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
              publishState === 'published' ? 'bg-neutral-200 text-neutral-600' :
              publishState === 'error' ? 'bg-accent-500 text-white hover:bg-accent-600' :
              publishState === 'publishing' ? 'bg-neutral-200 text-neutral-500' :
              'bg-accent-500 text-white hover:bg-accent-600'
            } disabled:cursor-not-allowed`}
          >
            {publishState === 'published' ? 'Publicado' : publishState === 'publishing' ? '...' : publishState === 'error' ? 'Reintentar' : 'Publicar'}
          </button>
        </div>
      </div>
      <div className="text-[12px] text-neutral-800 leading-relaxed max-w-[70ch]" style={{ textWrap: 'pretty' }}>
        <p>{renderMarkdown(issue.problem)}</p>
        {issue.suggestion && (
          <p className="mt-1.5 text-neutral-700"><strong>Sugerencia:</strong> {renderMarkdown(issue.suggestion)}</p>
        )}
      </div>
    </div>
  );
}
