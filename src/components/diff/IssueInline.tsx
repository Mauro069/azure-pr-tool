import { useState } from 'react';
import type { AzureConfig } from '../../types/azure';
import type { ReviewIssue } from '../../types/review';
import { postPRComment } from '../../api/pullRequests';
import { renderMarkdown } from '../../utils/markdown.tsx';

const COLORS: Record<string, string> = {
  bug: 'border-red-500 bg-red-900/30',
  security: 'border-orange-500 bg-orange-900/30',
  improvement: 'border-blue-500 bg-blue-900/30',
  suggestion: 'border-teal-500 bg-teal-900/30',
};

const LABELS: Record<string, string> = {
  bug: 'Bug',
  security: 'Seguridad',
  improvement: 'Mejora',
  suggestion: 'Sugerencia',
};

const BADGE_COLORS: Record<string, string> = {
  bug: 'bg-red-600',
  security: 'bg-orange-600',
  improvement: 'bg-blue-600',
  suggestion: 'bg-teal-600',
};

export function IssueInline({ issue, config, prId, onPublished }: {
  issue: ReviewIssue;
  config: AzureConfig;
  prId: number;
  onPublished: () => void;
}) {
  const [publishState, setPublishState] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');

  const handlePublish = async () => {
    setPublishState('publishing');
    try {
      const comment = `**[${LABELS[issue.severity] ?? issue.severity}]** ${issue.message}`;
      await postPRComment(config, prId, issue.file, issue.line, comment);
      setPublishState('published');
      onPublished();
    } catch {
      setPublishState('error');
    }
  };

  return (
    <div className={`mx-2 my-2 border-l-4 rounded-r-lg p-3 shadow-lg ${COLORS[issue.severity] ?? COLORS.improvement}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] text-white px-1.5 py-0.5 rounded font-medium ${BADGE_COLORS[issue.severity] ?? BADGE_COLORS.improvement}`}>
            {LABELS[issue.severity] ?? 'Mejora'}
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
