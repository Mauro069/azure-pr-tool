# Changelog

## [2.2.0] - 2026-08-25

### Agregado
- **Lista de PRs activas**: la tab "Review con IA" ahora carga y muestra todas las PRs activas del repo para seleccionar con un click
- **Skip de archivos en review**: array configurable de patrones (`skipPatterns.ts`) para excluir archivos de la revisión (`.spec.`, `/index.ts`)
- **Timer en vivo**: cronómetro animado durante el análisis y tiempo total en el panel de resultados
- **Panel de analítica**: stats cards (total, revisados, skipeados, binarios), listas colapsables de archivos por categoría
- **Severity `suggestion`**: la IA ahora también sugiere mejoras concretas (simplificaciones, performance, código duplicado)
- Botón "ID manual" como fallback para ingresar un PR ID directamente
- Botón "Refrescar" para recargar la lista de PRs activas
- Botón "← Volver a la lista" para elegir otra PR después de una revisión

### Cambiado
- Review de PR rediseñado con flujo de dos pasos: lista de PRs → revisión con resultados
- Cards de PR muestran ID, título, branches, autor y tiempo relativo
- Prompt de Gemini actualizado para incluir sugerencias de mejora además de bugs y seguridad

## [2.1.0] - 2026-08-24

### Agregado
- **MCP Server** para usar Azure DevOps PR Tool directamente desde Claude Code
- Tool `process_prs`: procesa PRs, resuelve work items, agrega "desplegado" y tag "ULTIMA DESPLEGADA"
- Tool `list_pr_work_items`: lista work items vinculados a una PR con su estado actual
- Servidor MCP registrado en `~/.claude/settings.json`

### Cambiado
- Review con IA ahora usa formato JSON estructurado con lista de issues y botones de copiar (archivo y mensaje)
- Prompt de review mejorado: solo reporta problemas reales visibles en el código, no especula sobre código externo
- Modelo actualizado a `gemini-3.6-flash` con retry automático (4 intentos, 8s delay) para errores 503

## [2.0.0] - 2026-08-24

### Agregado
- **Review de PRs con IA** usando Google Gemini API (gratis)
- Tabs para navegar entre "Deploy (Work Items)" y "Review con IA"
- Obtención automática del diff de una PR (contenido viejo/nuevo de cada archivo)
- Streaming de la respuesta de Gemini en tiempo real
- Renderizado de la revisión en markdown
- Proxy de Vite para Gemini API (`/api/gemini`)
- Variable de entorno `VITE_GEMINI_API_KEY`
- Filtros: máximo 20 archivos, skip binarios, truncado a 50KB por archivo

## [1.2.0] - 2026-08-24

### Cambiado
- Configuración movida a archivo `.env` (variables `VITE_AZDO_*`), eliminando el formulario de configuración
- Si falta alguna variable se muestra un mensaje de error con las variables requeridas

### Eliminado
- Componente `ConfigForm` — ya no es necesario

## [1.1.0] - 2026-08-24

### Agregado
- Botón "Copiar URLs" en el listado de resultados para copiar todas las URLs de work items al portapapeles
- Tag "ULTIMA DESPLEGADA" se agrega automáticamente a la última PR procesada

### Cambiado
- El PAT ahora requiere permiso **Code: Read & Write** (antes solo Read) para poder agregar tags a PRs

## [1.0.0] - 2026-08-24

### Agregado
- Configuración de conexión a Azure DevOps (organización, proyecto, repositorio, PAT)
- Input de múltiples PR IDs (separados por coma, espacio o salto de línea)
- Obtención automática de work items vinculados a cada PR
- Actualización de estado según tipo de work item: Bug/User Story → Resolved, Issue → Closed
- Comentario "desplegado" agregado via System.History a cada work item procesado
- Listado de resultados con URLs clickeables a cada work item
- Log en tiempo real del proceso
- Deduplicación de work items compartidos entre PRs
- Proxy de Vite para evitar CORS con Azure DevOps API
