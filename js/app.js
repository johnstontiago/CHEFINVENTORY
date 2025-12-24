// ============================================
// APP PRINCIPAL - ChefManager
// ============================================

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando ChefManager...');
    
    try {
        // Inicializar Supabase
        initSupabase();
        
        // Cargar estado local
        loadLocalState();
        
        // Inicializar auth
        initAuth();
        
        // Verificar sesión
        await checkSession();
        
    } catch (error) {
        console.error('Error iniciando app:', error);
        showToast('Error al iniciar la aplicación', 'error');
        hideLoading();
    }
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registrado'))
            .catch(err => console.log('Service Worker no registrado:', err));
    });
}

// Manejar estado offline/online
window.addEventListener('online', () => {
    showToast('Conexión restaurada', 'success');
});

window.addEventListener('offline', () => {
    showToast('Sin conexión - Modo offline', 'warning');
});

// Prevenir zoom en iOS
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Cerrar modales con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});

// Guardar estado antes de cerrar
window.addEventListener('beforeunload', () => {
    saveLocalState();
});

console.log('✅ ChefManager cargado');
