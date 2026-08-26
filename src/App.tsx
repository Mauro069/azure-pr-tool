import { useState, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { PRInput } from './components/PRInput';
import { ResultsList } from './components/ResultsList';
import { PRList, PRDetail } from './components/PRReview';
import type { AzureConfig, ProcessedWorkItem } from './types/azure';
import { getPRWorkItems, addLabelToPR } from './api/pullRequests';
import { getWorkItem, getTargetState, resolveWorkItem } from './api/workItems';

const config: AzureConfig = {
  organization: import.meta.env.VITE_AZDO_ORGANIZATION,
  project: import.meta.env.VITE_AZDO_PROJECT,
  repository: import.meta.env.VITE_AZDO_REPOSITORY,
  pat: import.meta.env.VITE_AZDO_PAT,
};

const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isConfigured = config.organization && config.project && config.repository && config.pat;

function DeployPage() {
  const [results, setResults] = useState<ProcessedWorkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleProcess = useCallback(
    async (prIds: number[]) => {
      setLoading(true);
      setResults([]);
      setLog([]);

      const allResults: ProcessedWorkItem[] = [];
      const processedIds = new Set<string>();

      for (const prId of prIds) {
        addLog(`PR #${prId}: obteniendo work items...`);
        try {
          const workItemRefs = await getPRWorkItems(config, prId);
          addLog(`PR #${prId}: ${workItemRefs.length} work items encontrados`);

          for (const ref of workItemRefs) {
            if (processedIds.has(ref.id)) {
              addLog(`  WI #${ref.id}: ya procesado, saltando`);
              continue;
            }
            processedIds.add(ref.id);

            try {
              const detail = await getWorkItem(config, ref.id);
              const type = detail.fields['System.WorkItemType'];
              const title = detail.fields['System.Title'];
              const previousState = detail.fields['System.State'];
              const targetState = getTargetState(type);
              const url = `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${ref.id}`;

              addLog(`  WI #${ref.id} (${type}): ${previousState} -> ${targetState}`);

              await resolveWorkItem(config, ref.id, targetState);

              allResults.push({
                id: ref.id,
                title,
                type,
                previousState,
                newState: targetState,
                url,
                success: true,
              });
              addLog(`  WI #${ref.id}: actualizado correctamente`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              addLog(`  WI #${ref.id}: ERROR - ${msg}`);
              allResults.push({
                id: ref.id,
                title: '',
                type: '',
                previousState: '',
                newState: 'Resolved',
                url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${ref.id}`,
                success: false,
                error: msg,
              });
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          addLog(`PR #${prId}: ERROR - ${msg}`);
        }
      }

      // Agregar tag "ULTIMA DESPLEGADA" a la última PR
      const lastPrId = prIds[prIds.length - 1];
      addLog(`PR #${lastPrId}: agregando tag "ULTIMA DESPLEGADA"...`);
      try {
        await addLabelToPR(config, lastPrId, 'ULTIMA DESPLEGADA');
        addLog(`PR #${lastPrId}: tag agregado correctamente`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addLog(`PR #${lastPrId}: ERROR al agregar tag - ${msg}`);
      }

      setResults(allResults);
      setLoading(false);
    },
    []
  );

  return (
    <>
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Pull Requests</h2>
        <PRInput onProcess={handleProcess} loading={loading} />
      </div>

      {log.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-2">Log</h2>
          <div className="font-mono text-xs text-gray-400 max-h-48 overflow-y-auto space-y-0.5">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      <ResultsList results={results} />
    </>
  );
}

function ReviewListPage() {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Pull Requests activas</h2>
      <PRList config={config} />
    </div>
  );
}

function ReviewDetailPage({ onWideMode }: { onWideMode: (wide: boolean) => void }) {
  return <PRDetail config={config} geminiKey={geminiKey} onWideMode={onWideMode} />;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-t-lg font-medium transition-colors cursor-pointer ${
    isActive
      ? 'bg-gray-800 text-white border-t border-x border-gray-700'
      : 'text-gray-400 hover:text-gray-200'
  }`;

function App() {
  const [wideMode, setWideMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className={`${wideMode ? 'max-w-[95vw]' : 'max-w-3xl'} mx-auto px-4 py-8 space-y-6 transition-all`}>
        <h1 className="text-3xl font-bold text-center">Azure DevOps PR Tool</h1>

        {!isConfigured ? (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 text-center">
            <p className="text-red-400">
              Falta configuración. Completa las variables en el archivo <code className="bg-gray-800 px-2 py-0.5 rounded">.env</code>
            </p>
            <pre className="mt-3 text-left text-sm text-gray-400 bg-gray-800 rounded-lg p-4">
{`VITE_AZDO_ORGANIZATION=tu-org
VITE_AZDO_PROJECT=tu-proyecto
VITE_AZDO_REPOSITORY=tu-repo
VITE_AZDO_PAT=tu-token
VITE_GEMINI_API_KEY=tu-api-key`}
            </pre>
          </div>
        ) : (
          <>
            <p className="text-sm text-green-400 text-center">
              {config.organization}/{config.project}/{config.repository}
            </p>

            <div className="flex gap-1">
              <NavLink to="/deploy" className={navLinkClass}>
                Deploy (Work Items)
              </NavLink>
              <NavLink to="/review" className={navLinkClass}>
                Review con IA
              </NavLink>
            </div>

            <Routes>
              <Route path="/deploy" element={<DeployPage />} />
              <Route path="/review" element={<ReviewListPage />} />
              <Route path="/review/:prId" element={<ReviewDetailPage onWideMode={setWideMode} />} />
              <Route path="*" element={<Navigate to="/deploy" replace />} />
            </Routes>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
