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
            className={`${style.color} w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-gray-900`}
          >
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-[10px] font-medium">
                {r.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
