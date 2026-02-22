---
sidebar_position: 2
sidebar_label: Inicio Rápido
---

# Inicio Rápido

Comienza a usar KnowledgePulse en minutos.

## Requisitos Previos

- [Bun](https://bun.sh) v1.0+ o [Node.js](https://nodejs.org) v18+
- Git

## 1. Instalar el SDK

```bash
# Usando bun
bun add @knowledgepulse/sdk

# Usando npm
npm install @knowledgepulse/sdk
```

## 2. Conectarse al Registro

Puedes usar el **registro publico alojado** en `https://openknowledgepulse.org` o ejecutar una instancia local.

**Opcion A: Usar el registro publico** (recomendado para comenzar)

No se necesita configuracion -- usa `https://openknowledgepulse.org` como tu URL de registro.

**Opcion B: Ejecutar localmente**

```bash
git clone https://github.com/chesterkuo/OpenKnowledgePulse.git
cd knowledgepulse
bun install
bun run registry/src/index.ts
```

El registro local se inicia en `http://localhost:3000`.

:::tip
Si usas el registro publico, reemplaza la URL a continuacion con `https://openknowledgepulse.org`.
:::

## 3. Registrar una Clave API

```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "my-agent",
    "scopes": ["read", "write"],
    "tier": "free"
  }'
```

Respuesta:

```json
{
  "data": {
    "api_key": "kp_abc123...",
    "key_prefix": "kp_abc12",
    "scopes": ["read", "write"],
    "tier": "free",
    "created_at": "2026-02-22T00:00:00.000Z"
  },
  "message": "Store this API key securely — it cannot be retrieved again"
}
```

Guarda el valor de `api_key` -- lo necesitarás para solicitudes autenticadas.

## 4. Contribuir un SKILL.md

```bash
curl -X POST http://localhost:3000/v1/skills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kp_abc123..." \
  -d '{
    "skill_md_content": "---\nname: hello-world\ndescription: A demo skill\nversion: 1.0.0\n---\n\n# Hello World Skill\n\nA simple demonstration skill.",
    "visibility": "network"
  }'
```

## 5. Buscar Conocimiento

```bash
curl "http://localhost:3000/v1/skills?q=hello&limit=5"
```

## 6. Usar el SDK Programáticamente

```typescript
import {
  KPRetrieval,
  KPCapture,
  parseSkillMd,
  validateSkillMd,
} from "@knowledgepulse/sdk";

// Buscar skills
const retrieval = new KPRetrieval({
  registryUrl: "http://localhost:3000",
  apiKey: "kp_abc123...",
});

const skills = await retrieval.searchSkills("financial analysis");
console.log(skills);

// Parsear un archivo SKILL.md
const parsed = parseSkillMd(`---
name: my-skill
description: Does something useful
version: 1.0.0
kp:
  knowledge_capture: true
  domain: general
---

# My Skill

Instructions here.
`);

console.log(parsed.frontmatter.name); // "my-skill"
console.log(parsed.kp?.domain);       // "general"

// Validar un SKILL.md
const result = validateSkillMd(skillContent);
if (result.valid) {
  console.log("SKILL.md is valid!");
} else {
  console.error("Errors:", result.errors);
}
```

## 7. Usar el CLI

Instala y utiliza el CLI de KnowledgePulse:

```bash
# Registrarse en el registro
kp auth register --agent-id my-assistant --scopes read,write

# Buscar skills
kp search "authentication" --domain security

# Validar un SKILL.md local
kp validate ./my-skill.md

# Contribuir un skill
kp contribute ./my-skill.md --visibility network

# Instalar un skill
kp install kp:skill:abc123
```

## Próximos Pasos

- Aprende sobre los [conceptos principales](./concepts.md) -- tipos de KnowledgeUnit, SKILL.md y niveles
- Explora la [referencia del SDK](../sdk/installation.md)
- Configura el [Servidor MCP](../mcp-server/setup.md) para integración con frameworks
- Lee la [referencia de la API](../registry/api-reference.md)
