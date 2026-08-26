import type { AzureConfig, ProcessedWorkItem } from '../types/azure';
import { getPRWorkItems, addLabelToPR } from '../api/pullRequests';
import { getWorkItem, getTargetState, resolveWorkItem } from '../api/workItems';

interface DeployCallbacks {
  onLog: (msg: string) => void;
  onResult: (result: ProcessedWorkItem) => void;
}

export async function executeDeploy(
  config: AzureConfig,
  prIds: number[],
  { onLog, onResult }: DeployCallbacks
): Promise<void> {
  const processedIds = new Set<string>();

  for (const prId of prIds) {
    onLog(`PR #${prId}: obteniendo work items...`);
    try {
      const workItemRefs = await getPRWorkItems(config, prId);
      onLog(`PR #${prId}: ${workItemRefs.length} work items encontrados`);

      for (const ref of workItemRefs) {
        if (processedIds.has(ref.id)) {
          onLog(`  WI #${ref.id}: ya procesado, saltando`);
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

          onLog(`  WI #${ref.id} (${type}): ${previousState} -> ${targetState}`);
          await resolveWorkItem(config, ref.id, targetState);

          onResult({
            id: ref.id,
            title,
            type,
            previousState,
            newState: targetState,
            url,
            success: true,
          });
          onLog(`  WI #${ref.id}: actualizado correctamente`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          onLog(`  WI #${ref.id}: ERROR - ${msg}`);
          onResult({
            id: ref.id,
            title: '',
            type: '',
            previousState: '',
            newState: 'Resolved',
            url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${ref.id}`,
            success: false,
            error: msg,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onLog(`PR #${prId}: ERROR - ${msg}`);
    }
  }

  // Agregar tag "ULTIMA DESPLEGADA" a la última PR
  const lastPrId = prIds[prIds.length - 1];
  onLog(`PR #${lastPrId}: agregando tag "ULTIMA DESPLEGADA"...`);
  try {
    await addLabelToPR(config, lastPrId, 'ULTIMA DESPLEGADA');
    onLog(`PR #${lastPrId}: tag agregado correctamente`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    onLog(`PR #${lastPrId}: ERROR al agregar tag - ${msg}`);
  }
}
