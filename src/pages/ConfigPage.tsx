import { useState } from 'react';

const DEFAULT_PROMPT = `Revisa el diff como tech lead del monorepo Angular/Nx. Prioriza: regresiones, side effects fuera del scope del ticket, tipos debiles, y scripts de CI. No comentes estilo ni formato. Maximo 5 hallazgos, uno por linea concreta.`;

const DEFAULT_PATTERNS = `**/*.spec.ts
package-lock.json
pnpm-lock.yaml
**/dist/**`;

const SUGGESTIONS = ['**/*.snap', '**/e2e/**', '*.md', '**/assets/**'];

export function ConfigPage() {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('review-prompt') ?? DEFAULT_PROMPT);
  const [patterns, setPatterns] = useState(() => localStorage.getItem('ignore-patterns') ?? DEFAULT_PATTERNS);
  const [rules, setRules] = useState({
    manualApproval: true,
    autoReview: false,
    limitDiff: true,
  });

  const activePatterns = patterns.split('\n').map(p => p.trim()).filter(Boolean);
  const availableSuggestions = SUGGESTIONS.filter(s => !activePatterns.includes(s));

  const handleSave = () => {
    localStorage.setItem('review-prompt', prompt);
    localStorage.setItem('ignore-patterns', patterns);
  };

  const addPattern = (pattern: string) => {
    setPatterns(prev => prev.trim() + '\n' + pattern);
  };

  return (
    <div className="max-w-[980px]">
      {/* Header */}
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-500 mb-1">Ajustes</p>
      <h1 className="text-[30px] font-[800] tracking-tight leading-none mb-1">Configuracion</h1>
      <div className="border-b-2 border-neutral-900 mb-6" />

      {/* Prompt de review */}
      <section className="pb-6 mb-6 border-b border-neutral-300">
        <h2 className="text-[13px] font-[800] uppercase tracking-[0.06em] mb-1">Prompt de review</h2>
        <p className="text-[12px] text-neutral-700 mb-3 max-w-[70ch]" style={{ textWrap: 'pretty' }}>
          Se envia junto al diff. Los hallazgos vuelven como resumen corto + severidad.
        </p>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={5}
          className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-500 resize-y"
        />
      </section>

      {/* Reglas */}
      <section className="pb-6 mb-6 border-b border-neutral-300">
        <h2 className="text-[13px] font-[800] uppercase tracking-[0.06em] mb-3">Reglas</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rules.manualApproval}
              onChange={e => setRules(r => ({ ...r, manualApproval: e.target.checked }))}
              className="w-[13px] h-[13px] mt-0.5 accent-accent-500 cursor-pointer"
            />
            <span className="text-[12.5px]">Nunca postear sin aprobacion manual</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rules.autoReview}
              onChange={e => setRules(r => ({ ...r, autoReview: e.target.checked }))}
              className="w-[13px] h-[13px] mt-0.5 accent-accent-500 cursor-pointer"
            />
            <span className="text-[12.5px]">Revisar automaticamente al abrir el PR</span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rules.limitDiff}
              onChange={e => setRules(r => ({ ...r, limitDiff: e.target.checked }))}
              className="w-[13px] h-[13px] mt-0.5 accent-accent-500 cursor-pointer"
            />
            <span className="text-[12.5px]">Limitar diffs a 1500 lineas por corrida</span>
          </label>
        </div>
      </section>

      {/* Archivos ignorados */}
      <section className="pb-6 mb-6 border-b border-neutral-300">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[13px] font-[800] uppercase tracking-[0.06em]">Archivos ignorados</h2>
          <span className="text-[11px] text-neutral-600">{activePatterns.length} patrones</span>
        </div>
        <p className="text-[12px] text-neutral-700 mb-3">
          Un patron por linea. Se excluyen del diff antes de mandarlo a la IA.
        </p>
        <div className="grid grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
          <textarea
            value={patterns}
            onChange={e => setPatterns(e.target.value)}
            rows={7}
            className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-3 py-2 text-neutral-900 resize-y"
          />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-700 mb-2">Patrones activos</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {activePatterns.length > 0 ? (
                activePatterns.map(p => (
                  <span key={p} className="font-mono text-[11px] bg-neutral-200 text-neutral-800 px-2 py-0.5">{p}</span>
                ))
              ) : (
                <span className="text-[11px] text-neutral-600">Sin exclusiones: se manda el diff completo.</span>
              )}
            </div>
            {availableSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {availableSuggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => addPattern(s)}
                    className="font-mono text-[11px] border border-neutral-300 text-neutral-700 px-2 py-0.5 hover:bg-neutral-900/[0.07] cursor-pointer transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Conexion */}
      <section className="pb-6">
        <h2 className="text-[13px] font-[800] uppercase tracking-[0.06em] mb-3">Conexion</h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 max-w-[760px]">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700 block mb-1.5">Organizacion</label>
            <input
              type="text"
              value={import.meta.env.VITE_AZDO_ORGANIZATION ?? ''}
              readOnly
              className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-2.5 py-2 text-neutral-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700 block mb-1.5">Proyecto</label>
            <input
              type="text"
              value={import.meta.env.VITE_AZDO_PROJECT ?? ''}
              readOnly
              className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-2.5 py-2 text-neutral-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700 block mb-1.5">Personal access token</label>
            <input
              type="password"
              value={import.meta.env.VITE_AZDO_PAT ?? ''}
              readOnly
              className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-2.5 py-2 text-neutral-900"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700 block mb-1.5">Modelo</label>
            <select className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-2.5 py-2 text-neutral-900 cursor-pointer">
              <option>claude-sonnet</option>
              <option>claude-opus</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            className="px-3.5 py-2 text-[13px] font-semibold bg-accent-500 text-white hover:bg-accent-600 transition-colors cursor-pointer"
          >
            Guardar
          </button>
          <button className="px-3.5 py-2 text-[13px] font-semibold border border-neutral-900 text-neutral-900 hover:bg-neutral-900/[0.07] transition-colors cursor-pointer">
            Probar conexion
          </button>
        </div>
      </section>
    </div>
  );
}
