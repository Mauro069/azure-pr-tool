import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AzureConfig, FileChange, PRListItem, PRReviewer } from '../types/azure';
import { getPRFileChanges, getActivePRs, votePR, type FileStats } from '../api/pullRequests';
import { reviewPRWithGemini, type ReviewIssue } from '../api/gemini';
import { DiffViewer } from './DiffViewer';

// --- Shared helpers ---

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

function branchName(ref: string): string {
  return ref.replace('refs/heads/', '');
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

const VOTE_STYLES: Record<number, { color: string; label: string }> = {
  10: { color: 'bg-green-600', label: 'Aprobado' },
  5: { color: 'bg-green-700', label: 'Aprobado con sugerencias' },
  0: { color: 'bg-gray-600', label: 'Sin voto' },
  [-5]: { color: 'bg-yellow-600', label: 'Wait for author' },
  [-10]: { color: 'bg-red-600', label: 'Rechazado' },
};

function ReviewerBadges({ reviewers }: { reviewers: PRReviewer[] }) {
  if (!reviewers || reviewers.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reviewers.map((r) => {
        const style = VOTE_STYLES[r.vote] ?? VOTE_STYLES[0];
        const initials = r.displayName
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <span
            key={r.id}
            title={`${r.displayName}: ${style.label}`}
            className={`${style.color} text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-medium`}
          >
            {initials}
          </span>
        );
      })}
    </div>
  );
}

// --- PR List ---

