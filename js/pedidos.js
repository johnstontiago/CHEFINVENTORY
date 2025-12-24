// ============================================
// PEDIDOS - ChefManager
// ============================================

// Enviar pedido
async function enviarPedido() {
    const items = getCarritoItems();
    if (items.length === 0) {
        showToast('El carrito está vacío', 'warning');
        return;
    }
    
    const unidadId = document.getElementById('pedido-unidad').value;
    if (!unidadId) {
        showToast('Selecciona una unidad', 'warning');
        return;
    }
    
    const notas = document.getElementById('pedido-notas')?.value || '';
    
    try {
        showLoading();
        
        const pedido = {
            unidad_id: unidadId,
            usuario_id: STATE.currentUser.id,
            estado: CONFIG.ESTADOS_PEDIDO.ENVIADO,
            notas: notas
        };
        
        const pedidoItems = items.map(item => ({
            producto_id: item.productoId,
            cantidad_pedida: item.cantidad,
            estado: CONFIG.ESTADOS_ITEM.PENDIENTE
        }));
        
        await DB.createPedido(pedido, pedidoItems);
        
        clearCarrito();
        renderProductos();
        
        showToast('✅ Pedido enviado correctamente', 'success');
        changeView('view-historial');
        
    } catch (error) {
        console.error('Error enviando pedido:', error);
        showToast('Error al enviar pedido', 'error');
    } finally {
        hideLoading();
    }
}

// Copiar pedido como texto
async function copiarPedido() {
    const items = getCarritoItems();
    if (items.length === 0) {
        showToast('El carrito está vacío', 'warning');
        return;
    }
    
    const unidad = STATE.unidades.find(u => u.id === STATE.currentUnidad);
    const fecha = new Date().toLocaleString('es-ES');
    
    let texto = `📦 PEDIDO PANZZONI - ${unidad?.nombre || 'Sin unidad'}\n`;
    texto += `📅 Fecha: ${fecha}\n`;
    texto += `------------------------------------\n\n`;
    
    const porProveedor = {};
    items.forEach(item => {
        const proveedor = item.producto.proveedor?.nombre || 'Sin proveedor';
        if (!porProveedor[proveedor]) porProveedor[proveedor] = [];
        porProveedor[proveedor].push(item);
    });
    
    Object.keys(porProveedor).sort().forEach(proveedor => {
        texto += `👉 PROVEEDOR: ${proveedor}\n`;
        porProveedor[proveedor].forEach(item => {
            texto += `- ${item.cantidad} x ${item.producto.nombre} (${item.producto.marca || ''} - ${item.producto.formato || ''})\n`;
        });
        texto += '\n';
    });
    
    await copyToClipboard(texto);
}

// Exportar CSV
function exportarCSV() {
    const items = getCarritoItems();
    if (items.length === 0) {
        showToast('El carrito está vacío', 'warning');
        return;
    }
    
    const unidad = STATE.unidades.find(u => u.id === STATE.currentUnidad);
    let csv = 'Cantidad,Nombre,Marca,Formato,Categoria,Proveedor\n';
    
    items.forEach(item => {
        const p = item.producto;
        csv += `${item.cantidad},"${p.nombre}","${p.marca || ''}","${p.formato || ''}","${p.categoria?.nombre || ''}","${p.proveedor?.nombre || ''}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pedido_${unidad?.nombre || 'pedido'}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast('CSV descargado', 'success');
}

// Cargar historial
async function loadHistorialData() {
    try {
        const pedidos = await DB.getPedidos(STATE.currentUnidad);
        STATE.pedidos = pedidos;
        renderHistorial();
    } catch (error) {
        console.error('Error cargando historial:', error);
        showToast('Error al cargar historial', 'error');
    }
}

// Renderizar historial
function renderHistorial() {
    const container = document.getElementById('historial-list');
    if (!container) return;
    
    const filtro = document.getElementById('historial-filtro')?.value || 'all';
    let pedidos = STATE.pedidos;
    
    if (filtro !== 'all') {
        pedidos = pedidos.filter(p => p.estado === filtro);
    }
    
    if (pedidos.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">📋</span><p>No hay pedidos</p></div>';
        return;
    }
    
    container.innerHTML = pedidos.map(p => {
        const totalItems = p.items?.reduce((sum, i) => sum + i.cantidad_pedida, 0) || 0;
        return `
            <div class="historial-card" onclick="verDetallePedido('${p.id}')">
                <div class="historial-header">
                    <span class="historial-num">Pedido #${p.numero_pedido}</span>
                    <span class="status-badge status-${p.estado}">${p.estado}</span>
                </div>
                <div class="historial-unidad">${p.unidad?.nombre || ''}</div>
                <div class="historial-footer">
                    <span class="historial-items">${totalItems} items</span>
                    <span class="historial-fecha">${formatDateTime(p.created_at)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function filtrarHistorial() { renderHistorial(); }

// Ver detalle pedido
async function verDetallePedido(pedidoId) {
    try {
        const pedido = await DB.getPedido(pedidoId);
        
        document.getElementById('pedido-detalle-title').textContent = `Pedido #${pedido.numero_pedido}`;
        document.getElementById('pedido-detalle-info').innerHTML = `
            <p><strong>Unidad:</strong> ${pedido.unidad?.nombre || ''}</p>
            <p><strong>Estado:</strong> <span class="status-badge status-${pedido.estado}">${pedido.estado}</span></p>
            <p><strong>Fecha:</strong> ${formatDateTime(pedido.created_at)}</p>
            ${pedido.notas ? `<p><strong>Notas:</strong> ${pedido.notas}</p>` : ''}
        `;
        
        document.getElementById('pedido-detalle-items').innerHTML = pedido.items.map(item => `
            <div class="pedido-item-row">
                <div><strong>${item.producto?.nombre || 'Producto'}</strong><br><small>${item.producto?.marca || ''}</small></div>
                <div style="text-align:right"><strong>${item.cantidad_pedida}</strong> pedido<br><small>${item.cantidad_recibida} recibido</small></div>
            </div>
        `).join('');
        
        const btnEditar = document.getElementById('btn-editar-pedido');
        btnEditar.style.display = pedido.estado === 'borrador' ? 'block' : 'none';
        btnEditar.onclick = () => editarPedido(pedidoId);
        
        openModal('modal-pedido-detalle');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar pedido', 'error');
    }
}

// Editar pedido
async function editarPedido(pedidoId) {
    try {
        const pedido = await DB.getPedido(pedidoId);
        STATE.carrito = {};
        pedido.items.forEach(item => {
            STATE.carrito[item.producto_id] = item.cantidad_pedida;
        });
        saveLocalState();
        updateCarritoUI();
        closeModal('modal-pedido-detalle');
        changeView('view-carrito');
        showToast('Pedido cargado al carrito', 'success');
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al editar pedido', 'error');
    }
}
