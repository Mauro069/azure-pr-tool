import { useState } from 'react';

interface Props {
  onProcess: (prIds: number[]) => void;
  loading: boolean;
  resultCount?: number;
}

export function PRInput({ onProcess, loading, resultCount = 0 }: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = input
      .split(/[,\n\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);

    if (ids.length > 0) {
      onProcess(ids);
    }
  };

  const parsedCount = input
    .split(/[,\n\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700 block mb-1.5">
          IDs de pull requests
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"4959\n4955, 4949\n4947"}
          rows={6}
          className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 resize-y"
          required
        />
        <p className="text-[11px] text-neutral-600 mt-1">Separados por coma, espacio o salto de linea.</p>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700 block mb-1.5">
          Estado destino
        </label>
        <select className="w-full font-mono text-[12px] bg-neutral-50 border border-neutral-300 px-2.5 py-2 text-neutral-900 cursor-pointer">
          <option>Resolved</option>
          <option>Closed</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-3.5 py-2.5 text-[13px] font-semibold bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-45 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando...' : resultCount > 0 ? `✓ ${resultCount} work items resueltos` : `Marcar ${parsedCount || 0} como Resolved`}
      </button>
    </form>
  );
}
