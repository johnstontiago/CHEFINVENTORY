// ============================================
// ADMIN - ChefManager
// ============================================

let adminTab = 'productos';

async function loadAdminData() {
    renderAdminProductos();
    renderAdminProveedores();
    if (esSuperuser()) {
        await loadAdminUsuarios();
    }
}

function switchAdminTab(tab) {
    adminTab = tab;
    
    document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.toggle('active', t.textContent.toLowerCase().includes(tab));
    });
    
    document.getElementById('admin-productos').classList.toggle('hidden', tab !== 'productos');
    document.getElementById('admin-proveedores').classList.toggle('hidden', tab !== 'proveedores');
    document.getElementById('admin-usuarios').classList.toggle('hidden', tab !== 'usuarios');
    document.getElementById('admin-reportes').classList.toggle('hidden', tab !== 'reportes');
}

// ============================================
// PRODUCTOS
// ============================================

function renderAdminProductos() {
    const container = document.getElementById('admin-productos-list');
    if (!container) return;
    
    const busqueda = document.getElementById('search-admin-productos')?.value.toLowerCase() || '';
    let productos = STATE.productos;
    
    if (busqueda) {
        productos = productos.filter(p => 
            p.nombre.toLowerCase().includes(busqueda) ||
            p.marca?.toLowerCase().includes(busqueda)
        );
    }
    
    if (productos.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay productos</p></div>';
        return;
    }
    
    container.innerHTML = productos.map(p => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-name">${p.nombre}</div>
                <div class="admin-item-detail">${p.marca || ''} · ${p.categoria?.nombre || ''} · ${p.proveedor?.nombre || ''}</div>
            </div>
            <div class="admin-item-actions">
                <button class="action-btn edit" onclick="editarProducto('${p.id}')">✏️</button>
                <button class="action-btn delete" onclick="eliminarProducto('${p.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function filtrarAdminProductos() { renderAdminProductos(); }

function showModalProducto(productoId = null) {
    document.getElementById('modal-producto-title').textContent = productoId ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('producto-id').value = productoId || '';
    
    // Llenar selects
    document.getElementById('producto-categoria').innerHTML = 
        STATE.categorias.map(c => `<option value="${c.id}">${c.icono} ${c.nombre}</option>`).join('');
    
    document.getElementById('producto-proveedor').innerHTML = 
        '<option value="">Sin proveedor</option>' +
        STATE.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    
    if (productoId) {
        const producto = STATE.productos.find(p => p.id === productoId);
        if (producto) {
            document.getElementById('producto-nombre').value = producto.nombre;
            document.getElementById('producto-marca').value = producto.marca || '';
            document.getElementById('producto-categoria').value = producto.categoria_id || '';
            document.getElementById('producto-formato').value = producto.formato || '';
            document.getElementById('producto-proveedor').value = producto.proveedor_id || '';
            document.getElementById('producto-precio').value = producto.precio_referencia || '';
            document.getElementById('producto-stock-min').value = producto.stock_minimo || 0;
        }
    } else {
        document.getElementById('producto-nombre').value = '';
        document.getElementById('producto-marca').value = '';
        document.getElementById('producto-formato').value = '';
        document.getElementById('producto-precio').value = '';
        document.getElementById('producto-stock-min').value = 0;
    }
    
    openModal('modal-producto');
}

function editarProducto(id) { showModalProducto(id); }

async function guardarProducto() {
    const id = document.getElementById('producto-id').value;
    const nombre = document.getElementById('producto-nombre').value.trim();
    const marca = document.getElementById('producto-marca').value.trim();
    const categoriaId = document.getElementById('producto-categoria').value;
    const formato = document.getElementById('producto-formato').value.trim();
    const proveedorId = document.getElementById('producto-proveedor').value;
    const precio = parseFloat(document.getElementById('producto-precio').value) || null;
    const stockMin = parseInt(document.getElementById('producto-stock-min').value) || 0;
    
    if (!nombre) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }
    
    const producto = {
        nombre,
        marca: marca || null,
        categoria_id: categoriaId || null,
        formato: formato || null,
        proveedor_id: proveedorId || null,
        precio_referencia: precio,
        stock_minimo: stockMin
    };
    
    try {
        showLoading();
        
        if (id) {
            await DB.updateProducto(id, producto);
            showToast('Producto actualizado', 'success');
        } else {
            await DB.createProducto(producto);
            showToast('Producto creado', 'success');
        }
        
        // Recargar productos
        STATE.productos = await DB.getProductos();
        renderAdminProductos();
        renderProductos();
        closeModal('modal-producto');
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar producto', 'error');
    } finally {
        hideLoading();
    }
}

async function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    
    try {
        await DB.deleteProducto(id);
        STATE.productos = await DB.getProductos();
        renderAdminProductos();
        renderProductos();
        showToast('Producto eliminado', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al eliminar producto', 'error');
    }
}

// ============================================
// PROVEEDORES
// ============================================

function renderAdminProveedores() {
    const container = document.getElementById('admin-proveedores-list');
    if (!container) return;
    
    const busqueda = document.getElementById('search-admin-proveedores')?.value.toLowerCase() || '';
    let proveedores = STATE.proveedores;
    
    if (busqueda) {
        proveedores = proveedores.filter(p => p.nombre.toLowerCase().includes(busqueda));
    }
    
    if (proveedores.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay proveedores</p></div>';
        return;
    }
    
    container.innerHTML = proveedores.map(p => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-name">${p.nombre}</div>
                <div class="admin-item-detail">${p.contacto || ''} · ${p.telefono || ''}</div>
            </div>
            <div class="admin-item-actions">
                <button class="action-btn edit" onclick="editarProveedor('${p.id}')">✏️</button>
                <button class="action-btn delete" onclick="eliminarProveedor('${p.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function filtrarAdminProveedores() { renderAdminProveedores(); }

function showModalProveedor(proveedorId = null) {
    document.getElementById('modal-proveedor-title').textContent = proveedorId ? 'Editar Proveedor' : 'Nuevo Proveedor';
    document.getElementById('proveedor-id').value = proveedorId || '';
    
    if (proveedorId) {
        const proveedor = STATE.proveedores.find(p => p.id === proveedorId);
        if (proveedor) {
            document.getElementById('proveedor-nombre').value = proveedor.nombre;
            document.getElementById('proveedor-contacto').value = proveedor.contacto || '';
            document.getElementById('proveedor-telefono').value = proveedor.telefono || '';
            document.getElementById('proveedor-email').value = proveedor.email || '';
            document.getElementById('proveedor-notas').value = proveedor.notas || '';
        }
    } else {
        document.getElementById('proveedor-nombre').value = '';
        document.getElementById('proveedor-contacto').value = '';
        document.getElementById('proveedor-telefono').value = '';
        document.getElementById('proveedor-email').value = '';
        document.getElementById('proveedor-notas').value = '';
    }
    
    openModal('modal-proveedor');
}

function editarProveedor(id) { showModalProveedor(id); }

async function guardarProveedor() {
    const id = document.getElementById('proveedor-id').value;
    const nombre = document.getElementById('proveedor-nombre').value.trim();
    const contacto = document.getElementById('proveedor-contacto').value.trim();
    const telefono = document.getElementById('proveedor-telefono').value.trim();
    const email = document.getElementById('proveedor-email').value.trim();
    const notas = document.getElementById('proveedor-notas').value.trim();
    
    if (!nombre) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }
    
    const proveedor = {
        nombre,
        contacto: contacto || null,
        telefono: telefono || null,
        email: email || null,
        notas: notas || null
    };
    
    try {
        showLoading();
        
        if (id) {
            await DB.updateProveedor(id, proveedor);
            showToast('Proveedor actualizado', 'success');
        } else {
            await DB.createProveedor(proveedor);
            showToast('Proveedor creado', 'success');
        }
        
        STATE.proveedores = await DB.getProveedores();
        renderAdminProveedores();
        closeModal('modal-proveedor');
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar proveedor', 'error');
    } finally {
        hideLoading();
    }
}

async function eliminarProveedor(id) {
    if (!confirm('¿Eliminar este proveedor?')) return;
    
    try {
        await DB.deleteProveedor(id);
        STATE.proveedores = await DB.getProveedores();
        renderAdminProveedores();
        showToast('Proveedor eliminado', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al eliminar proveedor', 'error');
    }
}

// ============================================
// USUARIOS
// ============================================

async function loadAdminUsuarios() {
    try {
        const usuarios = await DB.getUsuarios();
        renderAdminUsuarios(usuarios);
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderAdminUsuarios(usuarios) {
    const container = document.getElementById('admin-usuarios-list');
    if (!container) return;
    
    if (!usuarios || usuarios.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay usuarios</p></div>';
        return;
    }
    
    container.innerHTML = usuarios.map(u => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-name">${u.nombre}</div>
                <div class="admin-item-detail">${u.email} · ${u.unidad?.nombre || 'Sin unidad'}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
                <span class="role-badge">${u.rol}</span>
                ${esSuperuser() ? `<button class="action-btn edit" onclick="editarUsuarioRol('${u.id}', '${u.rol}')">✏️</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function editarUsuarioRol(userId, rolActual) {
    const roles = ['viewer', 'cocina', 'recepcion', 'admin', 'superuser'];
    const nuevoRol = prompt(`Rol actual: ${rolActual}\nNuevo rol (${roles.join(', ')}):`);
    
    if (nuevoRol && roles.includes(nuevoRol)) {
        try {
            await DB.updateUsuario(userId, { rol: nuevoRol });
            await loadAdminUsuarios();
            showToast('Rol actualizado', 'success');
        } catch (error) {
            showToast('Error al actualizar rol', 'error');
        }
    }
}

function showModalUsuario() {
    showToast('Función de invitar usuario próximamente', 'info');
}

// ============================================
// REPORTES
// ============================================

async function generarReporte(tipo) {
    showToast(`Generando reporte de ${tipo}...`, 'info');
    
    // Por implementar: generación de reportes
    setTimeout(() => {
        showToast('Reportes próximamente disponibles', 'warning');
    }, 1000);
}

// ============================================
// BACKUP
// ============================================

async function exportarBackup() {
    try {
        const backup = {
            productos: STATE.productos,
            proveedores: STATE.proveedores,
            categorias: STATE.categorias,
            metadata: {
                fecha: new Date().toISOString(),
                version: CONFIG.APP_VERSION,
                app: CONFIG.APP_NAME
            }
        };
        
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `ChefManager_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('Backup exportado', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al exportar backup', 'error');
    }
}

async function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!data.productos || !data.proveedores) {
            showToast('Archivo de backup inválido', 'error');
            return;
        }
        
        if (!confirm('¿Importar datos? Esto puede duplicar registros existentes.')) {
            return;
        }
        
        showLoading();
        
        // Importar proveedores
        for (const prov of data.proveedores) {
            try {
                await DB.createProveedor({
                    nombre: prov.nombre,
                    contacto: prov.contacto,
                    telefono: prov.telefono,
                    email: prov.email,
                    notas: prov.notas
                });
            } catch (e) {
                console.log('Proveedor ya existe:', prov.nombre);
            }
        }
        
        // Recargar datos
        STATE.proveedores = await DB.getProveedores();
        STATE.productos = await DB.getProductos();
        
        renderAdminProductos();
        renderAdminProveedores();
        renderProductos();
        
        showToast('Backup importado', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al importar backup', 'error');
    } finally {
        hideLoading();
        event.target.value = '';
    }
}
