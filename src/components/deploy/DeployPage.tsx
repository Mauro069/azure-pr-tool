import type { AzureConfig } from '../../types/azure';
import { useDeploy } from '../../hooks/useDeploy';
import { PRInput } from '../PRInput';
import { ResultsList } from '../ResultsList';
import { DeployLog } from './DeployLog';

export function DeployPage({ config }: { config: AzureConfig }) {
  const { results, loading, log, handleProcess } = useDeploy(config);

  return (
    <div>
      {/* Header */}
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-500 mb-1">Automatizacion</p>
      <h1 className="text-[30px] font-[800] tracking-tight leading-none mb-1">Deploy · Work items</h1>
      <div className="border-b-2 border-neutral-900 mb-6" />

      {/* Two-column layout */}
      <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-0">
        {/* Left: form */}
        <div className="border-r-2 border-neutral-900 pr-6">
          <PRInput onProcess={handleProcess} loading={loading} resultCount={results.filter(r => r.success).length} />
        </div>

        {/* Right: preview */}
        <div className="pl-6">
          <ResultsList results={results} />
          <DeployLog log={log} />
        </div>
      </div>
    </div>
  );
}
