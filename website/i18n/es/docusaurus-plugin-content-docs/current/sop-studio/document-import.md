---
sidebar_position: 3
title: Importación de Documentos
sidebar_label: Importación
description: Importa SOPs existentes desde documentos DOCX y PDF usando extracción impulsada por LLM.
---

# Importación de Documentos

SOP Studio puede importar Procedimientos Operativos Estándar existentes desde documentos DOCX y PDF. Un LLM extrae la estructura del árbol de decisión del contenido del documento, que luego revisas y refinas en el editor visual.

## Formatos Soportados

| Formato | Extensión | Notas |
|--------|-----------|-------|
| Microsoft Word | `.docx` | Se preservan tablas, listas y encabezados |
| PDF | `.pdf` | PDFs basados en texto; los documentos escaneados no están soportados |

## Cómo Funciona

1. **Subir** -- Arrastra un archivo al área de importación o haz clic en "Importar Documento".
2. **Parsear** -- El SDK parsea el documento del lado del cliente usando `parseDocx` o `parsePdf`.
3. **Extraer** -- El texto parseado se envía a un LLM (del lado del cliente, usando tu propia clave API) para extraer un árbol de decisión estructurado.
4. **Revisar** -- El árbol extraído se carga en el editor visual para revisión y ajuste.
5. **Guardar** -- Una vez satisfecho, guarda el SOP en el registro.

## Configuración del LLM

La extracción de documentos usa un LLM para convertir texto no estructurado en un árbol de decisión estructurado. La llamada al LLM se ejecuta completamente del lado del cliente -- SOP Studio nunca envía tus documentos a los servidores de KnowledgePulse.

### Proveedores Soportados

| Proveedor | Modelos | Local? |
|----------|--------|--------|
| OpenAI | `gpt-4o`, `gpt-4o-mini` | No |
| Anthropic | `claude-sonnet-4-20250514`, `claude-haiku-4-20250414` | No |
| Ollama | Cualquier modelo local | Sí |

## Flujo de Revisión

Después de la extracción, el árbol de decisión se carga en el editor con indicadores visuales:

| Indicador | Significado |
|-----------|---------|
| Contorno verde | Extracción de alta confianza (superior a 0.8) |
| Contorno amarillo | Confianza media (0.5--0.8), se recomienda revisión |
| Contorno rojo | Baja confianza (inferior a 0.5), probablemente necesita edición manual |

Revisa las propiedades de cada nodo, corrige cualquier error de extracción y agrega conexiones faltantes antes de guardar.

## Consejos

- **Estructura tus documentos** -- SOPs con pasos numerados, encabezados y tablas producen mejores resultados de extracción.
- **Usa temperatura baja** -- Una temperatura de 0.1--0.2 produce árboles de decisión más consistentes.
- **Revisa siempre** -- La extracción por LLM no es perfecta. Siempre revisa el resultado antes de guardar en el registro.
