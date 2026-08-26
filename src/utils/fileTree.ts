import type { FileChange } from '../types/azure';

export interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  file?: FileChange;
}

export function buildFileTree(files: FileChange[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map() };

  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
        });
      }
      current = current.children.get(part)!;
    }
    current.file = file;
  }

  return root;
}
