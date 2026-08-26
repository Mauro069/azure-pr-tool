import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { type AzureConfig, processPRs, getPRWorkItems, getWorkItem, getTargetState } from './azure-client.js';

const config: AzureConfig = {
  organization: process.env.AZURE_DEVOPS_ORGANIZATION ?? '',
  project: process.env.AZURE_DEVOPS_PROJECT ?? '',
  repository: process.env.AZURE_DEVOPS_REPOSITORY ?? '',
  pat: process.env.AZURE_DEVOPS_PAT ?? '',
};

const server = new McpServer({
  name: 'azure-devops-pr-tool',
  version: '1.0.0',
});

// Tool 1: Procesar PRs (resolver work items + comment "desplegado" + tag última PR)
server.registerTool(
  'process_prs',
  {
    title: 'Procesar PRs - Deploy',
    description:
      'Recibe IDs de Pull Requests, obtiene sus work items vinculados, los marca como Resolved/Closed según tipo (Bug/Story→Resolved, Issue→Closed), agrega comentario "desplegado", y tagea la última PR como "ULTIMA DESPLEGADA". Devuelve la lista de work items procesados con sus URLs.',
    inputSchema: {
      pr_ids: z.array(z.number()).describe('Lista de IDs de Pull Requests a procesar'),
    },
  },
  async ({ pr_ids }) => {
    if (!config.pat) {
      return { content: [{ type: 'text', text: 'Error: AZURE_DEVOPS_PAT no configurado.' }] };
    }

    const { results, log } = await processPRs(config, pr_ids);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    let output = `## Resultado del procesamiento\n\n`;
    output += `**${successful.length}/${results.length}** work items procesados exitosamente.\n\n`;

    if (successful.length > 0) {
      output += `### Work Items actualizados\n`;
      for (const r of successful) {
        output += `- **#${r.workItemId}** (${r.type}) "${r.title}" → ${r.newState} | [Abrir](${r.url})\n`;
      }
      output += `\n### URLs\n`;
      output += successful.map((r) => r.url).join('\n');
    }

    if (failed.length > 0) {
      output += `\n\n### Errores\n`;
      for (const r of failed) {
        output += `- #${r.workItemId}: ${r.error}\n`;
      }
    }

    output += `\n\n### Log\n${log.join('\n')}`;

    return { content: [{ type: 'text', text: output }] };
  }
);

// Tool 2: Listar work items de una PR
server.registerTool(
  'list_pr_work_items',
  {
    title: 'Listar Work Items de PR',
    description: 'Obtiene los work items vinculados a una Pull Request con su estado actual, tipo y título.',
    inputSchema: {
      pr_id: z.number().describe('ID del Pull Request'),
    },
  },
  async ({ pr_id }) => {
    if (!config.pat) {
      return { content: [{ type: 'text', text: 'Error: AZURE_DEVOPS_PAT no configurado.' }] };
    }

    const refs = await getPRWorkItems(config, pr_id);

    if (refs.length === 0) {
      return { content: [{ type: 'text', text: `PR #${pr_id}: No tiene work items vinculados.` }] };
    }

    let output = `## Work Items de PR #${pr_id}\n\n`;

    for (const ref of refs) {
      const detail = await getWorkItem(config, ref.id);
      const type = detail.fields['System.WorkItemType'];
      const title = detail.fields['System.Title'];
      const state = detail.fields['System.State'];
      const targetState = getTargetState(type);
      const url = `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${ref.id}`;

      output += `- **#${ref.id}** (${type}) "${title}" | Estado: ${state} → pasaría a ${targetState} | [Abrir](${url})\n`;
    }

    return { content: [{ type: 'text', text: output }] };
  }
);

// Connect
const transport = new StdioServerTransport();
await server.connect(transport);
