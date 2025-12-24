// ============================================
// INVENTARIO - ChefManager
// ============================================

async function loadInventarioData() {
    try {
        // Cargar estadísticas
        const stats = await DB.getEstadisticasInventario(STATE.currentUnidad);
        document.getElementById('inv-total').textContent = stats.total;
        document.getElementById('inv-por-caducar').textContent = stats.porCaducar;
        document.getElementById('inv-bajo-stock').textContent = stats.bajoStock;
        
        // Cargar inventario
        const inventario = await DB.getInventario(STATE.currentUnidad);
        STATE.inventario = inventario;
        renderInventario();
        
    } catch (error) {
        console.error('Error cargando inventario:', error);
        showToast('Error al cargar inventario', 'error');
    }
}

function renderInventario() {
    const container = document.getElementById('inventario-list');
    if (!container) return;
    
    const inventario = STATE.inventario;
    
    if (!inventario || inventario.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">📦</span><p>No hay items en inventario</p></div>';
        return;
    }
    
    const hoy = new Date();
    const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    container.innerHTML = inventario.map(item => {
        const fechaCaducidad = new Date(item.fecha_caducidad);
        let estadoCaducidad = '';
        
        if (fechaCaducidad < hoy) {
            estadoCaducidad = 'caducado';
        } else if (fechaCaducidad < enUnaSemana) {
            estadoCaducidad = 'por-caducar';
        }
        
        const diasRestantes = Math.ceil((fechaCaducidad - hoy) / (1000 * 60 * 60 * 24));
        let textoCaducidad = '';
        if (diasRestantes < 0) {
            textoCaducidad = `Caducado hace ${Math.abs(diasRestantes)} días`;
        } else if (diasRestantes === 0) {
            textoCaducidad = 'Caduca hoy';
        } else if (diasRestantes === 1) {
            textoCaducidad = 'Caduca mañana';
        } else if (diasRestantes <= 7) {
            textoCaducidad = `Caduca en ${diasRestantes} días`;
        } else {
            textoCaducidad = `Caduca: ${formatDate(item.fecha_caducidad)}`;
        }
        
        return `
            <div class="inventario-item ${estadoCaducidad}">
                <div class="inventario-info">
                    <div class="inventario-producto">${item.producto?.nombre || 'Producto'}</div>
                    <div class="inventario-detalle">${item.producto?.marca || ''} · Lote: ${item.lote}</div>
                    <div class="inventario-codigo">${item.codigo_unico}</div>
                </div>
                <div class="inventario-cantidad">
                    <div class="inventario-qty">${item.cantidad_actual}</div>
                    <div class="inventario-caducidad">${textoCaducidad}</div>
                </div>
                <div class="inventario-actions">
                    <button class="inv-action-btn qr" onclick="mostrarQR('${item.id}')" title="Ver QR">
                        📱
                    </button>
                    <button class="inv-action-btn consumir" onclick="abrirConsumo('${item.id}')" title="Consumir">
                        🔻
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Mostrar QR de un item
async function mostrarQR(inventarioId) {
    const item = STATE.inventario.find(i => i.id === inventarioId);
    if (!item) return;
    
    document.getElementById('qr-producto').textContent = item.producto?.nombre || 'Producto';
    document.getElementById('qr-codigo').textContent = item.codigo_unico;
    document.getElementById('qr-caducidad').textContent = `Caduca: ${formatDate(item.fecha_caducidad)}`;
    
    const qrContainer = document.getElementById('qr-canvas');
    qrContainer.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
        QRCode.toCanvas(item.codigo_unico, { width: 200 }, (error, canvas) => {
            if (!error) {
                qrContainer.appendChild(canvas);
            }
        });
    }
    
    openModal('modal-qr');
}

// Filtros de inventario
function showFiltrosInventario() {
    // Por implementar: modal con filtros avanzados
    showToast('Filtros próximamente', 'info');
}
