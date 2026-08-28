import type { PRReviewer } from '../../types/azure';
import { VOTE_STYLES } from '../../constants/votes';

export function ReviewerBadges({ reviewers }: { reviewers: PRReviewer[] }) {
  const humans = reviewers?.filter((r) => !r.isContainer);
  if (!humans || humans.length === 0) {
    return <span className="text-[11px] text-neutral-500">Sin revisores</span>;
  }

  return (
    <div className="flex items-center gap-[5px] flex-wrap">
      {humans.map((r) => {
        const style = VOTE_STYLES[r.vote] ?? VOTE_STYLES[0];
        const initials = r.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

        return (
          <span
            key={r.id}
            title={`${r.displayName} · ${style.label}`}
            className={`inline-flex items-center border ${style.borderColor} py-[1px] pr-[6px] pl-[2px] gap-0`}
          >
            {/* Avatar */}
            <span
              className={`w-[24px] h-[24px] ${style.avatarBg} flex items-center justify-center shrink-0`}
              style={r.imageUrl ? {
                backgroundImage: `url(${r.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : undefined}
            >
              {!r.imageUrl && (
                <span className="text-[11px] font-bold text-neutral-100">{initials}</span>
              )}
            </span>
            {/* Vote mark */}
            <span className={`text-[13px] font-bold ${style.markColor} leading-none ml-1`}>
              {style.mark}
            </span>
          </span>
        );
      })}
    </div>
  );
}
