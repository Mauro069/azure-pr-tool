import { useState } from 'react';
import type { TreeNode } from '../../utils/fileTree';
import { CHANGE_COLORS } from '../../constants/votes';

export function FileTreeView({ node, activeFile, onSelect, depth = 0 }: {
  node: TreeNode;
  activeFile: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const entries = Array.from(node.children.values());
  const folders = entries.filter((e) => e.children.size > 0 && !e.file);
  const files = entries.filter((e) => e.file);
  const mixed = entries.filter((e) => e.children.size > 0 && e.file);

  return (
    <div style={{ paddingLeft: depth > 0 ? 12 : 0 }}>
      {depth > 0 && !node.file && (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white py-0.5 cursor-pointer w-full text-left"
        >
          <span className="text-[10px]">{open ? '▼' : '▶'}</span>
          <span>{node.name}</span>
        </button>
      )}
      {open && [...folders, ...mixed, ...files].map((child) => {
        if (child.file && child.children.size === 0) {
          const isActive = child.file.path === activeFile;
          const color = CHANGE_COLORS[child.file.changeType] ?? 'text-gray-300';
          return (
            <button
              key={child.path}
              onClick={() => onSelect(child.file!.path)}
              className={`flex items-center gap-1.5 text-xs py-0.5 pl-3 cursor-pointer w-full text-left rounded ${
                isActive ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className={`text-[10px] ${color}`}>●</span>
              <span className="truncate">{child.name}</span>
            </button>
          );
        }
        return <FileTreeView key={child.path} node={child} activeFile={activeFile} onSelect={onSelect} depth={depth + 1} />;
      })}
    </div>
  );
}
