// ============================================
// WORKER BFF - ChefManager
// Backend For Frontend - Capa de seguridad entre la app y Supabase
// ============================================

// Configuración (se moverá a secrets en producción)
const SUPABASE_URL = 'https://xkjsinuylwnqgapoxrhu.supabase.co';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Si es una ruta API, procesarla
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, url, env);
    }

    // Si no es API, servir los archivos estáticos (HTML/CSS/JS)
    return env.ASSETS.fetch(request);
  }
};

// ============================================
// MANEJO DE RUTAS API
// ============================================
async function handleAPI(request, url, env) {
  // Configurar CORS
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Responder a preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Validar sesión del usuario
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'No autorizado' }, 401, headers);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar token con Supabase
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!userResponse.ok) {
      return jsonResponse({ error: 'Token inválido' }, 401, headers);
    }

    const authUser = await userResponse.json();

    // Obtener datos completos del usuario desde la tabla usuarios
    const usuario = await getUsuario(authUser.id, token);
    if (!usuario) {
      return jsonResponse({ error: 'Usuario no encontrado' }, 404, headers);
    }

    // Enrutar según la ruta
    const path = url.pathname.replace('/api/', '');

    if (path === 'inventario' && request.method === 'GET') {
      return getInventario(usuario, headers, token);
    }

    if (path === 'inventario/consumir' && request.method === 'POST') {
      const body = await request.json();
      return registrarConsumo(usuario, body, headers, token);
    }

    if (path === 'inventario/codigo' && request.method === 'GET') {
      const codigo = url.searchParams.get('codigo');
      return getInventarioByCodigo(codigo, usuario, headers, token);
    }

    if (path === 'pedidos' && request.method === 'GET') {
      return getPedidos(usuario, headers, token);
    }

    if (path === 'productos' && request.method === 'GET') {
      return getProductos(headers, token);
    }

    return jsonResponse({ error: 'Ruta no encontrada' }, 404, headers);

  } catch (error) {
    console.error('Error en API:', error);
    return jsonResponse({ error: 'Error interno del servidor' }, 500, headers);
  }
}

// ============================================
// FUNCIONES DE BASE DE DATOS (vía Supabase)
// ============================================

async function getUsuario(userId, token) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}&select=*,unidad:unidades(id,nombre)`, {
    headers: {
      'apikey': token,
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data[0];
}

async function getInventario(usuario, headers, token) {
  // Validar que el usuario tiene permiso
  if (!tienePermiso(usuario.rol, 'consumir') && !tienePermiso(usuario.rol, 'recibir')) {
    return jsonResponse({ error: 'Sin permisos para ver inventario' }, 403, headers);
  }

  // Obtener inventario de la unidad del usuario
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/inventario?unidad_id=eq.${usuario.unidad_id}&estado=in.(disponible,reservado)&cantidad_actual=gt.0&select=*,producto:productos(id,nombre,marca,formato,categoria_id),unidad:unidades(id,nombre)&order=fecha_caducidad.asc`,
    {
      headers: {
        'apikey': token,
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return jsonResponse({ error: 'Error al obtener inventario' }, 500, headers);
  }

  const inventario = await response.json();
  return jsonResponse({ data: inventario }, 200, headers);
}

