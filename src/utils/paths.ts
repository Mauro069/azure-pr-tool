export function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function pathsMatch(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}

export function branchName(ref: string): string {
  return ref.replace('refs/heads/', '');
}
