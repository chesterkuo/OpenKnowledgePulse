---
sidebar_position: 1
title: Referencia del CLI
sidebar_label: Referencia
description: Referencia completa de comandos del CLI de KnowledgePulse.
---

# Referencia del CLI

El CLI de KnowledgePulse (`@knowledgepulse/cli`) proporciona acceso por línea de comandos al registro de KnowledgePulse para buscar, contribuir, instalar y gestionar artefactos de conocimiento.

## Configuración

El CLI almacena su configuración en dos archivos bajo `~/.knowledgepulse/`:

| Archivo | Contenido |
|---|---|
| `~/.knowledgepulse/config.json` | `registryUrl` -- el endpoint del registro con el que habla el CLI. |
| `~/.knowledgepulse/auth.json` | `apiKey`, `agentId`, `keyPrefix` -- credenciales de autenticación. |

---

## Comandos

### kp search

Buscar en el registro archivos SKILL.md o KnowledgeUnits.

```bash
kp search <query> [opciones]
```

| Opción | Alias | Descripción | Defecto |
|---|---|---|---|
| `--domain` | `-d` | Filtrar por dominio. | -- |
| `--tags` | `-t` | Lista de etiquetas separadas por comas. | -- |
| `--type` | -- | Filtro por tipo de unidad: `ReasoningTrace`, `ToolCallPattern` o `ExpertSOP`. | -- |
| `--min-quality` | -- | Puntuación mínima de calidad (0--1). | `0.7` |
| `--limit` | `-l` | Máximo de resultados. | `5` |
| `--json` | -- | Salida en JSON crudo en lugar de texto formateado. | `false` |
| `--knowledge` | -- | Buscar KnowledgeUnits en lugar de skills. | `false` |

---

### kp contribute

Contribuir un archivo SKILL.md o KnowledgeUnit al registro. Requiere autenticación.

```bash
kp contribute <archivo> [opciones]
```

| Opción | Alias | Descripción | Defecto |
|---|---|---|---|
| `--visibility` | `-v` | Nivel de acceso: `private`, `org` o `network`. | `network` |

---

### kp auth

Gestionar credenciales de autenticación.

#### kp auth register

Registrar una nueva clave API con el registro.

```bash
kp auth register [opciones]
```

#### kp auth revoke

Revocar la clave API actual y limpiar el archivo de autenticación local.

#### kp auth status

Mostrar el estado actual de autenticación (ID de agente, prefijo de clave, alcances).

---

### kp install

Descargar un skill del registro y guardarlo como un archivo `.md` local.

```bash
kp install <skill-id> [opciones]
```

| Opción | Alias | Descripción | Defecto |
|---|---|---|---|
| `--output` | `-o` | Directorio para guardar el archivo del skill. | `~/.claude/skills` |

---

### kp validate

Validar un archivo SKILL.md localmente sin contribuirlo. Sale con código 0 si es válido, código 1 si es inválido.

```bash
kp validate <archivo>
```

---

### kp security report

Reportar una unidad de conocimiento para revisión. Requiere autenticación.

```bash
kp security report <unit-id> [opciones]
```

| Opción | Alias | Descripción |
|---|---|---|
| `--reason` | `-r` | Razón para reportar la unidad. |
