export function DeployLog({ log }: { log: string[] }) {
  if (log.length === 0) return null;

  return (
    <div className="mt-4 bg-neutral-50 border border-neutral-300 p-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700 mb-2">Log</h3>
      <div className="font-mono text-[11px] text-neutral-600 max-h-48 overflow-y-auto space-y-0.5">
        {log.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
