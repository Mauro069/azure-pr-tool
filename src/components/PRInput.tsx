import { useState } from 'react';

interface Props {
  onProcess: (prIds: number[]) => void;
  loading: boolean;
}

export function PRInput({ onProcess, loading }: Props) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          IDs de Pull Requests (separados por coma, espacio o salto de línea)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"12345\n12346, 12347"}
          rows={4}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-y"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors cursor-pointer"
      >
        {loading ? 'Procesando...' : 'Procesar PRs'}
      </button>
    </form>
  );
}
