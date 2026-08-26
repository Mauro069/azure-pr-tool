export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.mp3', '.mp4', '.avi', '.mov',
  '.exe', '.dll', '.so', '.dylib',
]);

export function isBinaryFile(path: string): boolean {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

export const CHANGE_TYPE_MAP: Record<number, string> = {
  1: 'add',
  2: 'edit',
  16: 'delete',
  18: 'rename',
};
