export function DeployLog({ log }: { log: string[] }) {
  if (log.length === 0) return null;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-2">Log</h2>
      <div className="font-mono text-xs text-gray-400 max-h-48 overflow-y-auto space-y-0.5">
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
