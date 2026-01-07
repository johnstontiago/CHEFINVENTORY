// ============================================
// CONSUMO - ChefManager
// ============================================

let html5QrCode = null;

async function loadConsumoData() {
    await cargarConsumosRecientes();
}

async function cargarConsumosRecientes() {
    try {
        const movimientos = await DB.getMovimientosRecientes(STATE.currentUnidad, 10);
        renderConsumosRecientes(movimientos.filter(m => m.tipo === 'consumo' || m.tipo === 'merma'));
    } catch (error) {
        console.error('Error:', error);
    }
}

function renderConsumosRecientes(movimientos) {
    const container = document.getElementById('consumos-recientes');
    if (!container) return;
    
    if (!movimientos || movimientos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);text-align:center;">No hay consumos recientes</p>';
        return;
    }
    
    container.innerHTML = movimientos.map(m => `
        <div class="carrito-item">
            <div class="carrito-item-info">
                <div class="carrito-item-nombre">${m.inventario?.producto?.nombre || 'Producto'}</div>
                <div class="carrito-item-detalle">${m.inventario?.codigo_unico || ''} · ${formatDateTime(m.created_at)}</div>
            </div>
            <span class="carrito-item-cantidad" style="color:var(--danger)">-${Math.abs(m.cantidad)}</span>
        </div>
    `).join('');
}

// Toggle scanner
function toggleScanner() {
    if (STATE.scannerActivo) {
        detenerScanner();
    } else {
        iniciarScanner();
    }
}

// Iniciar scanner QR
async function iniciarScanner() {
    const qrReader = document.getElementById('qr-reader');
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
    }
    
    try {
        await html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            },
            onScanSuccess,
            onScanError
        );
        
        STATE.scannerActivo = true;
        document.getElementById('scanner-btn-text').textContent = '⏹️ Detener Scanner';
        
    } catch (error) {
        console.error('Error iniciando scanner:', error);
        showToast('No se pudo acceder a la cámara', 'error');
    }
}

// Detener scanner
function detenerScanner() {
    if (html5QrCode && STATE.scannerActivo) {
        html5QrCode.stop().then(() => {
            STATE.scannerActivo = false;
            document.getElementById('scanner-btn-text').textContent = '📷 Escanear QR';
        }).catch(error => {
            console.error('Error deteniendo scanner:', error);
        });
    }
}

// Callback de escaneo exitoso
async function onScanSuccess(decodedText, decodedResult) {
    detenerScanner();
    await buscarInventarioPorCodigo(decodedText);
}

// Callback de error de escaneo (ignoramos errores continuos)
function onScanError(error) {
    // No hacer nada, es normal mientras busca el QR
}

// Buscar por código manual
async function buscarPorCodigo() {
    const codigo = document.getElementById('codigo-manual').value.trim();
    if (!codigo) {
        showToast('Ingresa un código', 'warning');
        return;
    }
    await buscarInventarioPorCodigo(codigo);
}

// Buscar inventario por código
async function buscarInventarioPorCodigo(codigo) {
    try {
        showLoading();
        
        const inventario = await DB.getInventarioByCodigo(codigo);
        
        if (!inventario) {
            document.getElementById('consumo-result').classList.add('hidden');
            showToast('Código no encontrado', 'warning');
            return;
        }
        
        mostrarResultadoConsumo(inventario);
        
    } catch (error) {
        console.error('Error buscando código:', error);
        document.getElementById('consumo-result').classList.add('hidden');
        showToast('Código no encontrado', 'warning');
    } finally {
        hideLoading();
    }
}

// Mostrar resultado del escaneo/búsqueda
function mostrarResultadoConsumo(inventario) {
    const container = document.getElementById('consumo-result');
    container.classList.remove('hidden');
    
    const fechaCaducidad = new Date(inventario.fecha_caducidad);
    const hoy = new Date();
    const caducado = fechaCaducidad < hoy;
    
    container.innerHTML = `
        <div class="consumo-item-info" style="${caducado ? 'background:var(--danger-light);' : ''}">
            <h4>${inventario.producto?.nombre || 'Producto'}</h4>
            <p>${inventario.producto?.marca || ''} · ${inventario.producto?.formato || ''}</p>
            <p><strong>Código:</strong> ${inventario.codigo_unico}</p>
            <p><strong>Lote:</strong> ${inventario.lote}</p>
            <p><strong>Cantidad disponible:</strong> ${inventario.cantidad_actual}</p>
            <p><strong>Caducidad:</strong> ${formatDate(inventario.fecha_caducidad)} ${caducado ? '⚠️ CADUCADO' : ''}</p>
            <p><strong>Ubicación:</strong> ${inventario.ubicacion || 'No especificada'}</p>
        </div>
        <button class="btn btn-danger" onclick="abrirConsumo('${inventario.id}')">
            🔻 Registrar Consumo
        </button>
    `;
}

