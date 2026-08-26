export function StatusDot({ status, isDraft }: { status: string; isDraft: boolean }) {
  const color = isDraft
    ? 'bg-yellow-500'
    : status === 'completed'
      ? 'bg-blue-500'
      : status === 'abandoned'
        ? 'bg-gray-500'
        : 'bg-green-500';
  return <span className={`w-3 h-3 rounded-full shrink-0 ${color}`} />;
}
