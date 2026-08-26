import { useState, useEffect, useRef } from 'react';
import { formatDuration } from '../../utils/time';

export function Timer({ running }: { running: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (!running) return;
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [running]);

  if (!running && elapsed === 0) return null;

  return (
    <span className={`font-mono text-sm ${running ? 'text-purple-400' : 'text-gray-400'}`}>
      {running && <span className="inline-block animate-pulse mr-1.5">●</span>}
      {formatDuration(elapsed)}
    </span>
  );
}
