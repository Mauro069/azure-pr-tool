import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import type { AzureConfig } from './types/azure';
import { DeployPage } from './components/deploy/DeployPage';
import { PRList } from './components/review/PRList';
import { PRDetailPage } from './components/review/PRDetailPage';

const config: AzureConfig = {
  organization: import.meta.env.VITE_AZDO_ORGANIZATION,
  project: import.meta.env.VITE_AZDO_PROJECT,
  repository: import.meta.env.VITE_AZDO_REPOSITORY,
  pat: import.meta.env.VITE_AZDO_PAT,
};

const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isConfigured = config.organization && config.project && config.repository && config.pat;

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
      <div className={`${wideMode ? 'max-w-[95vw]' : 'max-w-5xl'} mx-auto px-4 py-8 space-y-6 transition-all`}>
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
              <Route path="/deploy" element={<DeployPage config={config} />} />
              <Route path="/review" element={<PRList config={config} />} />
              <Route path="/review/:prId" element={<PRDetailPage config={config} geminiKey={geminiKey} onWideMode={setWideMode} />} />
              <Route path="*" element={<Navigate to="/deploy" replace />} />
            </Routes>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
