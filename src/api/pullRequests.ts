import type {
  AzureConfig,
  WorkItemRef,
  PullRequestDetail,
  PRIteration,
  PRIterationChange,
  FileChange,
  PRListItem,
  PRReviewer,
  PRThread,
} from '../types/azure';
import { azureFetch, buildBaseUrl, buildHeaders } from './client';
import { shouldSkipForReview } from './skipPatterns';
import { isBinaryFile, CHANGE_TYPE_MAP } from '../constants/files';
import { normalizePath } from '../utils/paths';

export type { FileStats } from '../types/review';
import type { FileStats } from '../types/review';

export type PRStatus = 'active' | 'completed' | 'abandoned' | 'all';

export async function getPullRequests(
  config: AzureConfig,
  status: PRStatus = 'active'
): Promise<PRListItem[]> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests?searchCriteria.status=${status}&$top=50&api-version=7.1`;
  const data = await azureFetch<{ value: PRListItem[] }>(url, config.pat);
  return data.value;
}

export async function getActivePRs(config: AzureConfig): Promise<PRListItem[]> {
  return getPullRequests(config, 'active');
}

interface WorkItemRefsResponse {
  value: WorkItemRef[];
  count: number;
}

export async function getPRWorkItems(
  config: AzureConfig,
  prId: number
): Promise<WorkItemRef[]> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullRequests/${prId}/workitems?api-version=7.1`;
  const data = await azureFetch<WorkItemRefsResponse>(url, config.pat);
  return data.value;
}

export async function getPRDetails(
  config: AzureConfig,
  prId: number
): Promise<PullRequestDetail> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}?api-version=7.1`;
  return azureFetch<PullRequestDetail>(url, config.pat);
}

export async function getPRIterations(
  config: AzureConfig,
  prId: number
): Promise<PRIteration[]> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullRequests/${prId}/iterations?api-version=7.1`;
  const data = await azureFetch<{ value: PRIteration[] }>(url, config.pat);
  return data.value;
}

export async function getPRIterationChanges(
  config: AzureConfig,
  prId: number,
  iterationId: number
): Promise<PRIterationChange[]> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullRequests/${prId}/iterations/${iterationId}/changes?$top=2000&api-version=7.1`;
  const data = await azureFetch<{ changeEntries: PRIterationChange[] }>(url, config.pat);
  return data.changeEntries;
}

export async function getFileContent(
  config: AzureConfig,
  path: string,
  commitId: string
): Promise<string> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/items?path=${encodeURIComponent(path)}&versionDescriptor.versionType=commit&versionDescriptor.version=${commitId}&includeContent=true&api-version=7.1`;

  const res = await fetch(url, {
    headers: buildHeaders(config.pat),
  });

  if (!res.ok) {
    return '(no se pudo obtener el contenido)';
  }

  return res.text();
}

export async function getPRFileChanges(
  config: AzureConfig,
  prId: number
): Promise<{ pr: PullRequestDetail; files: FileChange[]; stats: FileStats }> {
  const pr = await getPRDetails(config, prId);
  const iterations = await getPRIterations(config, prId);
  const lastIteration = iterations[iterations.length - 1];
  const changes = await getPRIterationChanges(config, prId, lastIteration.id);

  const blobs = changes.filter((c) => c.item.gitObjectType === 'blob' || !c.item.gitObjectType);
  const binary = blobs.filter((c) => c.item.path && isBinaryFile(c.item.path)).map((c) => c.item.path);
  const nonBinary = blobs.filter((c) => c.item.path && !isBinaryFile(c.item.path));
  const skipped = nonBinary.filter((c) => shouldSkipForReview(c.item.path)).map((c) => c.item.path);
  const fileChanges = nonBinary.filter((c) => !shouldSkipForReview(c.item.path)).slice(0, 20);

  const stats: FileStats = {
    total: blobs.length,
    reviewed: fileChanges.length,
    skipped,
    binary,
  };

  const sourceCommit = pr.lastMergeSourceCommit.commitId;
  const targetCommit = pr.lastMergeTargetCommit.commitId;
  const files: FileChange[] = [];
  const MAX_CONTENT_LENGTH = 15000;

  for (const change of fileChanges) {
    const changeType = CHANGE_TYPE_MAP[change.changeType] ?? 'edit';
    const file: FileChange = { path: change.item.path, changeType };

    if (changeType === 'add' || changeType === 'edit' || changeType === 'rename') {
      file.newContent = await getFileContent(config, change.item.path, sourceCommit);
      if (file.newContent.length > MAX_CONTENT_LENGTH) {
        file.newContent = file.newContent.substring(0, MAX_CONTENT_LENGTH) + '\n... (truncado)';
      }
    }

    if (changeType === 'edit' || changeType === 'delete') {
      file.oldContent = await getFileContent(config, change.item.path, targetCommit);
      if (file.oldContent.length > MAX_CONTENT_LENGTH) {
        file.oldContent = file.oldContent.substring(0, MAX_CONTENT_LENGTH) + '\n... (truncado)';
      }
    }

    files.push(file);
  }

  return { pr, files, stats };
}

