import { NavLink } from 'react-router-dom';
import type { AzureConfig } from '../../types/azure';

interface Props {
  config: AzureConfig;
  scope: 'mvp' | 'completo';
  onScopeChange: (scope: 'mvp' | 'completo') => void;
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
    isActive
      ? 'text-neutral-900 border-b-2 border-accent-500'
      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-900/[0.07]'
  }`;

export function GlobalHeader({ config, scope, onScopeChange }: Props) {
  return (
    <header className="sticky top-0 z-50 bg-neutral-100 border-b-2 border-accent-500">
      <div className="flex items-center justify-between px-6 py-2">
        {/* Left: logo + breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-[14px] h-[14px] bg-accent-500 block" />
            <span className="text-[15px] font-[800] uppercase tracking-wide leading-none">
              PR<br />Review
            </span>
          </div>
          <span className="w-px h-[18px] bg-neutral-400" />
          <span className="font-mono text-[11px] text-neutral-600">
            {config.organization} / {config.project} / {config.repository}
          </span>
        </div>

        {/* Right: nav + scope + avatar */}
        <div className="flex items-center gap-1">
          <nav className="flex items-center">
            <NavLink to="/review" className={navClass}>Pull requests</NavLink>
            <NavLink to="/deploy" className={navClass}>Deploy</NavLink>
            {scope === 'completo' && (
              <NavLink to="/historial" className={navClass}>Historial</NavLink>
            )}
            <NavLink to="/config" className={navClass}>Config</NavLink>
          </nav>

          <span className="w-px h-[18px] bg-neutral-300 mx-2" />

          {/* User avatar */}
          <span className="w-6 h-6 bg-neutral-800 text-neutral-100 flex items-center justify-center text-[9px] font-bold">
            MV
          </span>
        </div>
      </div>
    </header>
  );
}
