import type { PRReviewer } from '../../types/azure';
import type { ReviewIssue } from '../../types/review';
import { formatDuration } from '../../utils/time';
import { ReviewerBadges } from './ReviewerBadges';
import { Timer } from './Timer';

interface Props {
  prId: number;
  prTitle: string;
  reviewers: PRReviewer[];
  hasAI: boolean;
  reviewing: boolean;
  reviewingFileCount?: number;
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
  hasAI,
  reviewing,
  reviewingFileCount = 0,
  voting,
  issues,
  reviewDuration,
  fileCount,
  onVote,
  onAIReview,
  onBack,
}: Props) {
  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-500 hover:text-accent-700 cursor-pointer mb-2"
      >
        ← Volver a pull requests
      </button>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="leading-tight">
          <span className="font-mono text-[20px] text-neutral-500 font-medium">!{prId}</span>{' '}
          <span className="text-[24px] font-[800]">{prTitle}</span>
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <ReviewerBadges reviewers={reviewers} />

          <button
            onClick={() => onVote(-5)}
            disabled={voting}
            className="px-3 py-2 text-[13px] font-semibold border border-neutral-400 text-neutral-800 hover:bg-neutral-900/[0.07] disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Wait for author
          </button>
          <button
            onClick={() => onVote(10)}
            disabled={voting}
            className="px-3 py-2 text-[13px] font-semibold bg-neutral-900 text-neutral-100 hover:bg-neutral-800 disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Aprobar
          </button>

          {hasAI && (
            <button
              onClick={onAIReview}
              disabled={reviewing || fileCount === 0 || reviewingFileCount > 0}
              className="px-3 py-2 text-[13px] font-semibold bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {reviewing ? 'Revisando...' : issues.length > 0 ? `IA (${issues.length})` : 'Revisar con IA'}
            </button>
          )}

          <Timer running={reviewing} />

          {reviewDuration > 0 && !reviewing && (
            <span className="text-[11px] text-neutral-500 font-mono">{formatDuration(reviewDuration)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
