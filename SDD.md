# SDD — Azure DevOps PR Tool

## 1. Resumen del Proyecto

Herramienta web para gestionar Pull Requests de Azure DevOps con review automatizado por IA y despliegue de work items.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS · TanStack Query · Google Gemini API · MCP Server

---

## 2. Módulos

### 2.1 Review de PRs con IA

**Objetivo:** Permitir revisar PRs de Azure DevOps con asistencia de IA para detectar bugs, vulnerabilidades y mejoras.

#### Specs

| ID | Spec | Estado |
|----|------|--------|
| R-01 | Listar PRs activas del repositorio configurado con filtros por estado (mine/active/completed/abandoned) | ✅ |
| R-02 | Filtrar PRs por texto libre (título + ID), creador y branch destino | ✅ |
| R-03 | Mostrar badges de reviewers con estado de voto (aprobado, wait for author, rechazado, sin voto) | ✅ |
| R-04 | Mostrar indicadores de draft y auto-complete en la lista | ✅ |
| R-05 | Ver diff de archivos de un PR con líneas añadidas/eliminadas/sin cambios | ✅ |
| R-06 | Colapsar secciones sin cambios mostrando 3 líneas de contexto | ✅ |
| R-07 | Filtrar archivos binarios, specs y archivos index del review | ✅ |
| R-08 | Limitar contenido a 15KB por archivo y máximo 20 archivos | ✅ |
| R-09 | Enviar archivos a un proveedor de IA (interfaz `AIProvider`) para review | ✅ |
| R-10 | Soportar review bulk (todos los archivos) y review individual por archivo | ✅ |
| R-11 | Mostrar issues inline en el diff con severidad: bug, security, improvement, suggestion | ✅ |
| R-12 | Cada issue muestra problema y sugerencia por separado | ✅ |
| R-13 | Publicar issues como comentarios inline en el PR de Azure DevOps | ✅ |
| R-14 | Botón para copiar markdown del issue al clipboard | ✅ |
| R-15 | Mostrar threads/comentarios existentes del PR inline en el diff | ✅ |
| R-16 | Responder a threads existentes desde la UI | ✅ |
| R-17 | Votar PR (aprobar, wait for author) desde la UI | ✅ |
| R-18 | Auto-colapsar archivos sin comentarios ni issues después del review de IA | ✅ |
| R-19 | Copiar path del archivo al clipboard con click en el header | ✅ |
| R-20 | Mostrar timer durante el review de IA y duración final | ✅ |
| R-21 | Reintentar automáticamente en errores 429/503 de la IA (hasta 4 intentos, 8s entre cada uno) | ✅ |
| R-22 | Ocultar threads con todos los comentarios borrados | ✅ |

#### Proveedor de IA

| ID | Spec | Estado |
|----|------|--------|
| AI-01 | Interfaz `AIProvider` con `name` y `reviewPR()` para abstraer el proveedor | ✅ |
| AI-02 | Implementación Gemini (modelo `gemini-3.6-flash`) como primer proveedor | ✅ |
| AI-03 | El prompt exige solo problemas reales y concretos, no estilo ni convenciones | ✅ |
| AI-04 | Respuesta en formato JSON con `file`, `line`, `severity`, `problem`, `suggestion` | ✅ |
| AI-05 | Respuestas en español | ✅ |
| AI-06 | Soporte para agregar más proveedores sin cambiar el resto del código | ✅ |

---

### 2.2 Deploy (Work Items)

**Objetivo:** Procesar PRs para actualizar el estado de work items vinculados y marcar como desplegados.

#### Specs

| ID | Spec | Estado |
|----|------|--------|
| D-01 | Aceptar múltiples PR IDs (separados por coma, espacio o salto de línea) | ✅ |
| D-02 | Validar que los IDs sean enteros positivos | ✅ |
| D-03 | Obtener work items vinculados a cada PR | ✅ |
| D-04 | Deduplicar work items que aparecen en múltiples PRs | ✅ |
| D-05 | Cambiar estado según tipo: Bug → Resolved, User Story → Resolved, Issue → Closed | ✅ |
| D-06 | Agregar comentario "desplegado" en el historial del work item | ✅ |
| D-07 | Agregar tag "FRONTEND" automáticamente si el work item no tiene tag "APP" ni "FRONTEND" | ✅ |
| D-08 | Tags siempre en mayúscula | ✅ |
| D-09 | Clasificar work items por plataforma: tag "APP" → App, resto → Web | ✅ |
| D-10 | Agregar label "ULTIMA DESPLEGADA" a la última PR procesada | ✅ |
| D-11 | Mostrar log en tiempo real del proceso | ✅ |
| D-12 | Mostrar resultados agrupados en listas separadas por tipo + plataforma (Bugs-App, Bugs-Web, US-App, US-Web, Issues-App, Issues-Web) | ✅ |
| D-13 | Solo mostrar grupos que tengan items | ✅ |
| D-14 | Botón para copiar URLs de work items agrupadas por tipo + plataforma | ✅ |
| D-15 | Mostrar sección de errores con detalle por work item | ✅ |