export function PRList({ config }: { config: AzureConfig }) {
  const navigate = useNavigate();
  const [prs, setPrs] = useState<PRListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualId, setManualId] = useState('');
  const [showManual, setShowManual] = useState(false);

  const fetchPRs = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getActivePRs(config);
      setPrs(list);
    } catch {
      setPrs([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => { fetchPRs(); }, [fetchPRs]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {loading ? 'Cargando PRs...' : `${prs.length} PR${prs.length !== 1 ? 's' : ''} activa${prs.length !== 1 ? 's' : ''}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManual(!showManual)}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors cursor-pointer"
          >
            ID manual
          </button>
          <button
            onClick={fetchPRs}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : 'Refrescar'}
          </button>
        </div>
      </div>

      {showManual && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const id = Number(manualId);
            if (id > 0) navigate(`/review/${id}`);
          }}
          className="flex gap-2"
        >
          <input
            type="number"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="PR ID"
            min="1"
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Ir
          </button>
        </form>
      )}

      {loading && prs.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">Cargando pull requests...</div>
      )}

      {!loading && prs.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">No hay PRs activas en este repositorio.</div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {prs.map((pr) => (
          <button
            key={pr.pullRequestId}
            onClick={() => navigate(`/review/${pr.pullRequestId}`)}
            className="w-full text-left bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-purple-500 cursor-pointer transition-colors group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400 text-sm font-mono font-medium">#{pr.pullRequestId}</span>
                  {pr.isDraft && <span className="text-xs bg-yellow-600/80 text-yellow-100 px-1.5 py-0.5 rounded font-medium">Draft</span>}
                  <span className="text-white text-sm truncate group-hover:text-purple-200 transition-colors">{pr.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{branchName(pr.sourceRefName)}</span>
                  <span className="text-gray-600 text-xs">→</span>
                  <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{branchName(pr.targetRefName)}</span>
                </div>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="text-xs text-gray-500">{timeAgo(pr.creationDate)}</div>
                <div className="text-xs text-gray-500">{pr.createdBy.displayName}</div>
                <ReviewerBadges reviewers={pr.reviewers} />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- PR Detail ---

function Timer({ running }: { running: boolean }) {
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

export function PRDetail({ config, geminiKey, onWideMode }: { config: AzureConfig; geminiKey: string; onWideMode?: (wide: boolean) => void }) {
  const { prId: prIdParam } = useParams<{ prId: string }>();
  const navigate = useNavigate();
  const prId = Number(prIdParam);

  const [loadingFiles, setLoadingFiles] = useState(true);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [status, setStatus] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [prSource, setPrSource] = useState('');
  const [prTarget, setPrTarget] = useState('');
  const [reviewers, setReviewers] = useState<PRReviewer[]>([]);

  // AI review state
  const [reviewing, setReviewing] = useState(false);
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [reviewDuration, setReviewDuration] = useState(0);

  // Vote state
  const [voting, setVoting] = useState(false);

  // Load files on mount
  useEffect(() => {
    if (!prId) return;
    onWideMode?.(true);

    const load = async () => {
      setLoadingFiles(true);
      try {
        const { pr, files, stats: fileStats } = await getPRFileChanges(config, prId, setStatus);
        setPrTitle(pr.title);
        setPrDescription(pr.description);
        setPrSource(pr.sourceRefName);
        setPrTarget(pr.targetRefName);
        setFileChanges(files);
        setStats(fileStats);
        setStatus('');

        // Fetch reviewers from PR details
        try {
          const prData = await fetch(`/api/azdo/${config.organization}/${config.project}/_apis/git/repositories/${config.repository}/pullrequests/${prId}?api-version=7.1`, {
            headers: { Authorization: 'Basic ' + btoa(':' + config.pat) },
          });
          const prJson = await prData.json();
          setReviewers(prJson.reviewers ?? []);
        } catch { /* ignore */ }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`ERROR: ${msg}`);
      } finally {
        setLoadingFiles(false);
      }
    };

    load();

    return () => { onWideMode?.(false); };
  }, [config, prId, onWideMode]);

  const handleAIReview = useCallback(async () => {
    if (!geminiKey || fileChanges.length === 0) return;
    setReviewing(true);
    setIssues([]);
    setReviewDuration(0);
    const startTime = Date.now();

    try {
      setStatus(`Enviando ${fileChanges.length} archivos a Gemini...`);
      const result = await reviewPRWithGemini(
        geminiKey,
        prTitle,
        prDescription,
        fileChanges,
        setStatus
      );
      setIssues(result);
      setReviewDuration(Date.now() - startTime);
      setStatus(result.length === 0
        ? 'Sin problemas relevantes.'
        : `${result.length} problema(s) encontrado(s)`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`ERROR: ${msg}`);
      setReviewDuration(Date.now() - startTime);
    } finally {
      setReviewing(false);
    }
  }, [geminiKey, fileChanges, prTitle, prDescription]);

  const handleVote = async (vote: number) => {
    setVoting(true);
    try {
      await votePR(config, prId, vote);
      // Refresh reviewers
      const prData = await fetch(`/api/azdo/${config.organization}/${config.project}/_apis/git/repositories/${config.repository}/pullrequests/${prId}?api-version=7.1`, {
        headers: { Authorization: 'Basic ' + btoa(':' + config.pat) },
      });
      const prJson = await prData.json();
      setReviewers(prJson.reviewers ?? []);
    } catch {
      // ignore
    } finally {
      setVoting(false);
    }
  };

  const handleBack = () => {
    onWideMode?.(false);
    navigate('/review');
  };

  if (loadingFiles) {
    return (
      <div className="space-y-4">
        <button onClick={handleBack} className="text-sm text-gray-400 hover:text-white cursor-pointer">← Volver a la lista</button>
        <div className="font-mono text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3">{status || 'Cargando archivos...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="text-sm text-gray-400 hover:text-white cursor-pointer">← Volver</button>
          <span className="text-purple-400 font-mono font-medium">#{prId}</span>
          <span className="text-white text-sm truncate max-w-md">{prTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <ReviewerBadges reviewers={reviewers} />

          <button
            onClick={() => handleVote(10)}
            disabled={voting}
            className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Aprobar
          </button>
          <button
            onClick={() => handleVote(-5)}
            disabled={voting}
            className="px-3 py-1.5 text-xs bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            Wait for author
          </button>

          {geminiKey && (
            <button
              onClick={handleAIReview}
              disabled={reviewing || fileChanges.length === 0}
              className="px-3 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {reviewing ? 'Revisando...' : issues.length > 0 ? `IA (${issues.length})` : 'Revisar con IA'}
            </button>
          )}

          <Timer running={reviewing} />

          {reviewDuration > 0 && !reviewing && (
            <span className="text-[10px] text-gray-500 font-mono">{formatDuration(reviewDuration)}</span>
          )}
        </div>
      </div>

      {/* Branch info */}
      {prSource && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{branchName(prSource)}</span>
          <span className="text-gray-600 text-xs">→</span>
          <span className="text-xs font-mono bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{branchName(prTarget)}</span>
          {stats && (
            <span className="text-[10px] text-gray-500 ml-2">
              {stats.reviewed} archivos · {stats.skipped.length} skipeados · {stats.binary.length} binarios
            </span>
          )}
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="font-mono text-xs text-gray-400 bg-gray-800/50 rounded-lg p-2">{status}</div>
      )}

      {/* Diff viewer */}
      {fileChanges.length > 0 && (
        <DiffViewer
          config={config}
          prId={prId}
          files={fileChanges}
          issues={issues}
          onBack={handleBack}
          hideBackButton
        />
      )}

      {fileChanges.length === 0 && !loadingFiles && (
        <div className="text-center py-8 text-gray-500 text-sm">No se encontraron archivos para mostrar.</div>
      )}
    </div>
  );
}