export async function getPRReviewers(
  config: AzureConfig,
  prId: number
): Promise<PRReviewer[]> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}?api-version=7.1`;
  const data = await azureFetch<{ reviewers?: PRReviewer[] }>(url, config.pat);
  return data.reviewers ?? [];
}

interface PullRequestResponse {
  pullRequestId: number;
  labels: { id: string; name: string }[];
}

export async function addLabelToPR(
  config: AzureConfig,
  prId: number,
  label: string
): Promise<void> {
  const base = buildBaseUrl(config);

  // Primero obtener la PR para ver si ya tiene el label
  const prUrl = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}?api-version=7.1`;
  const pr = await azureFetch<PullRequestResponse>(prUrl, config.pat);

  if (pr.labels?.some((l) => l.name === label)) {
    return; // Ya tiene el label
  }

  // Agregar el label
  const labelUrl = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}/labels?api-version=7.1`;
  await azureFetch(labelUrl, config.pat, {
    method: 'POST',
    body: JSON.stringify({ name: label }),
  });
}

function parseLineRange(line: string): { start: number; end: number } {
  const parts = line.split('-').map((s) => parseInt(s.trim(), 10));
  const start = parts[0] || 1;
  const end = parts[1] || start;
  return { start, end };
}

export async function postPRComment(
  config: AzureConfig,
  prId: number,
  filePath: string,
  line: string,
  message: string
): Promise<void> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}/threads?api-version=7.1`;
  const { start, end } = parseLineRange(line);

  const normalizedPath = normalizePath(filePath);

  await azureFetch(url, config.pat, {
    method: 'POST',
    body: JSON.stringify({
      comments: [{ content: message, commentType: 1 }],
      status: 1,
      threadContext: {
        filePath: normalizedPath,
        rightFileStart: { line: start, offset: 1 },
        rightFileEnd: { line: end, offset: 1 },
      },
    }),
  });
}

export async function getPRThreads(
  config: AzureConfig,
  prId: number
): Promise<PRThread[]> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}/threads?api-version=7.1`;
  const data = await azureFetch<{ value: PRThread[] }>(url, config.pat);
  return data.value;
}

export async function replyToThread(
  config: AzureConfig,
  prId: number,
  threadId: number,
  message: string
): Promise<void> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}/threads/${threadId}/comments?api-version=7.1`;
  await azureFetch(url, config.pat, {
    method: 'POST',
    body: JSON.stringify({ content: message, commentType: 1 }),
  });
}

let cachedUserId: string | null = null;

export async function getCurrentUserId(config: AzureConfig): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const data = await azureFetch<{ authenticatedUser: { id: string } }>(
    '/api/azdo/_apis/connectionData?api-version=7.1',
    config.pat
  );
  cachedUserId = data.authenticatedUser.id;
  return cachedUserId;
}

export async function votePR(
  config: AzureConfig,
  prId: number,
  vote: number
): Promise<void> {
  const userId = await getCurrentUserId(config);
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}/reviewers/${userId}?api-version=7.1`;
  await azureFetch(url, config.pat, {
    method: 'PUT',
    body: JSON.stringify({ vote }),
  });
}
