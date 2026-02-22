---
sidebar_position: 2
title: Guía de Contribución
sidebar_label: Guía
description: Estilo de código, convenciones de testing y proceso de PR para contribuir a KnowledgePulse.
---

# Guía de Contribución

Gracias por tu interés en contribuir a KnowledgePulse. Este documento cubre el estilo de código, las expectativas de testing y el proceso de pull request del proyecto.

## Estilo de Código

- **Formateador y linter:** [Biome](https://biomejs.dev/) maneja tanto el formateo como el linting. Ejecuta `bun run lint` antes de enviar un PR.
- **TypeScript:** El modo estricto está habilitado en todos los paquetes. Usa [Zod](https://zod.dev/) v3 para validación en tiempo de ejecución de entradas externas.
- **Importaciones:** Prefiere importaciones nombradas explícitas. Evita importaciones con comodín (`*`).

## Testing

- **Framework:** `bun:test` (integrado en Bun).
- **Ubicación de archivos:** Co-localiza los tests con el archivo fuente que ejercitan. Los archivos de test usan el sufijo `*.test.ts`.
- **Ejecutar la suite:**

  ```bash
  bun test --recursive
  ```

  La suite completa actualmente contiene 319 tests en 15 archivos. Todos los tests deben pasar antes de que un PR pueda ser fusionado.

- **Cambios de esquema:** Cualquier cambio a esquemas Zod o la estructura de KnowledgeUnit debe incluir:
  1. Una **función de migración** que convierta datos de la versión anterior del esquema.
  2. **Tests de ida y vuelta** que demuestren que los datos sobreviven serialización, migración y deserialización sin pérdida.

## Notas de Build

El SDK se construye con **tsup** y emite archivos ESM, CJS y de declaración TypeScript (`.d.ts`). El `tsconfig.json` del SDK establece `"types": []` intencionalmente -- esto evita un conflicto entre `bun-types` y el plugin de generación DTS de tsup. No elimines esta configuración.

## Proceso de Pull Request

1. **Fork** el repositorio y crea una rama de feature desde `main`.
2. **Implementa** tus cambios, siguiendo las guías de estilo de código anteriores.
3. **Escribe o actualiza tests** que cubran tus cambios.
4. **Ejecuta la suite completa de tests** y confirma que todos los tests pasen.
5. **Lintea** tu código.
6. **Envía un pull request** contra `main` con una descripción clara del cambio y su motivación.

## Mensajes de Commit

Sigue el estilo de [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<alcance>): <resumen corto>
```

Tipos comunes:

| Tipo | Cuándo usar |
|---|---|
| `feat` | Una nueva funcionalidad o capacidad. |
| `fix` | Una corrección de error. |
| `docs` | Cambios solo en documentación. |
| `refactor` | Reestructuración de código sin cambio de comportamiento. |
| `test` | Agregar o actualizar tests. |
| `chore` | Configuración de build, CI o herramientas. |

## Licencia

Todas las contribuciones están licenciadas bajo [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0), consistente con el resto del proyecto.
