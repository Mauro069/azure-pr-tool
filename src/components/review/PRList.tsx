import { useNavigate } from 'react-router-dom';
import type { AzureConfig, PRStatusFilter } from '../../types/azure';
import { usePRList } from '../../hooks/usePRList';
import { timeAgo } from '../../utils/time';
import { branchName } from '../../utils/paths';
import { ReviewerBadges } from './ReviewerBadges';
import { StatusDot } from './StatusDot';
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
        <div className="divide-y divide-gray-700/50">
          {filteredPrs.map((pr) => (
            <button
              key={pr.pullRequestId}
              onClick={() => navigate(`/review/${pr.pullRequestId}`)}
              className="w-full text-left flex items-center gap-4 px-4 py-3 hover:bg-gray-800/60 cursor-pointer transition-colors group"
            >
              <StatusDot status={pr.status ?? 'active'} isDraft={pr.isDraft} />

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
