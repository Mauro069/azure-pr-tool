import { useNavigate } from 'react-router-dom';
import type { AzureConfig, PRStatusFilter } from '../../types/azure';
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
    <div>
      {/* Header */}
      <div className="flex items-end justify-between mb-1">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-500 mb-1">Revision asistida</p>
          <h1 className="text-[30px] font-[800] tracking-tight leading-none">Pull requests</h1>
        </div>
        <a
          href={newPrUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-2 text-[13px] font-semibold bg-accent-500 text-white hover:bg-accent-600 transition-colors"
        >
          New pull request
        </a>
      </div>

      <div className="border-b-2 border-neutral-900 mb-3" />

      {/* Tabs */}
      <div className="flex gap-5 border-b border-neutral-300 mb-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`pb-2 text-[13px] transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'font-bold text-neutral-900 border-b-2 border-accent-500 -mb-px'
                : 'font-semibold text-neutral-700 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-[minmax(0,1fr)_200px_200px] border-b border-neutral-300">
        <div className="px-3 py-2.5 border-r border-neutral-300">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Pull Request ID or title"
            className="w-full bg-transparent text-[13px] text-neutral-900 placeholder-neutral-500 outline-none"
          />
        </div>
        <div className="px-3 py-1 border-r border-neutral-300 flex items-center">
          <Select
            value={createdByFilter}
            onChange={setCreatedByFilter}
            placeholder="Created by"
            options={creators.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div className="px-3 py-1 flex items-center">
          <Select
            value={targetBranchFilter}
            onChange={setTargetBranchFilter}
            placeholder="Target branch"
            options={targetBranches.map((b) => ({ value: b, label: b }))}
          />
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer text-[11px]"
              title="Clear filters"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[28px_minmax(0,1fr)_180px_100px] items-center border-b-2 border-neutral-900 py-2 px-0">
        <span />
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">Pull request</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">Revisores</span>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-700">Actualizado</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-neutral-500 text-[13px]">Cargando pull requests...</div>
      )}

      {/* Empty state */}
      {!loading && filteredPrs.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[13px]">
          {hasFilters ? 'No hay PRs que coincidan con los filtros.' : 'No hay pull requests.'}
        </div>
      )}

      {/* PR rows */}
      {!loading && filteredPrs.length > 0 && (
        <div>
          {filteredPrs.map((pr) => (
            <button
              key={pr.pullRequestId}
              onClick={() => navigate(`/review/${pr.pullRequestId}`)}
              className={`w-full text-left grid grid-cols-[28px_minmax(0,1fr)_180px_100px] items-center py-2.5 border-b border-neutral-300 hover:bg-neutral-900/[0.04] cursor-pointer transition-colors ${
                pr.isDraft ? 'opacity-55' : ''
              }`}
            >
              {/* Checkbox */}
              <span className="flex justify-center">
                <input
                  type="checkbox"
                  className="w-[14px] h-[14px] accent-accent-500 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
              </span>

              {/* PR info */}
              <div className="flex items-start gap-2 min-w-0 pr-3">
                <span className="font-mono text-[11px] text-neutral-500 w-[44px] text-center shrink-0 pt-0.5">
                  !{pr.pullRequestId}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[13.5px] font-semibold tracking-tight truncate">
                      {pr.title}
                    </span>
                    {pr.isDraft && (
                      <span className="text-[9px] font-bold uppercase bg-neutral-200 text-neutral-700 px-1.5 py-0.5 shrink-0">
                        Draft
                      </span>
                    )}
                    {pr.mergeStatus === 'conflicts' && (
                      <span className="text-[9px] font-bold uppercase border border-accent-700 text-accent-700 px-1.5 py-0.5 shrink-0">
                        Conflicts
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-neutral-600 truncate">
                    {pr.createdBy.displayName} → {branchName(pr.targetRefName)}
                  </div>
                </div>
              </div>

              {/* Reviewers */}
              <div className="flex items-center">
                <ReviewerBadges reviewers={pr.reviewers} />
              </div>

              {/* Updated */}
              <span className="text-[11px] text-neutral-600">
                {timeAgo(pr.creationDate)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
