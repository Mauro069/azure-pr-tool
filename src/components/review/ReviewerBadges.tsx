import type { PRReviewer } from '../../types/azure';
import { VOTE_STYLES } from '../../constants/votes';

export function ReviewerBadges({ reviewers }: { reviewers: PRReviewer[] }) {
  const humans = reviewers?.filter((r) => !r.isContainer);
  if (!humans || humans.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {humans.map((r) => {
        const style = VOTE_STYLES[r.vote] ?? VOTE_STYLES[0];
        return (
          <span
            key={r.id}
            title={`${r.displayName}: ${style.label}`}
            className="relative w-8 h-8 shrink-0"
          >
            {/* Avatar */}
            <span className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gray-600 ring-2 ring-gray-900">
              {r.imageUrl ? (
                <img src={r.imageUrl} alt={r.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-[10px] font-medium">
                  {r.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            {/* Vote badge overlay */}
            {r.vote !== 0 && (
              <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${style.color} ring-2 ring-gray-900`}>
                <VoteIcon vote={r.vote} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function VoteIcon({ vote }: { vote: number }) {
  if (vote === 10 || vote === 5) {
    // Checkmark
    return (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6l3 3 5-5" />
      </svg>
    );
  }
  if (vote === -5) {
    // Clock (wait for author)
    return (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="6" cy="6" r="4.5" />
        <path d="M6 3.5V6l2 1.5" />
      </svg>
    );
  }
  if (vote === -10) {
    // X (rejected)
    return (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M3 3l6 6M9 3l-6 6" />
      </svg>
    );
  }
  return null;
}
