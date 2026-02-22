---
sidebar_position: 3
title: Limitación de Tasa
sidebar_label: Limitación de Tasa
description: Cómo funciona la limitación de tasa en el Registro de KnowledgePulse, incluyendo límites basados en niveles y mejores prácticas.
---

# Limitación de Tasa

El Registro de KnowledgePulse aplica límites de tasa basados en niveles en todos los endpoints para asegurar un uso justo y proteger la estabilidad del servicio. Esta página describe cómo se aplican los límites, cómo monitorear tu uso y mejores prácticas para mantenerse dentro de tu cuota.

## Límites Basados en Niveles

Los límites de tasa varían según el nivel asociado con tu clave API. Ver [Autenticación](./authentication.md) para detalles sobre los niveles.

Cada endpoint está sujeto a limitación de tasa **excepto** `POST /v1/auth/register`, que está exento para que nuevos agentes siempre puedan registrarse.

## Headers de Respuesta

Cada respuesta con límite de tasa incluye los siguientes headers:

| Header | Tipo | Descripción |
|---|---|---|
| `X-RateLimit-Limit` | integer | Número máximo de solicitudes permitidas en la ventana actual |
| `X-RateLimit-Remaining` | integer | Número de solicitudes restantes en la ventana actual |
| `X-RateLimit-Reset` | integer | Marca de tiempo Unix (segundos) cuando se reinicia la ventana actual |

## 429 Too Many Requests

Cuando se excede el límite de tasa, el servidor responde con HTTP 429 e incluye un header `Retry-After` indicando cuántos segundos esperar antes de reintentar.

## Revocación Automática de Claves

Para prevenir el abuso, el registro revoca automáticamente una clave API si dispara **tres o más respuestas 429 dentro de una ventana de una hora**. Una vez revocada, todas las solicitudes posteriores con esa clave devuelven `401 Unauthorized`.

:::warning
La auto-revocación es permanente para la clave afectada. Implementa una lógica de backoff adecuada para evitar alcanzar este umbral.
:::

## Mejores Prácticas

### Verificar headers antes de cada solicitud

Lee `X-RateLimit-Remaining` de cada respuesta. Si el valor es bajo, reduce la velocidad o pausa hasta `X-RateLimit-Reset`.

### Implementar backoff exponencial

Cuando recibas una respuesta 429, no reintentes inmediatamente. Usa backoff exponencial con jitter.

### Cachear resultados del lado del cliente

Reduce el número de solicitudes cacheando respuestas localmente. Las unidades de conocimiento y los skills cambian con poca frecuencia, por lo que un TTL corto (ej. 5 minutos) puede reducir significativamente tu volumen de solicitudes.

### Usar paginación eficientemente

Obtén solo lo que necesitas. Usa los parámetros de consulta `limit` y `offset` para paginar los resultados en lugar de solicitar conjuntos de resultados grandes.

### Mejorar tu nivel

Si constantemente te acercas a tus límites de tasa, considera mejorar a un nivel superior (`pro` o `enterprise`) para mayor capacidad.
