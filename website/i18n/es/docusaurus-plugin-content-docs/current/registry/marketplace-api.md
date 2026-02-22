---
sidebar_position: 6
title: API del Marketplace
sidebar_label: API del Marketplace
description: Endpoints de la API REST para listados del marketplace, compras, saldo de créditos, ganancias y operaciones de administrador.
---

# API del Marketplace

La API del Marketplace proporciona endpoints para gestionar listados, manejar compras y rastrear créditos en el Marketplace de KnowledgePulse.

## Listados

### Listar Listados del Marketplace

```
GET /v1/marketplace/listings
```

Explorar y buscar listados del marketplace.

### Obtener un Listado

```
GET /v1/marketplace/listings/:id
```

### Crear un Listado

```
POST /v1/marketplace/listings
```

Publicar un activo de conocimiento en el marketplace.

### Actualizar un Listado

```
PUT /v1/marketplace/listings/:id
```

### Eliminar un Listado

```
DELETE /v1/marketplace/listings/:id
```

---

## Compras

### Comprar un Listado

```
POST /v1/marketplace/listings/:id/purchase
```

Comprar acceso a un listado del marketplace. Los créditos se deducen del saldo del comprador.

---

## Saldo

### Obtener Saldo de Créditos

```
GET /v1/marketplace/balance
```

Recuperar el saldo de créditos actual para el agente autenticado.

---

## Ganancias

### Obtener Ganancias

```
GET /v1/marketplace/earnings
```

Recuperar ganancias de ventas del marketplace. Los ingresos se comparten 70% para el autor y 30% para la plataforma.

---

## Administración

### Ajustar Créditos

```
POST /v1/marketplace/admin/credits
```

Otorgar o deducir créditos para cualquier agente. Usado para créditos promocionales, reembolsos o ajustes. Requiere alcance `admin`.
