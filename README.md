# 🍕 ChefManager - Sistema de Gestión para Restaurantes

Sistema completo de gestión de pedidos, inventario y trazabilidad para cadenas de restaurantes.

## 📋 Características

### ✅ Pedidos
- Crear pedidos por unidad/restaurante
- Carrito de compras intuitivo
- Exportar a texto o CSV
- Historial completo con filtros

### ✅ Recepción
- Recibir items ítem por ítem
- Ingresar lote y fecha de caducidad
- Generación automática de código único
- Código QR para etiquetas

### ✅ Inventario
- Stock por unidad en tiempo real
- Alertas de caducidad
- Alertas de bajo stock
- Filtros y búsqueda

### ✅ Consumo/Salidas
- Escanear código QR con cámara
- Búsqueda manual por código
- Registro de mermas
- Historial de movimientos

### ✅ Administración
- Gestión de productos
- Gestión de proveedores
- Gestión de usuarios y roles
- Backup/Restore de datos

### ✅ PWA
- Instalable en móvil
- Funciona offline
- Notificaciones push (futuro)

## 🔧 Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript vanilla
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** Cloudflare Pages
- **PWA:** Service Worker

## 🚀 Instalación

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor**
3. Ejecuta el script `database/schema.sql`

### 2. Configurar credenciales

Edita `js/config.js` con tus credenciales:

```javascript
const CONFIG = {
    SUPABASE_URL: 'tu-url',
    SUPABASE_ANON_KEY: 'tu-anon-key',
    // ...
};
```

### 3. Desplegar en Cloudflare Pages

1. Sube el código a GitHub
2. En Cloudflare Pages, conecta el repositorio
3. Configura:
   - Build command: (vacío)
   - Output directory: `/`

### 4. (Opcional) Generar iconos PWA

Usa un generador de iconos PWA como [pwa-asset-generator](https://github.com/nicolo-ribaudo/pwa-asset-generator) para crear los iconos en diferentes tamaños.

## 👥 Roles de Usuario

| Rol | Pedir | Recibir | Consumir | Admin Productos | Admin Usuarios |
|-----|-------|---------|----------|-----------------|----------------|
| superuser | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ❌ |
| recepcion | ❌ | ✅ | ❌ | ❌ | ❌ |
| cocina | ✅ | ❌ | ✅ | ❌ | ❌ |
| viewer | ❌ | ❌ | ❌ | ❌ | ❌ |

## 🏷️ Código Único de Inventario

Formato: `{LOTE}-{CADUCIDAD}-{RECIBIDO}`

Ejemplo: `ABC123-20250315-20231223`

- `ABC123` = Lote del proveedor
- `20250315` = Fecha caducidad (15 marzo 2025)
- `20231223` = Fecha recibido (23 diciembre 2023)

## 📱 Flujo de Trabajo

```
1. PEDIDO
   └── Crear pedido con productos necesarios
   └── Enviar pedido (queda en estado "enviado")

2. RECEPCIÓN
   └── Ver pedidos pendientes
   └── Recibir ítem por ítem:
       ├── Ingresar cantidad recibida
       ├── Ingresar lote del proveedor
       ├── Ingresar fecha de caducidad
       └── Confirmar (genera código único + QR)

3. INVENTARIO
   └── Ver stock actual
   └── Imprimir etiquetas QR
   └── Alertas de caducidad

4. CONSUMO
   └── Escanear QR o ingresar código
   └── Registrar cantidad consumida
   └── Automáticamente reduce stock
```

## 📁 Estructura del Proyecto

```
chefmanager/
├── index.html          # HTML principal
├── manifest.json       # Manifest PWA
├── sw.js              # Service Worker
├── css/
│   └── styles.css     # Estilos
├── js/
│   ├── config.js      # Configuración
│   ├── supabase-client.js  # Cliente DB
│   ├── auth.js        # Autenticación
│   ├── state.js       # Estado global
│   ├── ui.js          # Funciones UI
│   ├── pedidos.js     # Módulo pedidos
│   ├── recepcion.js   # Módulo recepción
│   ├── inventario.js  # Módulo inventario
│   ├── consumo.js     # Módulo consumo
│   ├── admin.js       # Módulo admin
│   └── app.js         # Inicialización
├── icons/             # Iconos PWA
└── database/
    └── schema.sql     # Esquema DB
```

## 🔐 Seguridad

- Row Level Security (RLS) en todas las tablas
- Autenticación con Supabase Auth
- Cada usuario solo ve datos de su unidad
- Roles con permisos específicos

## 📞 Soporte

Para soporte técnico o consultas, contacta al desarrollador.

---

**ChefManager v2.0** - Desarrollado con ❤️ para PANZZONI
