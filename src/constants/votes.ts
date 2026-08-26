export const VOTE_STYLES: Record<number, { color: string; label: string }> = {
  10: { color: 'bg-green-600', label: 'Aprobado' },
  5: { color: 'bg-green-700', label: 'Aprobado con sugerencias' },
  0: { color: 'bg-gray-600', label: 'Sin voto' },
  [-5]: { color: 'bg-yellow-600', label: 'Wait for author' },
  [-10]: { color: 'bg-red-600', label: 'Rechazado' },
};

export const CHANGE_COLORS: Record<string, string> = {
  add: 'text-green-400',
  edit: 'text-yellow-400',
  delete: 'text-red-400',
  rename: 'text-blue-400',
};
