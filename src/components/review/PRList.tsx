import { useNavigate } from 'react-router-dom';
import type { AzureConfig, PRStatusFilter, PRListItem } from '../../types/azure';
import { usePRList } from '../../hooks/usePRList';
import { timeAgo } from '../../utils/time';
import { branchName } from '../../utils/paths';
import { ReviewerBadges } from './ReviewerBadges';
import { Select } from '../Select';

const TABS: { key: PRStatusFilter; label: string }[] = [
  { key: 'mine', label: 'Mine' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'abandoned', label: 'Abandoned' },
];

export function PRList({ config }: { config: AzureConfig }) {
  const navigate = useNavigate();
  const {
    loading,
    activeTab,
    filteredPrs,
    creators,
    targetBranches,
    hasFilters,
    searchText,
    createdByFilter,
    targetBranchFilter,
    setSearchText,
    setCreatedByFilter,
    setTargetBranchFilter,
    handleTabChange,
    clearFilters,
  } = usePRList(config);

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
        <Select
          value={createdByFilter}
          onChange={setCreatedByFilter}
          placeholder="Created by"
          options={creators.map((c) => ({ value: c, label: c }))}
        />
        <Select
          value={targetBranchFilter}
          onChange={setTargetBranchFilter}
          placeholder="Target branch"
          options={targetBranches.map((b) => ({ value: b, label: b }))}
        />
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
        <div className="border border-gray-700 rounded">
          {filteredPrs.map((pr, i) => (
            <button
              key={pr.pullRequestId}
              onClick={() => navigate(`/review/${pr.pullRequestId}`)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-gray-800/60 cursor-pointer transition-colors group border-l-3 ${getBorderColor(pr)} ${i > 0 ? 'border-t border-t-gray-700/50' : ''}`}
            >
              {/* Creator avatar */}
              <CreatorAvatar pr={pr} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white text-sm font-medium truncate group-hover:text-blue-300 transition-colors">
                    {pr.title}
                  </span>
                  {pr.mergeStatus === 'conflicts' && (
                    <span className="text-[10px] bg-red-600/30 text-red-300 border border-red-600/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                      Conflicts
                    </span>
                  )}
                  {pr.isDraft && (
                    <span className="text-[10px] bg-gray-600/30 text-gray-300 border border-gray-600/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                      Draft
                    </span>
                  )}
                  {pr.autoCompleteSetBy && (
                    <span className="text-[10px] bg-green-600/30 text-green-300 border border-green-600/50 px-1.5 py-0.5 rounded font-medium shrink-0">
                      Auto-complete
                    </span>
                  )}
                  {pr.labels?.map((label) => (
                    <span
                      key={label.id}
                      className="text-[10px] bg-gray-600/30 text-gray-300 border border-gray-600/50 px-1.5 py-0.5 rounded font-medium shrink-0"
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {pr.createdBy.displayName}
                  <span className="mx-1">request</span>
                  <span className="font-mono">!{pr.pullRequestId}</span>
                  <span className="mx-1">into</span>
                  <svg className="inline w-3 h-3 text-gray-500 mx-0.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5 3.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm0 9.5a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm7.5-.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 6.5v3a3.25 3.25 0 0 0 3.25-3.25v-.003A3.252 3.252 0 0 1 11.5 3h.293l-1.147-1.146a.5.5 0 0 1 .708-.708l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L11.793 4H11.5A2.252 2.252 0 0 0 9.25 6.247v.003A4.25 4.25 0 0 1 5 10.5v3" />
                  </svg>
                  <span className="font-mono">{branchName(pr.targetRefName)}</span>
                </div>
              </div>

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

function getBorderColor(pr: PRListItem): string {
  if (pr.isDraft) return 'border-l-yellow-500';
  if (pr.status === 'completed') return 'border-l-blue-500';
  if (pr.status === 'abandoned') return 'border-l-gray-500';
  return 'border-l-blue-500';
}

function CreatorAvatar({ pr }: { pr: PRListItem }) {
  const initials = pr.createdBy.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-gray-600 shrink-0">
      {pr.createdBy.imageUrl ? (
        <img src={pr.createdBy.imageUrl} alt={pr.createdBy.displayName} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white text-xs font-medium">{initials}</span>
      )}
    </span>
  );
}
