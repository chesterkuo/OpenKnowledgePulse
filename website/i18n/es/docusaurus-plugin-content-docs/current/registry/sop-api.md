---
sidebar_position: 5
title: API de SOP
sidebar_label: API de SOP
description: Endpoints de la API REST para crear, gestionar, versionar y exportar SOPs.
---

# API de SOP

La API de SOP proporciona endpoints para gestionar Procedimientos Operativos Estándar en el Registro de KnowledgePulse. Los SOPs se almacenan como unidades de conocimiento `ExpertSOP` con flujos de trabajo adicionales de versionado y aprobación.

## Crear un SOP

```
POST /v1/sop
```

Crear un nuevo SOP en el registro.

## Obtener un SOP

```
GET /v1/sop/:id
```

Recuperar un solo SOP por su ID. Devuelve la última versión aprobada por defecto.

## Actualizar un SOP

```
PUT /v1/sop/:id
```

Actualizar un SOP existente. Crea una nueva versión automáticamente.

## Eliminar un SOP

```
DELETE /v1/sop/:id
```

Eliminar permanentemente un SOP y todas sus versiones.

## Listar Versiones del SOP

```
GET /v1/sop/:id/versions
```

Listar todas las versiones de un SOP.

## Aprobar una Versión del SOP

```
POST /v1/sop/:id/approve
```

Aprobar una versión específica de un SOP, convirtiéndola en la versión predeterminada.

## Exportar SOP como Skill-MD

```
GET /v1/sop/:id/export-skill
```

Exportar un SOP como un archivo en formato Skill-MD. Devuelve el contenido como `text/markdown`.
