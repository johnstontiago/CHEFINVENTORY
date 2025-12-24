// ============================================
// ESTADO GLOBAL - ChefManager
// ============================================

const STATE = {
    // Usuario actual
    currentUser: null,
    currentUnidad: null,
    
    // Datos cacheados
    unidades: [],
    categorias: [],
    proveedores: [],
    productos: [],
    
    // Carrito de pedido actual
    carrito: {},
    
    // Vista actual
    currentView: 'view-pedir',
    
    // Filtros
    filtroCategoria: 'all',
    filtroBusqueda: '',
    
    // Cache de datos
    pedidos: [],
    inventario: [],
    
    // Estado del scanner
    scannerActivo: false
};

// Cargar datos iniciales
async function loadInitialData() {
    try {
        console.log('📦 Cargando datos iniciales...');
        
        // Cargar catálogos
        const [unidades, categorias, proveedores, productos] = await Promise.all([
            DB.getUnidades(),
            DB.getCategorias(),
            DB.getProveedores(),
            DB.getProductos()
        ]);
        
        STATE.unidades = unidades;
        STATE.categorias = categorias;
        STATE.proveedores = proveedores;
        STATE.productos = productos;
        
        console.log(`✅ Datos cargados: ${productos.length} productos, ${proveedores.length} proveedores`);
        
        // Actualizar UI
        renderCategoryFilters();
        renderProductos();
        renderPedidoUnidadSelect();
        updateHeaderInfo();
        
        // Configurar navegación según permisos
        setupNavigation();
        
    } catch (error) {
        console.error('Error cargando datos:', error);
        showToast('Error al cargar datos', 'error');
    }
}

// Configurar navegación según permisos del usuario
function setupNavigation() {
    const rol = STATE.currentUser?.rol || 'viewer';
    
    // Ocultar tabs de navegación según permisos
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const view = item.dataset.view;
        let mostrar = true;
        
        switch (view) {
            case 'view-pedir':
                mostrar = tienePermiso('pedir');
                break;
            case 'view-recepcion':
                mostrar = tienePermiso('recibir');
                break;
            case 'view-consumo':
                mostrar = tienePermiso('consumir');
                break;
            case 'view-admin':
                mostrar = esAdmin();
                break;
        }
        
        item.style.display = mostrar ? 'flex' : 'none';
    });
    
    // Ir a la primera vista permitida
    if (!tienePermiso('pedir')) {
        if (tienePermiso('recibir')) {
            changeView('view-recepcion');
        } else if (tienePermiso('consumir')) {
            changeView('view-consumo');
        } else {
            changeView('view-inventario');
        }
    }
}

// Guardar estado en localStorage (para offline)
function saveLocalState() {
    const dataToSave = {
        carrito: STATE.carrito,
        currentUnidad: STATE.currentUnidad,
        timestamp: Date.now()
    };
    localStorage.setItem('chefmanager_state', JSON.stringify(dataToSave));
}

// Cargar estado desde localStorage
function loadLocalState() {
    try {
        const saved = localStorage.getItem('chefmanager_state');
        if (saved) {
            const data = JSON.parse(saved);
            // Solo cargar si es del mismo día
            const hoy = new Date().toDateString();
            const savedDate = new Date(data.timestamp).toDateString();
            if (hoy === savedDate) {
                STATE.carrito = data.carrito || {};
            }
        }
    } catch (error) {
        console.error('Error cargando estado local:', error);
    }
}

// Limpiar carrito
function clearCarrito() {
    STATE.carrito = {};
    saveLocalState();
    updateCarritoUI();
}

// Actualizar cantidad en carrito
function updateCarrito(productoId, cantidad) {
    if (cantidad <= 0) {
        delete STATE.carrito[productoId];
    } else {
        STATE.carrito[productoId] = cantidad;
    }
    saveLocalState();
    updateCarritoUI();
}

// Obtener total de items en carrito
function getCarritoTotal() {
    return Object.values(STATE.carrito).reduce((sum, qty) => sum + qty, 0);
}

// Obtener items del carrito con info de producto
function getCarritoItems() {
    return Object.entries(STATE.carrito).map(([productoId, cantidad]) => {
        const producto = STATE.productos.find(p => p.id === productoId);
        return {
            productoId,
            cantidad,
            producto
        };
    }).filter(item => item.producto);
}
