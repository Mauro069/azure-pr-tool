import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AzureConfig, FileChange, PRListItem, PRReviewer, PRStatusFilter } from '../types/azure';
import { getPRFileChanges, getPullRequests, getCurrentUserId, votePR, type FileStats } from '../api/pullRequests';
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
  const humans = reviewers?.filter((r) => !r.isContainer);
  if (!humans || humans.length === 0) return null;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {humans.map((r) => {
        const style = VOTE_STYLES[r.vote] ?? VOTE_STYLES[0];
        return (
          <span
            key={r.id}
            title={`${r.displayName}: ${style.label}`}
            className={`${style.color} w-7 h-7 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-gray-900`}
          >
            {r.imageUrl ? (
              <img src={r.imageUrl} alt={r.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-[10px] font-medium">
                {r.displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// --- Status Dot ---

function StatusDot({ status, isDraft }: { status: string; isDraft: boolean }) {
  const color = isDraft
    ? 'bg-yellow-500'
    : status === 'completed'
      ? 'bg-blue-500'
      : status === 'abandoned'
        ? 'bg-gray-500'
        : 'bg-green-500';
  return <span className={`w-3 h-3 rounded-full shrink-0 ${color}`} />;
}

// --- Tabs ---

const TABS: { key: PRStatusFilter; label: string }[] = [
  { key: 'mine', label: 'Mine' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'abandoned', label: 'Abandoned' },
];

// --- PR List ---

export function PRList({ config }: { config: AzureConfig }) {
  const navigate = useNavigate();
  const [prs, setPrs] = useState<PRListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PRStatusFilter>('active');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [targetBranchFilter, setTargetBranchFilter] = useState('');

  // Fetch current user id for "Mine" tab
  useEffect(() => {
    getCurrentUserId(config).then(setCurrentUserId).catch(() => {});
  }, [config]);

  // Fetch PRs when tab changes
  const fetchPRs = useCallback(async (tab: PRStatusFilter) => {
    setLoading(true);
    try {
      const status = tab === 'mine' ? 'active' : tab;
      const list = await getPullRequests(config, status);
      setPrs(list);
    } catch {
      setPrs([]);
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchPRs(activeTab);
  }, [activeTab, fetchPRs]);

  const handleTabChange = (tab: PRStatusFilter) => {
    setActiveTab(tab);
    setSearchText('');
    setCreatedByFilter('');
    setTargetBranchFilter('');
  };

  // Derived filter options
  const creators = useMemo(() => [...new Set(prs.map((pr) => pr.createdBy.displayName))].sort(), [prs]);
  const targetBranches = useMemo(() => [...new Set(prs.map((pr) => branchName(pr.targetRefName)))].sort(), [prs]);

  const hasFilters = searchText || createdByFilter || targetBranchFilter;

  const clearFilters = () => {
    setSearchText('');
    setCreatedByFilter('');
    setTargetBranchFilter('');
  };

  // Filtered PRs
  const filteredPrs = useMemo(() => {
    let result = prs;

    if (activeTab === 'mine' && currentUserId) {
      result = result.filter(
        (pr) =>
          pr.createdBy.id === currentUserId ||
          pr.reviewers?.some((r) => r.id === currentUserId)
      );
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (pr) =>
          pr.title.toLowerCase().includes(q) ||
          pr.pullRequestId.toString().includes(q)
      );
    }

    if (createdByFilter) {
      result = result.filter((pr) => pr.createdBy.displayName === createdByFilter);
    }

    if (targetBranchFilter) {
      result = result.filter((pr) => branchName(pr.targetRefName) === targetBranchFilter);
    }

    return result;
  }, [prs, activeTab, currentUserId, searchText, createdByFilter, targetBranchFilter]);

  const newPrUrl = `https://dev.azure.com/${config.organization}/${config.project}/_git/${config.repository}/pullrequestcreate`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pull requests</h2>
        <a
          href={newPrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          + New pull request
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`pb-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Pull Request ID or title"
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <select
          value={createdByFilter}
          onChange={(e) => setCreatedByFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">Created by</option>
          {creators.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={targetBranchFilter}
          onChange={(e) => setTargetBranchFilter(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="">Target branch</option>
          {targetBranches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="p-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Clear filters"
          >
            ✕
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-500 text-sm">Cargando pull requests...</div>
      )}

      {/* Empty state */}
      {!loading && filteredPrs.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          {hasFilters ? 'No hay PRs que coincidan con los filtros.' : 'No hay pull requests.'}
        </div>
      )}

      {/* PR list */}
      {!loading && filteredPrs.length > 0 && (
        <div className="divide-y divide-gray-700/50">
          {filteredPrs.map((pr) => (
            <button
              key={pr.pullRequestId}
              onClick={() => navigate(`/review/${pr.pullRequestId}`)}
              className="w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-gray-800/60 cursor-pointer transition-colors group"
            >
              {/* Status dot */}
              <StatusDot status={pr.status ?? 'active'} isDraft={pr.isDraft} />

              {/* Main info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium truncate group-hover:text-blue-300 transition-colors">
                    {pr.title}
                  </span>
                  {pr.isDraft && (
                    <span className="text-[10px] bg-yellow-600/30 text-yellow-300 border border-yellow-600/50 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      Draft
                    </span>
                  )}
                  {pr.autoCompleteSetBy && (
                    <span className="text-[10px] bg-blue-600/30 text-blue-300 border border-blue-600/50 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                      Auto-complete
                    </span>
                  )}
                  {pr.labels?.map((label) => (
                    <span
                      key={label.id}
                      className="text-[10px] bg-gray-600/30 text-gray-300 border border-gray-600/50 px-1.5 py-0.5 rounded-full font-medium shrink-0"
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {pr.createdBy.displayName}
                  <span className="mx-1.5">·</span>
                  <span className="font-mono">#{pr.pullRequestId}</span>
                  <span className="mx-1.5">·</span>
                  <span className="font-mono">{branchName(pr.sourceRefName)}</span>
                  <span className="mx-1"> into </span>
                  <span className="font-mono">{branchName(pr.targetRefName)}</span>
                </div>
              </div>

              {/* Right side: reviewers + time */}
              <div className="flex items-center gap-3 shrink-0">
                <ReviewerBadges reviewers={pr.reviewers} />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  Updated {timeAgo(pr.creationDate)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
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
