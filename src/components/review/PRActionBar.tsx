import type { PRReviewer } from '../../types/azure';
import type { ReviewIssue } from '../../types/review';
import { formatDuration } from '../../utils/time';
import { ReviewerBadges } from './ReviewerBadges';
import { Timer } from './Timer';

interface Props {
  prId: number;
  prTitle: string;
  reviewers: PRReviewer[];
  geminiKey: string;
  reviewing: boolean;
  voting: boolean;
  issues: ReviewIssue[];
  reviewDuration: number;
  fileCount: number;
  onVote: (vote: number) => void;
  onAIReview: () => void;
  onBack: () => void;
}

export function PRActionBar({
  prId,
  prTitle,
  reviewers,
  geminiKey,
  reviewing,
  voting,
  issues,
  reviewDuration,
  fileCount,
  onVote,
  onAIReview,
  onBack,
}: Props) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white cursor-pointer">← Volver</button>
        <span className="text-purple-400 font-mono font-medium">#{prId}</span>
        <span className="text-white text-sm truncate max-w-md">{prTitle}</span>
      </div>

      <div className="flex items-center gap-2">
        <ReviewerBadges reviewers={reviewers} />

        <button
          onClick={() => onVote(10)}
          disabled={voting}
          className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Aprobar
        </button>
        <button
          onClick={() => onVote(-5)}
          disabled={voting}
          className="px-3 py-1.5 text-xs bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Wait for author
        </button>

        {geminiKey && (
          <button
            onClick={onAIReview}
            disabled={reviewing || fileCount === 0}
            className="px-3 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {reviewing ? 'Revisando...' : issues.length > 0 ? `IA (${issues.length})` : 'Revisar con IA'}
          </button>
        )}

        <Timer running={reviewing} />

        {reviewDuration > 0 && !reviewing && (
          <span className="text-[10px] text-gray-500 font-mono">{formatDuration(reviewDuration)}</span>
        )}
      </div>
    </div>
  );
}
