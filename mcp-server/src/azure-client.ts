export interface AzureConfig {
  organization: string;
  project: string;
  repository: string;
  pat: string;
}

function authHeader(pat: string): Record<string, string> {
  return {
    Authorization: 'Basic ' + Buffer.from(':' + pat).toString('base64'),
    'Content-Type': 'application/json',
  };
}

function baseUrl(config: AzureConfig): string {
  return `https://dev.azure.com/${config.organization}/${config.project}`;
}

async function azureFetch<T>(url: string, pat: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...authHeader(pat),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure DevOps API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// --- PR Work Items ---

interface WorkItemRef {
  id: string;
  url: string;
}

export async function getPRWorkItems(config: AzureConfig, prId: number): Promise<WorkItemRef[]> {
  const url = `${baseUrl(config)}/_apis/git/repositories/${config.repository}/pullRequests/${prId}/workitems?api-version=7.1`;
  const data = await azureFetch<{ value: WorkItemRef[] }>(url, config.pat);
  return data.value;
}

// --- Work Item Details ---

interface WorkItemDetail {
  id: number;
  fields: {
    'System.WorkItemType': string;
    'System.Title': string;
    'System.State': string;
  };
}

export async function getWorkItem(config: AzureConfig, id: string): Promise<WorkItemDetail> {
  const url = `${baseUrl(config)}/_apis/wit/workitems/${id}?$select=System.WorkItemType,System.Title,System.State&api-version=7.1`;
  return azureFetch<WorkItemDetail>(url, config.pat);
}

// --- Update Work Item ---

const STATE_MAP: Record<string, string> = {
  Bug: 'Resolved',
  'User Story': 'Resolved',
  Issue: 'Closed',
};

export function getTargetState(workItemType: string): string {
  return STATE_MAP[workItemType] ?? 'Resolved';
}

export async function resolveWorkItem(config: AzureConfig, id: string, targetState: string): Promise<void> {
  const url = `${baseUrl(config)}/_apis/wit/workitems/${id}?api-version=7.1`;
  await azureFetch(url, config.pat, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json-patch+json' },
    body: JSON.stringify([
      { op: 'add', path: '/fields/System.State', value: targetState },
      { op: 'add', path: '/fields/System.History', value: 'desplegado' },
    ]),
  });
}

// --- PR Labels ---

export async function addLabelToPR(config: AzureConfig, prId: number, label: string): Promise<void> {
  const base = baseUrl(config);
  const prUrl = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}?api-version=7.1`;
  const pr = await azureFetch<{ labels?: { name: string }[] }>(prUrl, config.pat);

  if (pr.labels?.some((l) => l.name === label)) return;

  const labelUrl = `${base}/_apis/git/repositories/${config.repository}/pullrequests/${prId}/labels?api-version=7.1`;
  await azureFetch(labelUrl, config.pat, {
    method: 'POST',
    body: JSON.stringify({ name: label }),
  });
}

// --- Process PRs (main flow) ---

export interface ProcessResult {
  workItemId: string;
  title: string;
  type: string;
  previousState: string;
  newState: string;
  url: string;
  success: boolean;
  error?: string;
}

export async function processPRs(config: AzureConfig, prIds: number[]): Promise<{
  results: ProcessResult[];
  log: string[];
}> {
  const results: ProcessResult[] = [];
  const log: string[] = [];
  const processedIds = new Set<string>();

  for (const prId of prIds) {
    log.push(`PR #${prId}: obteniendo work items...`);
    try {
      const workItemRefs = await getPRWorkItems(config, prId);
      log.push(`PR #${prId}: ${workItemRefs.length} work items encontrados`);

      for (const ref of workItemRefs) {
        if (processedIds.has(ref.id)) {
          log.push(`  WI #${ref.id}: ya procesado, saltando`);
          continue;
        }
        processedIds.add(ref.id);

        try {
          const detail = await getWorkItem(config, ref.id);
          const type = detail.fields['System.WorkItemType'];
          const title = detail.fields['System.Title'];
          const previousState = detail.fields['System.State'];
          const targetState = getTargetState(type);
          const url = `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${ref.id}`;

          log.push(`  WI #${ref.id} (${type}): ${previousState} -> ${targetState}`);
          await resolveWorkItem(config, ref.id, targetState);
          log.push(`  WI #${ref.id}: actualizado correctamente`);

          results.push({ workItemId: ref.id, title, type, previousState, newState: targetState, url, success: true });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.push(`  WI #${ref.id}: ERROR - ${msg}`);
          results.push({
            workItemId: ref.id, title: '', type: '', previousState: '', newState: '',
            url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${ref.id}`,
            success: false, error: msg,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.push(`PR #${prId}: ERROR - ${msg}`);
    }
  }

  // Tag última PR
  const lastPrId = prIds[prIds.length - 1];
  log.push(`PR #${lastPrId}: agregando tag "ULTIMA DESPLEGADA"...`);
  try {
    await addLabelToPR(config, lastPrId, 'ULTIMA DESPLEGADA');
    log.push(`PR #${lastPrId}: tag agregado correctamente`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.push(`PR #${lastPrId}: ERROR al agregar tag - ${msg}`);
  }

  return { results, log };
}
