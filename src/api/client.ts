import type { AzureConfig } from '../types/azure';

export function buildHeaders(pat: string, contentType = 'application/json') {
  return {
    Authorization: 'Basic ' + btoa(':' + pat),
    'Content-Type': contentType,
  };
}

export function buildBaseUrl(config: AzureConfig) {
  return `/api/azdo/${config.organization}/${config.project}`;
}

export async function azureFetch<T>(
  url: string,
  pat: string,
  options: RequestInit = {}
): Promise<T> {
  const contentType =
    (options.headers as Record<string, string>)?.['Content-Type'] ??
    'application/json';

  const res = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(pat, contentType),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure DevOps API error ${res.status}: ${text}`);
  }

  return res.json();
}
