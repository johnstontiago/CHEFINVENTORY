// ============================================
// CONFIGURACIÓN - ChefManager
// ============================================

const CONFIG = {
    // Supabase
    SUPABASE_URL: 'https://xkjsinuylwnqgapoxrhu.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhranNpbnV5bHducWdhcG94cmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0Mzc4ODcsImV4cCI6MjA4MjAxMzg4N30.j1UaPRyhVMmp0G8n0yOAiTg8yoB4RS9sDUfgayYBCRg',
    
    // App
    APP_NAME: 'ChefManager',
    APP_VERSION: '2.0.0',
    
    // Roles disponibles
    ROLES: {
        SUPERUSER: 'superuser',
        ADMIN: 'admin',
        RECEPCION: 'recepcion',
        COCINA: 'cocina',
        VIEWER: 'viewer'
    },
    
    // Estados de pedido
    ESTADOS_PEDIDO: {
        BORRADOR: 'borrador',
        ENVIADO: 'enviado',
        PARCIAL: 'parcial',
        RECIBIDO: 'recibido',
        CANCELADO: 'cancelado'
    },
    
    // Estados de item
    ESTADOS_ITEM: {
        PENDIENTE: 'pendiente',
        PARCIAL: 'parcial',
        RECIBIDO: 'recibido',
        CANCELADO: 'cancelado'
    },
    
    // Estados de inventario
    ESTADOS_INVENTARIO: {
        DISPONIBLE: 'disponible',
        RESERVADO: 'reservado',
        AGOTADO: 'agotado',
        CADUCADO: 'caducado',
        MERMA: 'merma'
    },
    
    // Tipos de movimiento
    TIPOS_MOVIMIENTO: {
        ENTRADA: 'entrada',
        CONSUMO: 'consumo',
        MERMA: 'merma',
        TRANSFERENCIA: 'transferencia',
        AJUSTE: 'ajuste'
    },
    
    // Permisos por rol
    PERMISOS: {
        superuser: ['pedir', 'recibir', 'consumir', 'admin_productos', 'admin_usuarios', 'admin_reportes'],
        admin: ['pedir', 'recibir', 'consumir', 'admin_productos', 'admin_reportes'],
        recepcion: ['recibir'],
        cocina: ['pedir', 'consumir'],
        viewer: []
    }
};

// Función para verificar permisos
function tienePermiso(permiso) {
    const rol = STATE.currentUser?.rol || 'viewer';
    return CONFIG.PERMISOS[rol]?.includes(permiso) || false;
}

// Función para verificar si es admin o superior
function esAdmin() {
    const rol = STATE.currentUser?.rol;
    return rol === 'superuser' || rol === 'admin';
}

// Función para verificar si es superuser
function esSuperuser() {
    return STATE.currentUser?.rol === 'superuser';
}
