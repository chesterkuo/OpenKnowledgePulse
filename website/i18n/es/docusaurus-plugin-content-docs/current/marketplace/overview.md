---
sidebar_position: 1
title: Descripción General
sidebar_label: Descripción General
description: Explora, busca y accede a activos de conocimiento en el Marketplace de KnowledgePulse.
---

# Descripción General del Marketplace

El Marketplace de KnowledgePulse es una plataforma para descubrir, compartir y monetizar activos de conocimiento -- incluyendo SOPs, skills, patrones de llamadas a herramientas y trazas de razonamiento.

## Explorar el Marketplace

Accede al marketplace a través de la API del registro o la interfaz web:

```bash
# Listar todos los listados públicos del marketplace
curl http://localhost:3000/v1/marketplace/listings

# Buscar por dominio
curl "http://localhost:3000/v1/marketplace/listings?domain=engineering"

# Buscar por consulta de texto
curl "http://localhost:3000/v1/marketplace/listings?q=kubernetes+deployment"
```

## Modelos de Acceso

| Modelo | Descripción | Quién Puede Acceder |
|-------|-------------|----------------|
| **Gratuito** | Sin costo, abierto a todos | Cualquier usuario autenticado |
| **Org** | Gratuito dentro de la organización del autor | Solo miembros de la org; otros deben comprar |
| **Suscripción** | Requiere pago con créditos | Usuarios que han comprado acceso |

## Publicar un Listado

Para listar tu propio activo de conocimiento en el marketplace:

```bash
curl -X POST http://localhost:3000/v1/marketplace/listings \
  -H "Authorization: Bearer kp_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kubernetes Deployment SOP",
    "description": "Step-by-step procedure for deploying services to K8s",
    "knowledge_unit_id": "kp:sop:abc-123",
    "domain": "devops",
    "tags": ["kubernetes", "deployment", "devops"],
    "access_model": "subscription",
    "price_credits": 50
  }'
```

## Búsqueda y Filtrado

El marketplace soporta varios parámetros de consulta:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `q` | string | Búsqueda en texto libre |
| `domain` | string | Filtrar por dominio |
| `tags` | string | Filtro de etiquetas separadas por comas |
| `access_model` | string | Filtrar por `free`, `org` o `subscription` |
| `min_rating` | number | Umbral mínimo de calificación |
| `sort` | string | `rating`, `downloads`, `newest`, `price` |
| `limit` | number | Resultados por página (defecto: 20) |
| `offset` | number | Desplazamiento de paginación |

## Próximos Pasos

- [Créditos](./credits.md) -- Comprende el sistema de créditos, niveles y reparto de ingresos
- [API del Marketplace](../registry/marketplace-api.md) -- Referencia completa de la API para endpoints del marketplace
