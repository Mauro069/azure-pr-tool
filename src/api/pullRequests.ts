import type {
  AzureConfig,
  WorkItemRef,
  PullRequestDetail,
  PRIteration,
  PRIterationChange,
  FileChange,
  PRListItem,
  PRThread,
} from '../types/azure';
import { azureFetch, buildBaseUrl, buildHeaders } from './client';
import { shouldSkipForReview } from './skipPatterns';

export async function getActivePRs(config: AzureConfig): Promise<PRListItem[]> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/git/repositories/${config.repository}/pullrequests?searchCriteria.status=active&api-version=7.1`;
  const data = await azureFetch<{ value: PRListItem[] }>(url, config.pat);
  return data.value;
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

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.mp3', '.mp4', '.avi', '.mov',
  '.exe', '.dll', '.so', '.dylib',
]);

function isBinaryFile(path: string): boolean {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

const CHANGE_TYPE_MAP: Record<number, string> = {
  1: 'add',
  2: 'edit',
  16: 'delete',
  18: 'rename',
};

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

export interface FileStats {
  total: number;
  reviewed: number;
  skipped: string[];
  binary: string[];
}

export async function getPRFileChanges(
  config: AzureConfig,
  prId: number,
  onProgress?: (msg: string) => void
): Promise<{ pr: PullRequestDetail; files: FileChange[]; stats: FileStats }> {
  onProgress?.('Obteniendo detalles de la PR...');
  const pr = await getPRDetails(config, prId);

  onProgress?.('Obteniendo iteraciones...');
  const iterations = await getPRIterations(config, prId);
  const lastIteration = iterations[iterations.length - 1];

  onProgress?.('Obteniendo archivos cambiados...');
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

  onProgress?.(`Obteniendo contenido de ${fileChanges.length} archivos...`);

  const sourceCommit = pr.lastMergeSourceCommit.commitId;
  const targetCommit = pr.lastMergeTargetCommit.commitId;
  const files: FileChange[] = [];

  for (const change of fileChanges) {
    const changeType = CHANGE_TYPE_MAP[change.changeType] ?? 'edit';
    const file: FileChange = { path: change.item.path, changeType };

    if (changeType === 'add' || changeType === 'edit' || changeType === 'rename') {
      file.newContent = await getFileContent(config, change.item.path, sourceCommit);
      if (file.newContent.length > 15000) {
        file.newContent = file.newContent.substring(0, 15000) + '\n... (truncado)';
      }
    }

    if (changeType === 'edit' || changeType === 'delete') {
      file.oldContent = await getFileContent(config, change.item.path, targetCommit);
      if (file.oldContent.length > 15000) {
        file.oldContent = file.oldContent.substring(0, 15000) + '\n... (truncado)';
      }
    }

    files.push(file);
    onProgress?.(`  ${change.item.path} (${changeType})`);
  }

  return { pr, files, stats };
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

  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

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
