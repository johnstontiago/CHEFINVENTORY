// ============================================
// CLIENTE SUPABASE - ChefManager
// ============================================

// Cliente Supabase (global)
var supabaseClient = null;

function initSupabase() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
        // Hacer disponible globalmente
        window.supabase = supabaseClient;
    }
    console.log('✅ Supabase inicializado');
    return supabaseClient;
}

// Getter para el cliente
function getSupabase() {
    return supabaseClient || initSupabase();
}

// ============================================
// FUNCIONES DE BASE DE DATOS
// ============================================

const DB = {
    // --- UNIDADES ---
    async getUnidades() {
        const { data, error } = await supabase
            .from('unidades')
            .select('*')
            .eq('activa', true)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    // --- CATEGORÍAS ---
    async getCategorias() {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .order('orden');
        if (error) throw error;
        return data;
    },

    // --- PROVEEDORES ---
    async getProveedores() {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    async createProveedor(proveedor) {
        const { data, error } = await supabase
            .from('proveedores')
            .insert(proveedor)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateProveedor(id, proveedor) {
        const { data, error } = await supabase
            .from('proveedores')
            .update(proveedor)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProveedor(id) {
        const { error } = await supabase
            .from('proveedores')
            .update({ activo: false })
            .eq('id', id);
        if (error) throw error;
    },

    // --- PRODUCTOS ---
    async getProductos() {
        const { data, error } = await supabase
            .from('productos')
            .select(`
                *,
                categoria:categorias(id, nombre, icono),
                proveedor:proveedores(id, nombre)
            `)
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    async createProducto(producto) {
        const { data, error } = await supabase
            .from('productos')
            .insert(producto)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateProducto(id, producto) {
        const { data, error } = await supabase
            .from('productos')
            .update(producto)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProducto(id) {
        const { error } = await supabase
            .from('productos')
            .update({ activo: false })
            .eq('id', id);
        if (error) throw error;
    },

    // --- USUARIOS ---
    async getUsuario(userId) {
        const { data, error } = await supabase
            .from('usuarios')
            .select(`
                *,
                unidad:unidades(id, nombre)
            `)
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },

    async getUsuarios() {
        const { data, error } = await supabase
            .from('usuarios')
            .select(`
                *,
                unidad:unidades(id, nombre)
            `)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    async createUsuario(usuario) {
        const { data, error } = await supabase
            .from('usuarios')
            .insert(usuario)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateUsuario(id, usuario) {
        const { data, error } = await supabase
            .from('usuarios')
            .update(usuario)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- PEDIDOS ---
    async getPedidos(unidadId = null, estado = null) {
        let query = supabase
            .from('pedidos')
            .select(`
                *,
                unidad:unidades(id, nombre),
                usuario:usuarios(id, nombre),
                items:pedido_items(
                    *,
                    producto:productos(id, nombre, marca, formato)
                )
            `)
            .order('created_at', { ascending: false });
        
        if (unidadId) query = query.eq('unidad_id', unidadId);
        if (estado) query = query.eq('estado', estado);
        
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getPedido(id) {
        const { data, error } = await supabase
            .from('pedidos')
            .select(`
                *,
                unidad:unidades(id, nombre),
                usuario:usuarios(id, nombre),
                items:pedido_items(
                    *,
                    producto:productos(id, nombre, marca, formato, categoria_id)
                )
            `)
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async createPedido(pedido, items) {
        // Crear pedido
        const { data: pedidoData, error: pedidoError } = await supabase
            .from('pedidos')
            .insert(pedido)
            .select()
            .single();
        if (pedidoError) throw pedidoError;

        // Crear items
        const itemsConPedido = items.map(item => ({
            ...item,
            pedido_id: pedidoData.id
        }));

        const { error: itemsError } = await supabase
            .from('pedido_items')
            .insert(itemsConPedido);
        if (itemsError) throw itemsError;

        return pedidoData;
    },

    async updatePedido(id, pedido) {
        const { data, error } = await supabase
            .from('pedidos')
            .update(pedido)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updatePedidoItem(id, item) {
        const { data, error } = await supabase
            .from('pedido_items')
            .update(item)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getPedidosPendientes(unidadId) {
        const { data, error } = await supabase
            .from('pedidos')
            .select(`
                *,
                unidad:unidades(id, nombre),
                items:pedido_items(
                    *,
                    producto:productos(id, nombre, marca, formato)
                )
            `)
            .eq('unidad_id', unidadId)
            .in('estado', ['enviado', 'parcial'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // --- INVENTARIO ---
    async getInventario(unidadId) {
        const { data, error } = await supabase
            .from('inventario')
            .select(`
                *,
                producto:productos(id, nombre, marca, formato, categoria_id),
                unidad:unidades(id, nombre)
            `)
            .eq('unidad_id', unidadId)
            .in('estado', ['disponible', 'reservado'])
            .gt('cantidad_actual', 0)
            .order('fecha_caducidad');
        if (error) throw error;
        return data;
    },

    async getInventarioByCodigo(codigo) {
        const { data, error } = await supabase
            .from('inventario')
            .select(`
                *,
                producto:productos(id, nombre, marca, formato),
                unidad:unidades(id, nombre)
            `)
            .eq('codigo_unico', codigo)
            .single();
        if (error) throw error;
        return data;
    },

    async createInventario(inventario) {
        const { data, error } = await supabase
            .from('inventario')
            .insert(inventario)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateInventario(id, inventario) {
        const { data, error } = await supabase
            .from('inventario')
            .update(inventario)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // --- MOVIMIENTOS ---
    async createMovimiento(movimiento) {
        const { data, error } = await supabase
            .from('movimientos')
            .insert(movimiento)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getMovimientos(inventarioId) {
        const { data, error } = await supabase
            .from('movimientos')
            .select(`
                *,
                usuario:usuarios(id, nombre)
            `)
            .eq('inventario_id', inventarioId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getMovimientosRecientes(unidadId, limit = 10) {
        const { data, error } = await supabase
            .from('movimientos')
            .select(`
                *,
                inventario:inventario(
                    codigo_unico,
                    producto:productos(nombre, marca)
                ),
                usuario:usuarios(nombre)
            `)
            .eq('inventario.unidad_id', unidadId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },

    // --- ESTADÍSTICAS ---
    async getEstadisticasInventario(unidadId) {
        const hoy = new Date().toISOString().split('T')[0];
        const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Total items
        const { count: total } = await supabase
            .from('inventario')
            .select('*', { count: 'exact', head: true })
            .eq('unidad_id', unidadId)
            .eq('estado', 'disponible')
            .gt('cantidad_actual', 0);

        // Por caducar (próximos 7 días)
        const { count: porCaducar } = await supabase
            .from('inventario')
            .select('*', { count: 'exact', head: true })
            .eq('unidad_id', unidadId)
            .eq('estado', 'disponible')
            .gt('cantidad_actual', 0)
            .gte('fecha_caducidad', hoy)
            .lte('fecha_caducidad', enUnaSemana);

        // Bajo stock (simplificado - items con cantidad < 5)
        const { count: bajoStock } = await supabase
            .from('inventario')
            .select('*', { count: 'exact', head: true })
            .eq('unidad_id', unidadId)
            .eq('estado', 'disponible')
            .lt('cantidad_actual', 5)
            .gt('cantidad_actual', 0);

        return {
            total: total || 0,
            porCaducar: porCaducar || 0,
            bajoStock: bajoStock || 0
        };
    }
};