---

### 2.3 MCP Server

**Objetivo:** Exponer funcionalidades del tool via Model Context Protocol para integración con Claude.

#### Specs

| ID | Spec | Estado |
|----|------|--------|
| M-01 | Tool `process_prs`: recibe array de PR IDs, ejecuta deploy y devuelve resumen markdown | ✅ |
| M-02 | Tool `list_pr_work_items`: recibe un PR ID, lista work items con tipo, estado y URL | ✅ |
| M-03 | Servidor standalone con configuración por variables de entorno | ✅ |

---

### 2.4 Infraestructura y Configuración

#### Specs

| ID | Spec | Estado |
|----|------|--------|
| I-01 | Proxy de Vite: `/api/azdo` → `https://dev.azure.com`, `/api/gemini` → `https://generativelanguage.googleapis.com` | ✅ |
| I-02 | Configuración por variables de entorno: `VITE_AZDO_ORGANIZATION`, `VITE_AZDO_PROJECT`, `VITE_AZDO_REPOSITORY`, `VITE_AZDO_PAT`, `VITE_GEMINI_API_KEY` | ✅ |
| I-03 | Pantalla de error si faltan variables de configuración | ✅ |
| I-04 | Cache de PRs con React Query (staleTime 3 min) | ✅ |
| I-05 | Tema oscuro con Tailwind CSS | ✅ |
| I-06 | Modo wide automático al entrar a detalle de PR | ✅ |

---

## 3. Arquitectura

```
src/
├── types/          ← Interfaces y tipos del dominio
├── api/            ← Clientes HTTP (Azure DevOps, Gemini)
├── services/       ← Lógica de negocio (deploy, review)
├── hooks/          ← React hooks (estado + side effects)
├── components/     ← UI (deploy/, review/, diff/)
├── utils/          ← Funciones puras (diff, paths, markdown)
└── constants/      ← Valores estáticos (extensiones, votos)
```

**Flujo de datos:**
```
Component → Hook → Service → API → Azure DevOps / Gemini
                                ↑
                            AIProvider (interfaz)
```

---

## 4. Archivos Clave

| Archivo | Responsabilidad |
|---------|----------------|
| `src/types/ai.ts` | Interfaz `AIProvider` |
| `src/types/azure.ts` | Tipos del dominio Azure DevOps |
| `src/types/review.ts` | `ReviewIssue`, `FileStats` |
| `src/api/client.ts` | `azureFetch`, headers, base URL |
| `src/api/pullRequests.ts` | Operaciones de PR (diff, threads, votos, comments) |
| `src/api/workItems.ts` | Operaciones de work items (estado, tags, plataforma) |
| `src/api/gemini.ts` | `createGeminiProvider()` — implementación Gemini |
| `src/api/skipPatterns.ts` | Filtros de archivos para review |
| `src/services/deployService.ts` | Orquestación del deploy |
| `src/services/reviewService.ts` | Orquestación del review |
| `src/hooks/useAIReview.ts` | Estado del review de IA |
| `src/hooks/usePRList.ts` | Lista de PRs con filtros |
| `src/hooks/usePRDetail.ts` | Detalle de PR individual |
| `src/hooks/useDeploy.ts` | Estado del deploy |
| `src/components/diff/FileDiff.tsx` | Diff de archivo con comments inline |
| `src/components/diff/IssueInline.tsx` | Issue de IA con publicar/copiar |
| `src/components/ResultsList.tsx` | Resultados agrupados del deploy |
| `src/App.tsx` | Router, config, provider setup |

---

## 5. Cómo Usar este SDD

Al agregar una feature nueva:

1. **Agregar spec** en la sección correspondiente con estado `⬚`
2. **Implementar** siguiendo la arquitectura existente (types → api → service → hook → component)
3. **Marcar spec** como `✅` cuando esté implementada
4. **Verificar** que no se rompa ninguna spec existente

Al reportar un bug:
1. Identificar qué spec viola
2. Si no hay spec que lo cubra, agregar una nueva