// Abrir modal de consumo
function abrirConsumo(inventarioId) {
    const item = STATE.inventario?.find(i => i.id === inventarioId);
    
    if (!item) {
        // Buscar en la DB si no está en el estado
        buscarYAbrirConsumo(inventarioId);
        return;
    }
    
    mostrarModalConsumo(item);
}

async function buscarYAbrirConsumo(inventarioId) {
    try {
        const { data: item } = await supabase
            .from('inventario')
            .select('*, producto:productos(nombre, marca, formato)')
            .eq('id', inventarioId)
            .single();
        
        if (item) {
            mostrarModalConsumo(item);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al cargar item', 'error');
    }
}

function mostrarModalConsumo(item) {
    document.getElementById('consumo-inventario-id').value = item.id;
    
    document.getElementById('consumo-item-info').innerHTML = `
        <h4>${item.producto?.nombre || 'Producto'}</h4>
        <p>${item.producto?.marca || ''}</p>
        <p><strong>Código:</strong> ${item.codigo_unico}</p>
    `;
    
    document.getElementById('consumo-cantidad').value = '';
    document.getElementById('consumo-cantidad').max = item.cantidad_actual;
    document.getElementById('consumo-disponible').textContent = `Disponible: ${item.cantidad_actual}`;
    document.getElementById('consumo-motivo').value = 'consumo';
    document.getElementById('consumo-notas').value = '';
    
    openModal('modal-consumo');
}

// Confirmar consumo
async function confirmarConsumo() {
    const inventarioId = document.getElementById('consumo-inventario-id').value;
    const cantidad = parseFloat(document.getElementById('consumo-cantidad').value);
    const motivo = document.getElementById('consumo-motivo').value;
    const notas = document.getElementById('consumo-notas').value;
    
    if (!cantidad || cantidad <= 0) {
        showToast('Ingresa una cantidad válida', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        // Obtener cantidad actual
        const { data: inventario } = await supabase
            .from('inventario')
            .select('cantidad_actual')
            .eq('id', inventarioId)
            .single();
        
        if (cantidad > inventario.cantidad_actual) {
            showToast('Cantidad mayor a la disponible', 'error');
            return;
        }
        
        const nuevaCantidad = inventario.cantidad_actual - cantidad;
        
        // Actualizar inventario
        await supabase
            .from('inventario')
            .update({
                cantidad_actual: nuevaCantidad,
                estado: nuevaCantidad <= 0 ? 'agotado' : 'disponible'
            })
            .eq('id', inventarioId);
        
        // Registrar movimiento
        const tipoMovimiento = motivo === 'merma' ? 'merma' : 'consumo';
        await DB.createMovimiento({
            inventario_id: inventarioId,
            tipo: tipoMovimiento,
            cantidad: -cantidad,
            cantidad_anterior: inventario.cantidad_actual,
            cantidad_posterior: nuevaCantidad,
            usuario_id: STATE.currentUser.id,
            motivo: notas || null
        });
        
        closeModal('modal-consumo');
        showToast('✅ Consumo registrado', 'success');
        
        // Limpiar resultado y recargar
        document.getElementById('consumo-result').classList.add('hidden');
        document.getElementById('codigo-manual').value = '';
        loadConsumoData();
        
        // Si estamos en inventario, recargar también
        if (STATE.currentView === 'view-inventario') {
            loadInventarioData();
        }
        
    } catch (error) {
        console.error('Error registrando consumo:', error);
        showToast('Error al registrar consumo', 'error');
    } finally {
        hideLoading();
    }

    } catch (error) {
        console.error('Error registrando consumo:', error);
        // Esto te dirá el error real en una ventana emergente
        alert("Error técnico: " + (error.message || "Falla en la base de datos"));
        showToast('Error al registrar consumo', 'error');
    } finally {
        hideLoading();
    }
}
