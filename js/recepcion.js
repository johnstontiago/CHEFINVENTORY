// ============================================
// RECEPCIÓN - ChefManager
// ============================================

let recepcionTab = 'pendientes';

async function loadRecepcionData() {
    try {
        await loadPedidosPendientes();
        await loadRecibidosHoy();
    } catch (error) {
        console.error('Error cargando recepción:', error);
    }
}

async function loadPedidosPendientes() {
    try {
        const pedidos = await DB.getPedidosPendientes(STATE.currentUnidad);
        renderPedidosPendientes(pedidos);
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderPedidosPendientes(pedidos) {
    const container = document.getElementById('recepcion-pendientes');
    if (!container) return;
    
    if (!pedidos || pedidos.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">✅</span><p>No hay pedidos pendientes</p></div>';
        return;
    }
    
    container.innerHTML = pedidos.map(pedido => `
        <div class="recepcion-card">
            <div class="recepcion-header">
                <span class="recepcion-pedido-num">Pedido #${pedido.numero_pedido}</span>
                <span class="recepcion-fecha">${formatDate(pedido.created_at)}</span>
            </div>
            <div class="recepcion-items">
                ${pedido.items.filter(i => i.estado !== 'recibido').map(item => `
                    <div class="recepcion-item">
                        <div class="recepcion-item-info">
                            <div class="recepcion-item-nombre">${item.producto?.nombre || 'Producto'}</div>
                            <div class="recepcion-item-cantidad">
                                ${item.cantidad_recibida}/${item.cantidad_pedida} ${item.producto?.formato || ''}
                            </div>
                        </div>
                        <div class="recepcion-item-status">
                            <span class="status-badge status-${item.estado}">${item.estado}</span>
                            <button class="btn-recibir" onclick="abrirRecepcionItem('${item.id}', '${item.producto_id}', ${item.cantidad_pedida}, ${item.cantidad_recibida})">
                                📦 Recibir
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

async function loadRecibidosHoy() {
    // Por implementar: mostrar items recibidos hoy
    const container = document.getElementById('recepcion-recibidos');
    if (container) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span><p>No hay recepciones hoy</p></div>';
    }
}

function switchRecepcionTab(tab) {
    recepcionTab = tab;
    
    document.querySelectorAll('.tabs .tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    
    document.getElementById('recepcion-pendientes').classList.toggle('hidden', tab !== 'pendientes');
    document.getElementById('recepcion-recibidos').classList.toggle('hidden', tab !== 'recibidos');
}

// Abrir modal de recepción
function abrirRecepcionItem(itemId, productoId, cantidadPedida, cantidadRecibida) {
    const producto = STATE.productos.find(p => p.id === productoId);
    
    document.getElementById('recepcion-item-id').value = itemId;
    document.getElementById('recepcion-producto-info').innerHTML = `
        <h4>${producto?.nombre || 'Producto'}</h4>
        <p>${producto?.marca || ''} · ${producto?.formato || ''}</p>
        <p>Pedido: <strong>${cantidadPedida}</strong> | Recibido: <strong>${cantidadRecibida}</strong></p>
    `;
    
    document.getElementById('recepcion-cantidad').value = cantidadPedida - cantidadRecibida;
    document.getElementById('recepcion-cantidad').max = cantidadPedida - cantidadRecibida;
    document.getElementById('recepcion-lote').value = '';
    document.getElementById('recepcion-caducidad').value = '';
    document.getElementById('recepcion-ubicacion').value = '';
    document.getElementById('codigo-preview-value').textContent = '---';
    
    // Actualizar preview al cambiar campos
    document.getElementById('recepcion-lote').oninput = actualizarCodigoPreview;
    document.getElementById('recepcion-caducidad').oninput = actualizarCodigoPreview;
    
    openModal('modal-recepcion');
}

function actualizarCodigoPreview() {
    const lote = document.getElementById('recepcion-lote').value;
    const caducidad = document.getElementById('recepcion-caducidad').value;
    const hoy = new Date().toISOString().split('T')[0];
    
    if (lote && caducidad) {
        const codigo = generarCodigoUnico(lote, caducidad, hoy);
        document.getElementById('codigo-preview-value').textContent = codigo;
    } else {
        document.getElementById('codigo-preview-value').textContent = '---';
    }
}

// Confirmar recepción
async function confirmarRecepcion() {
    const itemId = document.getElementById('recepcion-item-id').value;
    const cantidad = parseFloat(document.getElementById('recepcion-cantidad').value);
    const lote = document.getElementById('recepcion-lote').value.trim();
    const caducidad = document.getElementById('recepcion-caducidad').value;
    const ubicacion = document.getElementById('recepcion-ubicacion').value.trim();
    
    if (!cantidad || cantidad <= 0) {
        showToast('Ingresa una cantidad válida', 'warning');
        return;
    }
    
    if (!lote) {
        showToast('Ingresa el lote', 'warning');
        return;
    }
    
    if (!caducidad) {
        showToast('Ingresa la fecha de caducidad', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const hoy = new Date().toISOString().split('T')[0];
        const codigoUnico = generarCodigoUnico(lote, caducidad, hoy);
        
        // Obtener el item del pedido para saber el producto
        const { data: itemData } = await supabase
            .from('pedido_items')
            .select('*, pedido:pedidos(unidad_id)')
            .eq('id', itemId)
            .single();
        
        // Crear entrada en inventario
        const inventario = {
            codigo_unico: codigoUnico,
            unidad_id: itemData.pedido.unidad_id,
            producto_id: itemData.producto_id,
            pedido_item_id: itemId,
            lote: lote,
            fecha_caducidad: caducidad,
            fecha_recibido: hoy,
            cantidad_inicial: cantidad,
            cantidad_actual: cantidad,
            estado: CONFIG.ESTADOS_INVENTARIO.DISPONIBLE,
            ubicacion: ubicacion || null,
            recibido_por: STATE.currentUser.id
        };
        
        await DB.createInventario(inventario);
        
        // Actualizar item del pedido
        const nuevaCantidadRecibida = (itemData.cantidad_recibida || 0) + cantidad;
        const nuevoEstado = nuevaCantidadRecibida >= itemData.cantidad_pedida 
            ? CONFIG.ESTADOS_ITEM.RECIBIDO 
            : CONFIG.ESTADOS_ITEM.PARCIAL;
        
        await DB.updatePedidoItem(itemId, {
            cantidad_recibida: nuevaCantidadRecibida,
            estado: nuevoEstado
        });
        
        // Verificar si todo el pedido está recibido
        const { data: allItems } = await supabase
            .from('pedido_items')
            .select('estado')
            .eq('pedido_id', itemData.pedido_id);
        
        const todoRecibido = allItems.every(i => i.estado === 'recibido');
        if (todoRecibido) {
            await DB.updatePedido(itemData.pedido_id, { estado: CONFIG.ESTADOS_PEDIDO.RECIBIDO });
        } else {
            await DB.updatePedido(itemData.pedido_id, { estado: CONFIG.ESTADOS_PEDIDO.PARCIAL });
        }
        
        closeModal('modal-recepcion');
        showToast('✅ Recepción confirmada', 'success');
        
        // Mostrar QR generado
        mostrarQRGenerado(codigoUnico, STATE.productos.find(p => p.id === itemData.producto_id), caducidad);
        
        // Recargar datos
        loadRecepcionData();
        
    } catch (error) {
        console.error('Error confirmando recepción:', error);
        showToast('Error al confirmar recepción', 'error');
    } finally {
        hideLoading();
    }
}

// Mostrar QR generado
function mostrarQRGenerado(codigo, producto, caducidad) {
    document.getElementById('qr-producto').textContent = producto?.nombre || 'Producto';
    document.getElementById('qr-codigo').textContent = codigo;
    document.getElementById('qr-caducidad').textContent = `Caduca: ${formatDate(caducidad)}`;
    
    // Generar QR
    const qrContainer = document.getElementById('qr-canvas');
    qrContainer.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(codigo, { width: 200 }, (error, canvas) => {
            if (!error) {
                qrContainer.appendChild(canvas);
            }
        });
    }
    
    openModal('modal-qr');
}

// Imprimir etiqueta
function imprimirEtiqueta() {
    window.print();
}
