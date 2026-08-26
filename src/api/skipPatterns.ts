// Patrones de archivos a excluir de la revisión de IA (ahorra tokens y tiempo)
// Usa .includes() contra el path del archivo
const SKIP_REVIEW_PATTERNS = [
  '.spec.',
  '/index.ts',
];

export function shouldSkipForReview(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return SKIP_REVIEW_PATTERNS.some((pattern) => lowerPath.includes(pattern));
}
