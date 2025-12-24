// ============================================
// AUTENTICACIÓN - ChefManager
// ============================================

// Inicializar auth listener
function initAuth() {
    getSupabase().auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session) {
            await loadUserData(session.user.id);
            showApp();
        } else if (event === 'SIGNED_OUT') {
            STATE.currentUser = null;
            showAuthScreen();
        }
    });
}

// Cargar datos del usuario
async function loadUserData(userId) {
    try {
        const usuario = await DB.getUsuario(userId);
        STATE.currentUser = usuario;
        STATE.currentUnidad = usuario.unidad_id;
        console.log('✅ Usuario cargado:', usuario.nombre);
    } catch (error) {
        console.error('Error cargando usuario:', error);
        // Si el usuario no existe en la tabla usuarios, crearlo
        const { data: authUser } = await getSupabase().auth.getUser();
        if (authUser?.user) {
            // Obtener primera unidad disponible
            const unidades = await DB.getUnidades();
            const primeraUnidad = unidades[0]?.id;
            
            await DB.createUsuario({
                id: authUser.user.id,
                email: authUser.user.email,
                nombre: authUser.user.email.split('@')[0],
                rol: 'viewer',
                unidad_id: primeraUnidad
            });
            
            // Recargar
            await loadUserData(userId);
        }
    }
}

// Login
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Completa todos los campos', 'error');
        return;
    }

    try {
        showLoading();
        const { data, error } = await getSupabase().auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        
        showToast('¡Bienvenido!', 'success');
    } catch (error) {
        console.error('Error login:', error);
        showToast(error.message || 'Error al iniciar sesión', 'error');
        hideLoading();
    }
}

// Registro
async function handleRegister() {
    const nombre = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const unidadId = document.getElementById('register-unidad').value;

    if (!nombre || !email || !password || !unidadId) {
        showToast('Completa todos los campos', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        showLoading();
        
        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await getSupabase().auth.signUp({
            email,
            password
        });

        if (authError) throw authError;

        // Crear perfil en tabla usuarios
        if (authData.user) {
            await DB.createUsuario({
                id: authData.user.id,
                email,
                nombre,
                rol: 'viewer', // Rol por defecto
                unidad_id: unidadId
            });
        }

        showToast('¡Cuenta creada! Revisa tu email para confirmar.', 'success');
        showLogin();
    } catch (error) {
        console.error('Error registro:', error);
        showToast(error.message || 'Error al crear cuenta', 'error');
    } finally {
        hideLoading();
    }
}

// Logout
async function handleLogout() {
    try {
        closeModal('modal-user');
        await getSupabase().auth.signOut();
        showToast('Sesión cerrada', 'success');
    } catch (error) {
        console.error('Error logout:', error);
        showToast('Error al cerrar sesión', 'error');
    }
}

// Mostrar formulario de login
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

// Mostrar formulario de registro
async function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    
    // Cargar unidades en el select
    try {
        const unidades = await DB.getUnidades();
        const select = document.getElementById('register-unidad');
        select.innerHTML = '<option value="">Seleccionar Unidad...</option>' +
            unidades.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
    } catch (error) {
        console.error('Error cargando unidades:', error);
    }
}

// Mostrar pantalla de auth
function showAuthScreen() {
    document.getElementById('loading-screen').classList.add('fade-out');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

// Mostrar app principal
function showApp() {
    document.getElementById('loading-screen').classList.add('fade-out');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    // Actualizar header con info del usuario
    updateHeaderInfo();
    
    // Cargar datos iniciales
    loadInitialData();
}

// Actualizar info en header
function updateHeaderInfo() {
    const unidadNombre = STATE.unidades.find(u => u.id === STATE.currentUnidad)?.nombre || 'Sin unidad';
    document.getElementById('header-unidad').textContent = unidadNombre;
}

// Mostrar menú de usuario
function showUserMenu() {
    if (!STATE.currentUser) return;
    
    document.getElementById('user-name').textContent = STATE.currentUser.nombre;
    document.getElementById('user-email').textContent = STATE.currentUser.email;
    document.getElementById('user-role').textContent = STATE.currentUser.rol;
    
    openModal('modal-user');
}

// Cambiar unidad del usuario
async function cambiarUnidad() {
    const unidades = STATE.unidades;
    const opciones = unidades.map(u => `${u.nombre}`).join('\n');
    const seleccion = prompt(`Selecciona unidad:\n${opciones}`);
    
    if (seleccion) {
        const unidad = unidades.find(u => u.nombre.toLowerCase() === seleccion.toLowerCase());
        if (unidad) {
            try {
                await DB.updateUsuario(STATE.currentUser.id, { unidad_id: unidad.id });
                STATE.currentUnidad = unidad.id;
                STATE.currentUser.unidad_id = unidad.id;
                updateHeaderInfo();
                closeModal('modal-user');
                showToast(`Unidad cambiada a ${unidad.nombre}`, 'success');
                loadInitialData();
            } catch (error) {
                showToast('Error al cambiar unidad', 'error');
            }
        }
    }
}

// Cambiar PIN
async function cambiarPin() {
    const nuevoPin = prompt('Ingresa tu nuevo PIN (4 dígitos):');
    if (nuevoPin && /^\d{4}$/.test(nuevoPin)) {
        try {
            await DB.updateUsuario(STATE.currentUser.id, { pin: nuevoPin });
            STATE.currentUser.pin = nuevoPin;
            showToast('PIN actualizado', 'success');
            closeModal('modal-user');
        } catch (error) {
            showToast('Error al cambiar PIN', 'error');
        }
    } else if (nuevoPin) {
        showToast('El PIN debe ser de 4 dígitos', 'error');
    }
}

// Verificar sesión al cargar
async function checkSession() {
    const { data: { session } } = await getSupabase().auth.getSession();
    
    if (session) {
        await loadUserData(session.user.id);
        showApp();
    } else {
        showAuthScreen();
    }
}
