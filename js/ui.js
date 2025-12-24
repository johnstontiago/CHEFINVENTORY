// ============================================
// UI - ChefManager
// ============================================

// Cambiar vista
function changeView(viewId) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    // Mostrar vista seleccionada
    document.getElementById(viewId)?.classList.remove('hidden');
    
    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.view === viewId);
    });
    
    STATE.currentView = viewId;
    
    // Cargar datos específicos de cada vista
    switch (viewId) {
        case 'view-carrito':
            renderCarrito();
            break;
        case 'view-recepcion':
            loadRecepcionData();
            break;
        case 'view-inventario':
            loadInventarioData();
            break;
        case 'view-consumo':
            loadConsumoData();
            break;
        case 'view-historial':
            loadHistorialData();
            break;
        case 'view-admin':
            loadAdminData();
            break;
    }
    
    window.scrollTo(0, 0);
}

// Abrir modal
function openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
}

// Cerrar modal
function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Mostrar toast
function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Mostrar loading
function showLoading() {
    document.getElementById('loading-screen').classList.remove('fade-out');
}

// Ocultar loading
function hideLoading() {
    document.getElementById('loading-screen').classList.add('fade-out');
}

// Renderizar filtros de categoría
function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    
    let html = '<button class="filter-chip active" data-category="all" onclick="filterByCategory(\'all\', this)">Todos</button>';
    
    STATE.categorias.forEach(cat => {
        html += `<button class="filter-chip" data-category="${cat.id}" onclick="filterByCategory('${cat.id}', this)">${cat.icono} ${cat.nombre}</button>`;
    });
    
    container.innerHTML = html;
}

// Filtrar por categoría
function filterByCategory(categoriaId, btn) {
    // Actualizar estado
    STATE.filtroCategoria = categoriaId;
    
    // Actualizar UI de botones
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn?.classList.add('active');
    
    // Re-renderizar productos
    renderProductos();
}

// Filtrar productos por búsqueda
function filtrarProductos() {
    STATE.filtroBusqueda = document.getElementById('search-productos')?.value.toLowerCase() || '';
    renderProductos();
}

// Renderizar lista de productos
function renderProductos() {
    const container = document.getElementById('productos-list');
    if (!container) return;
    
    let productos = STATE.productos;
    
    // Filtrar por categoría
    if (STATE.filtroCategoria !== 'all') {
        productos = productos.filter(p => p.categoria_id === STATE.filtroCategoria);
    }
    
    // Filtrar por búsqueda
    if (STATE.filtroBusqueda) {
        productos = productos.filter(p => 
            p.nombre.toLowerCase().includes(STATE.filtroBusqueda) ||
            p.marca?.toLowerCase().includes(STATE.filtroBusqueda)
        );
    }
    
    if (productos.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">🔍</span><p>No hay productos</p></div>';
        return;
    }
    
    container.innerHTML = productos.map(p => {
        const qty = STATE.carrito[p.id] || 0;
        const inCart = qty > 0 ? 'in-cart' : '';
        
        return `
            <div class="producto-card ${inCart}">
                <div class="producto-info">
                    <div class="producto-nombre">${p.nombre}</div>
                    <div class="producto-detalle">${p.marca || ''} · ${p.formato || ''}</div>
                </div>
                <div class="producto-cantidad">
                    <button class="qty-btn" onclick="decrementarProducto('${p.id}')">−</button>
                    <span class="qty-value">${qty}</span>
                    <button class="qty-btn plus" onclick="incrementarProducto('${p.id}')">+</button>
                </div>
            </div>
        `;
    }).join('');
}

// Incrementar producto en carrito
function incrementarProducto(productoId) {
    const qty = (STATE.carrito[productoId] || 0) + 1;
    updateCarrito(productoId, qty);
    renderProductos();
}

// Decrementar producto en carrito
function decrementarProducto(productoId) {
    const qty = (STATE.carrito[productoId] || 0) - 1;
    updateCarrito(productoId, qty);
    renderProductos();
}

// Actualizar UI del carrito
function updateCarritoUI() {
    const total = getCarritoTotal();
    
    // Actualizar contador en floating cart
    document.getElementById('floating-cart-count').textContent = total;
    
    // Mostrar/ocultar floating cart
    const floatingCart = document.getElementById('floating-cart');
    if (total > 0) {
        floatingCart.classList.add('visible');
    } else {
        floatingCart.classList.remove('visible');
    }
    
    // Actualizar badge en carrito view
    document.getElementById('carrito-count').textContent = `${total} items`;
}

// Renderizar carrito completo
function renderCarrito() {
    const items = getCarritoItems();
    const listContainer = document.getElementById('carrito-list');
    const emptyState = document.getElementById('carrito-empty');
    const actions = document.getElementById('carrito-actions');
    
    if (items.length === 0) {
        listContainer.classList.add('hidden');
        emptyState.classList.remove('hidden');
        actions.classList.add('hidden');
        return;
    }
    
    listContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');
    actions.classList.remove('hidden');
    
    listContainer.innerHTML = items.map(item => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <div class="carrito-item-nombre">${item.producto.nombre}</div>
                <div class="carrito-item-detalle">${item.producto.marca || ''} · ${item.producto.formato || ''}</div>
            </div>
            <span class="carrito-item-cantidad">${item.cantidad}</span>
            <button class="carrito-item-remove" onclick="eliminarDelCarrito('${item.productoId}')">✕</button>
        </div>
    `).join('');
}

// Eliminar item del carrito
function eliminarDelCarrito(productoId) {
    updateCarrito(productoId, 0);
    renderCarrito();
    renderProductos();
}

// Vaciar carrito
function vaciarCarrito() {
    if (confirm('¿Vaciar el carrito?')) {
        clearCarrito();
        renderCarrito();
        renderProductos();
        showToast('Carrito vaciado');
    }
}

// Renderizar select de unidad para pedido
function renderPedidoUnidadSelect() {
    const select = document.getElementById('pedido-unidad');
    if (!select) return;
    
    select.innerHTML = STATE.unidades.map(u => 
        `<option value="${u.id}" ${u.id === STATE.currentUnidad ? 'selected' : ''}>${u.nombre}</option>`
    ).join('');
}

// Formatear fecha
function formatDate(date, options = {}) {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    });
}

// Formatear fecha y hora
function formatDateTime(date) {
    return formatDate(date, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Generar código único
function generarCodigoUnico(lote, fechaCaducidad, fechaRecibido) {
    const loteClean = lote.toUpperCase().replace(/\s/g, '');
    const caducidad = fechaCaducidad.replace(/-/g, '');
    const recibido = fechaRecibido.replace(/-/g, '');
    return `${loteClean}-${caducidad}-${recibido}`;
}

// Copiar al portapapeles
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copiado al portapapeles', 'success');
    } catch (error) {
        console.error('Error copiando:', error);
        showToast('Error al copiar', 'error');
    }
}

// Mostrar notificaciones
function showNotifications() {
    // Por ahora solo mostrar un mensaje
    openModal('modal-notifications');
    document.getElementById('notifications-list').innerHTML = `
        <div class="empty-state">
            <span class="empty-icon">🔔</span>
            <p>No hay notificaciones</p>
        </div>
    `;
}

// Cambiar unidad de pedido
function cambiarUnidadPedido() {
    const select = document.getElementById('pedido-unidad');
    STATE.currentUnidad = select.value;
}
