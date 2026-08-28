import { useState, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { AzureConfig } from './types/azure';
import { DeployPage } from './components/deploy/DeployPage';
import { PRList } from './components/review/PRList';
import { PRDetailPage } from './components/review/PRDetailPage';
import { GlobalHeader } from './components/layout/GlobalHeader';
import { ConfigPage } from './pages/ConfigPage';
import { createGeminiProvider } from './api/gemini';

const config: AzureConfig = {
  organization: import.meta.env.VITE_AZDO_ORGANIZATION,
  project: import.meta.env.VITE_AZDO_PROJECT,
  repository: import.meta.env.VITE_AZDO_REPOSITORY,
  pat: import.meta.env.VITE_AZDO_PAT,
};

const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isConfigured = config.organization && config.project && config.repository && config.pat;

function App() {
  const [scope, setScope] = useState<'mvp' | 'completo'>('mvp');
  const aiProvider = useMemo(() => geminiKey ? createGeminiProvider(geminiKey) : null, []);

  return (
    <div className="min-h-screen">
      {!isConfigured ? (
        <div className="max-w-2xl mx-auto px-6 py-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-500 mb-1">Error</p>
          <h1 className="text-[30px] font-[800] tracking-tight leading-none mb-6">Configuracion</h1>
          <div className="border-l-[3px] border-accent-500 bg-neutral-50 p-4">
            <p className="text-neutral-700 mb-3">
              Falta configuracion. Completa las variables en el archivo <code className="font-mono text-[12px] font-semibold">.env</code>
            </p>
            <pre className="font-mono text-[12px] text-neutral-800 leading-relaxed">
{`VITE_AZDO_ORGANIZATION=tu-org
VITE_AZDO_PROJECT=tu-proyecto
VITE_AZDO_REPOSITORY=tu-repo
VITE_AZDO_PAT=tu-token
VITE_GEMINI_API_KEY=tu-api-key`}
            </pre>
          </div>
        </div>
      ) : (
        <>
          <GlobalHeader config={config} scope={scope} onScopeChange={setScope} />
          <main className="px-6 py-6">
            <Routes>
              <Route path="/review" element={<PRList config={config} />} />
              <Route path="/review/:prId" element={<PRDetailPage config={config} aiProvider={aiProvider} />} />
              <Route path="/deploy" element={<DeployPage config={config} />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="*" element={<Navigate to="/review" replace />} />
            </Routes>
          </main>
        </>
      )}
    </div>
  );
}

export default App;
