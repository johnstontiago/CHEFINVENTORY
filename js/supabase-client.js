// ============================================
// CLIENTE SUPABASE - ChefManager
// ============================================

var supabaseClient = null;

function initSupabase() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
    console.log('✅ Supabase inicializado');
    return supabaseClient;
}

function getSupabase() {
    if (!supabaseClient) {
        return initSupabase();
    }
    return supabaseClient;
}

// ============================================
// FUNCIONES DE BASE DE DATOS
// ============================================

const DB = {
    async getUnidades() {
        const { data, error } = await getSupabase()
            .from('unidades')
            .select('*')
            .eq('activa', true)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    async getCategorias() {
        const { data, error } = await getSupabase()
            .from('categorias')
            .select('*')
            .order('orden');
        if (error) throw error;
        return data;
    },

    async getProveedores() {
        const { data, error } = await getSupabase()
            .from('proveedores')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    async createProveedor(proveedor) {
        const { data, error } = await getSupabase()
            .from('proveedores')
            .insert(proveedor)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateProveedor(id, proveedor) {
        const { data, error } = await getSupabase()
            .from('proveedores')
            .update(proveedor)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProveedor(id) {
        const { error } = await getSupabase()
            .from('proveedores')
            .update({ activo: false })
            .eq('id', id);
        if (error) throw error;
    },

    async getProductos() {
        const { data, error } = await getSupabase()
            .from('productos')
            .select(`*, categoria:categorias(id, nombre, icono), proveedor:proveedores(id, nombre)`)
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    async createProducto(producto) {
        const { data, error } = await getSupabase()
            .from('productos')
            .insert(producto)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateProducto(id, producto) {
        const { data, error } = await getSupabase()
            .from('productos')
            .update(producto)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProducto(id) {
        const { error } = await getSupabase()
            .from('productos')
            .update({ activo: false })
            .eq('id', id);
        if (error) throw error;
    },

    async getUsuario(userId) {
        const { data, error } = await getSupabase()
            .from('usuarios')
            .select(`*, unidad:unidades(id, nombre)`)
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },

    async getUsuarios() {
        const { data, error } = await getSupabase()
            .from('usuarios')
            .select(`*, unidad:unidades(id, nombre)`)
            .order('nombre');
        if (error) throw error;
        return data;
    },

    async createUsuario(usuario) {
        const { data, error } = await getSupabase()
            .from('usuarios')
            .insert(usuario)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateUsuario(id, usuario) {
        const { data, error } = await getSupabase()
            .from('usuarios')
            .update(usuario)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getPedidos(unidadId = null, estado = null) {
        let query = getSupabase()
            .from('pedidos')
            .select(`*, unidad:unidades(id, nombre), usuario:usuarios(id, nombre), items:pedido_items(*, producto:productos(id, nombre, marca, formato))`)
            .order('created_at', { ascending: false });
        if (unidadId) query = query.eq('unidad_id', unidadId);
        if (estado) query = query.eq('estado', estado);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async getPedido(id) {
        const { data, error } = await getSupabase()
            .from('pedidos')
            .select(`*, unidad:unidades(id, nombre), usuario:usuarios(id, nombre), items:pedido_items(*, producto:productos(id, nombre, marca, formato, categoria_id))`)
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async createPedido(pedido, items) {
        const { data: pedidoData, error: pedidoError } = await getSupabase()
            .from('pedidos')
            .insert(pedido)
            .select()
            .single();
        if (pedidoError) throw pedidoError;
        const itemsConPedido = items.map(item => ({ ...item, pedido_id: pedidoData.id }));
        const { error: itemsError } = await getSupabase()
            .from('pedido_items')
            .insert(itemsConPedido);
        if (itemsError) throw itemsError;
        return pedidoData;
    },

    async updatePedido(id, pedido) {
        const { data, error } = await getSupabase()
            .from('pedidos')
            .update(pedido)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updatePedidoItem(id, item) {
        const { data, error } = await getSupabase()
            .from('pedido_items')
            .update(item)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getPedidosPendientes(unidadId) {
        const { data, error } = await getSupabase()
            .from('pedidos')
            .select(`*, unidad:unidades(id, nombre), items:pedido_items(*, producto:productos(id, nombre, marca, formato))`)
            .eq('unidad_id', unidadId)
            .in('estado', ['enviado', 'parcial'])
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getInventario(unidadId) {
        const { data, error } = await getSupabase()
            .from('inventario')
            .select(`*, producto:productos(id, nombre, marca, formato, categoria_id), unidad:unidades(id, nombre)`)
            .eq('unidad_id', unidadId)
            .in('estado', ['disponible', 'reservado'])
            .gt('cantidad_actual', 0)
            .order('fecha_caducidad');
        if (error) throw error;
        return data;
    },

    async getInventarioByCodigo(codigo) {
        const { data, error } = await getSupabase()
            .from('inventario')
            .select(`*, producto:productos(id, nombre, marca, formato), unidad:unidades(id, nombre)`)
            .eq('codigo_unico', codigo)
            .single();
        if (error) throw error;
        return data;
    },

    async createInventario(inventario) {
        const { data, error } = await getSupabase()
            .from('inventario')
            .insert(inventario)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateInventario(id, inventario) {
        const { data, error } = await getSupabase()
            .from('inventario')
            .update(inventario)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async createMovimiento(movimiento) {
        const { data, error } = await getSupabase()
            .from('movimientos')
            .insert(movimiento)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async getMovimientos(inventarioId) {
        const { data, error } = await getSupabase()
            .from('movimientos')
            .select(`*, usuario:usuarios(id, nombre)`)
            .eq('inventario_id', inventarioId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getMovimientosRecientes(unidadId, limit = 10) {
        const { data, error } = await getSupabase()
            .from('movimientos')
            .select(`*, inventario:inventario(codigo_unico, producto:productos(nombre, marca)), usuario:usuarios(nombre)`)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    },

    async getEstadisticasInventario(unidadId) {
        const hoy = new Date().toISOString().split('T')[0];
        const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const { count: total } = await getSupabase()
            .from('inventario')
            .select('*', { count: 'exact', head: true })
            .eq('unidad_id', unidadId)
            .eq('estado', 'disponible')
            .gt('cantidad_actual', 0);
        const { count: porCaducar } = await getSupabase()
            .from('inventario')
            .select('*', { count: 'exact', head: true })
            .eq('unidad_id', unidadId)
            .eq('estado', 'disponible')
            .gt('cantidad_actual', 0)
            .gte('fecha_caducidad', hoy)
            .lte('fecha_caducidad', enUnaSemana);
        const { count: bajoStock } = await getSupabase()
            .from('inventario')
            .select('*', { count: 'exact', head: true })
            .eq('unidad_id', unidadId)
            .eq('estado', 'disponible')
            .lt('cantidad_actual', 5)
            .gt('cantidad_actual', 0);
        return { total: total || 0, porCaducar: porCaducar || 0, bajoStock: bajoStock || 0 };
    }
};
