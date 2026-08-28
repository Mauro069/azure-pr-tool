export function StatusDot({ status, isDraft }: { status: string; isDraft: boolean }) {
  const color = isDraft
    ? 'bg-yellow-500'
    : status === 'completed'
      ? 'bg-neutral-500'
      : status === 'abandoned'
        ? 'bg-neutral-400'
        : 'bg-accent-500';
  return <span className={`w-3 h-3 shrink-0 ${color}`} />;
}
