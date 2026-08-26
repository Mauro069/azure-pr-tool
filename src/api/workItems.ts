import type {
  AzureConfig,
  WorkItemDetail,
  TargetState,
} from '../types/azure';
import { azureFetch, buildBaseUrl } from './client';

const STATE_MAP: Record<string, TargetState> = {
  Bug: 'Resolved',
  'User Story': 'Resolved',
  Issue: 'Closed',
};

export function getTargetState(workItemType: string): TargetState {
  return STATE_MAP[workItemType] ?? 'Resolved';
}

export async function getWorkItem(
  config: AzureConfig,
  id: string
): Promise<WorkItemDetail> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/wit/workitems/${id}?$select=System.WorkItemType,System.Title,System.State&api-version=7.1`;
  return azureFetch<WorkItemDetail>(url, config.pat);
}

export async function resolveWorkItem(
  config: AzureConfig,
  id: string,
  targetState: TargetState
): Promise<void> {
  const base = buildBaseUrl(config);
  const url = `${base}/_apis/wit/workitems/${id}?api-version=7.1`;

  await azureFetch(url, config.pat, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json-patch+json' },
    body: JSON.stringify([
      {
        op: 'add',
        path: '/fields/System.State',
        value: targetState,
      },
      {
        op: 'add',
        path: '/fields/System.History',
        value: 'desplegado',
      },
    ]),
  });
}
