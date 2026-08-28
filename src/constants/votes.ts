export const VOTE_STYLES: Record<number, { color: string; label: string; mark: string; borderColor: string; avatarBg: string; markColor: string }> = {
  10: { color: 'bg-green-600', label: 'Aprobado', mark: '✓', borderColor: 'border-neutral-900', avatarBg: 'bg-neutral-900', markColor: 'text-neutral-900' },
  5: { color: 'bg-green-600', label: 'Aprobado con sugerencias', mark: '✓', borderColor: 'border-neutral-900', avatarBg: 'bg-neutral-900', markColor: 'text-neutral-900' },
  0: { color: 'bg-neutral-200', label: 'Sin voto', mark: '–', borderColor: 'border-neutral-300', avatarBg: 'bg-neutral-200', markColor: 'text-neutral-500' },
  [-5]: { color: 'bg-accent-200', label: 'Wait for author', mark: '◷', borderColor: 'border-accent-500', avatarBg: 'bg-accent-200', markColor: 'text-accent-700' },
  [-10]: { color: 'bg-accent-500', label: 'Rechazado', mark: '✕', borderColor: 'border-accent-500', avatarBg: 'bg-accent-500', markColor: 'text-neutral-100' },
};

export const CHANGE_COLORS: Record<string, string> = {
  add: 'text-neutral-800',
  edit: 'text-neutral-700',
  delete: 'text-accent-700',
  rename: 'text-neutral-600',
};