async function getInventarioByCodigo(codigo, usuario, headers, token) {
  if (!codigo) {
    return jsonResponse({ error: 'Código requerido' }, 400, headers);
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/inventario?codigo_unico=eq.${codigo}&select=*,producto:productos(id,nombre,marca,formato),unidad:unidades(id,nombre)`,
    {
      headers: {
        'apikey': token,
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return jsonResponse({ error: 'Error al buscar código' }, 500, headers);
  }

  const data = await response.json();
  if (data.length === 0) {
    return jsonResponse({ error: 'Código no encontrado' }, 404, headers);
  }

  // Validar que pertenece a la unidad del usuario
  if (data[0].unidad_id !== usuario.unidad_id) {
    return jsonResponse({ error: 'Este producto pertenece a otra unidad' }, 403, headers);
  }

  return jsonResponse({ data: data[0] }, 200, headers);
}

async function registrarConsumo(usuario, body, headers, token) {
  // Validar permisos
  if (!tienePermiso(usuario.rol, 'consumir')) {
    return jsonResponse({ error: 'Sin permisos para registrar consumo' }, 403, headers);
  }

  // Validar datos
  if (!body.inventario_id || !body.cantidad || body.cantidad <= 0) {
    return jsonResponse({ error: 'Datos inválidos' }, 400, headers);
  }

  // Obtener el item de inventario
  const invResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/inventario?id=eq.${body.inventario_id}`,
    {
      headers: {
        'apikey': token,
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!invResponse.ok) {
    return jsonResponse({ error: 'Error al verificar inventario' }, 500, headers);
  }

  const inventario = await invResponse.json();
  if (inventario.length === 0) {
    return jsonResponse({ error: 'Item no encontrado' }, 404, headers);
  }

  const item = inventario[0];

  // Validar unidad
  if (item.unidad_id !== usuario.unidad_id) {
    return jsonResponse({ error: 'Este producto pertenece a otra unidad' }, 403, headers);
  }

  // Validar stock disponible
  if (item.cantidad_actual < body.cantidad) {
    return jsonResponse({ error: `Solo hay ${item.cantidad_actual} disponibles` }, 400, headers);
  }

  // Calcular nueva cantidad
  const nuevaCantidad = item.cantidad_actual - body.cantidad;
  const nuevoEstado = nuevaCantidad === 0 ? 'agotado' : item.estado;

  // Actualizar inventario
  const updateResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/inventario?id=eq.${body.inventario_id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': token,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        cantidad_actual: nuevaCantidad,
        estado: nuevoEstado
      })
    }
  );

  if (!updateResponse.ok) {
    return jsonResponse({ error: 'Error al actualizar inventario' }, 500, headers);
  }

  // Registrar movimiento
  const movimiento = {
    inventario_id: body.inventario_id,
    tipo: body.motivo === 'merma' ? 'merma' : 'consumo',
    cantidad: body.cantidad,
    usuario_id: usuario.id,
    observaciones: body.observaciones || null
  };

  await fetch(`${SUPABASE_URL}/rest/v1/movimientos`, {
    method: 'POST',
    headers: {
      'apikey': token,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(movimiento)
  });

  return jsonResponse({ 
    success: true, 
    message: 'Consumo registrado correctamente',
    cantidad_restante: nuevaCantidad
  }, 200, headers);
}

async function getPedidos(usuario, headers, token) {
  if (!tienePermiso(usuario.rol, 'pedir') && !tienePermiso(usuario.rol, 'recibir')) {
    return jsonResponse({ error: 'Sin permisos para ver pedidos' }, 403, headers);
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/pedidos?unidad_id=eq.${usuario.unidad_id}&select=*,unidad:unidades(id,nombre),usuario:usuarios(id,nombre),items:pedido_items(*,producto:productos(id,nombre,marca,formato))&order=created_at.desc`,
    {
      headers: {
        'apikey': token,
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return jsonResponse({ error: 'Error al obtener pedidos' }, 500, headers);
  }

  const pedidos = await response.json();
  return jsonResponse({ data: pedidos }, 200, headers);
}

async function getProductos(headers, token) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/productos?activo=eq.true&select=*,categoria:categorias(id,nombre,icono),proveedor:proveedores(id,nombre)&order=nombre.asc`,
    {
      headers: {
        'apikey': token,
        'Authorization': `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    return jsonResponse({ error: 'Error al obtener productos' }, 500, headers);
  }

  const productos = await response.json();
  return jsonResponse({ data: productos }, 200, headers);
}

// ============================================
// UTILIDADES
// ============================================

function tienePermiso(rol, permiso) {
  const PERMISOS = {
    superuser: ['pedir', 'recibir', 'consumir', 'admin_productos', 'admin_usuarios', 'admin_reportes'],
    admin: ['pedir', 'recibir', 'consumir', 'admin_productos', 'admin_reportes'],
    recepcion: ['recibir'],
    cocina: ['pedir', 'consumir'],
    viewer: []
  };
  return PERMISOS[rol]?.includes(permiso) || false;
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}