import type { AzureConfig } from '../../types/azure';
import { useDeploy } from '../../hooks/useDeploy';
import { PRInput } from '../PRInput';
import { ResultsList } from '../ResultsList';
import { DeployLog } from './DeployLog';

export function DeployPage({ config }: { config: AzureConfig }) {
  const { results, loading, log, handleProcess } = useDeploy(config);

  return (
    <>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Pull Requests</h2>
        <PRInput onProcess={handleProcess} loading={loading} />
      </div>

      <DeployLog log={log} />
      <ResultsList results={results} />
    </>
  );
}
