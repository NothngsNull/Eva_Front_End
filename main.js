// ============================================================
//  SportClub - main.js
//  Maneja: Login (Admin / Coach / Usuario) + Registro Usuario
//  API Base: http://localhost:3000
// ============================================================

const API_BASE = 'http://localhost:3000';

// ------------------------------------------------------------
//  UTILIDADES GENERALES
// ------------------------------------------------------------

/**
 * Muestra un mensaje de error en el párrafo #error-msg del formulario.
 * Si no existe el elemento, lo ignora silenciosamente.
 */
function mostrarError(mensaje) {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) {
        errorMsg.textContent = mensaje;
        errorMsg.style.display = 'block';
    }
}

/**
 * Oculta el mensaje de error.
 */
function ocultarError() {
    const errorMsg = document.getElementById('error-msg');
    if (errorMsg) {
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';
    }
}

/**
 * Deshabilita o habilita el botón submit para evitar doble envío.
 */
function setBotonCargando(form, cargando) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = cargando;
    btn.textContent = cargando ? 'Cargando...' : btn.dataset.textoOriginal || btn.textContent;
    if (!btn.dataset.textoOriginal) {
        btn.dataset.textoOriginal = btn.textContent;
    }
}

// ------------------------------------------------------------
//  PARTE 1 — LOGIN
//  Formularios: #formAdmin | #formCoach | #formUser
// ------------------------------------------------------------

/**
 * Rutas de redirección según el rol devuelto por la API.
 * Roles posibles según el README: 'admin' | 'coach' | 'user'
 */
const RUTAS_POR_ROL = {
    admin: 'dashboardA.html',
    coach: 'dashboardCO.html',
    user:  'dashboardC.html'
};

/**
 * Lógica principal de login.
 * Consume POST /api/auth/login
 * Respuesta esperada: { ok: true, data: { token, user: { id, full_name, email, role } } }
 */
async function manejarLogin(e) {
    e.preventDefault();
    ocultarError();
    setBotonCargando(e.target, true);

    const email    = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    // Validación mínima en cliente
    if (!email || !password) {
        mostrarError('Por favor completa todos los campos.');
        setBotonCargando(e.target, false);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        // Manejo de errores HTTP (ej: 500, 404)
        if (!response.ok && response.status !== 400 && response.status !== 401) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const dataRes = await response.json();

        if (dataRes.ok) {
            // ✅ Login exitoso — guardamos token y usuario
            const { token, user } = dataRes.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Redirigimos según rol
            const destino = RUTAS_POR_ROL[user.role];

            if (destino) {
                window.location.href = destino;
            } else {
                // Rol desconocido — no redirigimos a ciegas
                mostrarError(`Rol desconocido: "${user.role}". Contacta al administrador.`);
            }

        } else {
            // ❌ Credenciales incorrectas u otro error controlado por la API
            mostrarError(dataRes.message || 'Credenciales incorrectas. Intenta nuevamente.');
        }

    } catch (error) {
        console.error('[SportClub] Error en login:', error);

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mostrarError('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
        } else {
            mostrarError('Ocurrió un error inesperado. Intenta nuevamente.');
        }
    } finally {
        setBotonCargando(e.target, false);
    }
}

// ------------------------------------------------------------
//  PARTE 2 — REGISTRO DE USUARIO
//  Formulario: #formRegister
//  Consume POST /api/auth/register
// ------------------------------------------------------------

/**
 * Lógica de registro.
 * Mapea los campos del formulario al body que espera la API.
 *
 * Body enviado:
 * {
 *   full_name, email, password,
 *   birth_date,              ← calculada desde la edad ingresada
 *   metadata: {
 *     sports: [{ name, frequency_per_week }],
 *     objetivo, nivel, info_adicional
 *   }
 * }
 */
async function manejarRegistro(e) {
    e.preventDefault();
    ocultarError();
    setBotonCargando(e.target, true);

    // --- Lectura de campos ---
    const nombre          = document.getElementById('nombre')?.value.trim();
    const edad            = document.getElementById('edad')?.value.trim();
    const practicaDeporte = document.getElementById('deporte')?.value;          // 'si' | 'no' | ''
    const objetivo        = document.getElementById('objetivo')?.value.trim();
    const nivel           = document.getElementById('nivel')?.value;
    const email           = document.getElementById('email')?.value.trim();
    const password        = document.getElementById('password')?.value.trim();
    const passwordConfirm = document.getElementById('password_confirm')?.value.trim();
    const infoAdicional   = document.getElementById('info_adicional')?.value.trim();

    // --- Validaciones en cliente ---
    if (!nombre || !email || !password || !passwordConfirm) {
        mostrarError('Los campos Nombre, Email y Contraseña son obligatorios.');
        setBotonCargando(e.target, false);
        return;
    }

    if (password !== passwordConfirm) {
        mostrarError('Las contraseñas no coinciden.');
        setBotonCargando(e.target, false);
        return;
    }

    if (password.length < 6) {
        mostrarError('La contraseña debe tener al menos 6 caracteres.');
        setBotonCargando(e.target, false);
        return;
    }

    // --- Construcción del birth_date desde la edad (aproximada al año actual) ---
    let birth_date = null;
    if (edad && !isNaN(edad) && Number(edad) > 0) {
        const anioNacimiento = new Date().getFullYear() - Number(edad);
        birth_date = `${anioNacimiento}-01-01`;
    }

    // --- Construcción del body según el modelo de la API ---
    const body = {
        full_name: nombre,
        email,
        password,
        birth_date,                          // null si no se ingresó edad
        metadata: {
            practica_deporte: practicaDeporte === 'si',
            sports: practicaDeporte === 'si'
                ? [{ name: objetivo || 'general', frequency_per_week: 3 }]
                : [],
            objetivo:         objetivo        || null,
            nivel:            nivel           || null,
            info_adicional:   infoAdicional   || null
        }
    };

    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        // Algunos backends retornan 201 en creación exitosa
        const dataRes = await response.json();

        if (dataRes.ok || response.status === 201) {
            // ✅ Registro exitoso — redirigimos al login de usuario
            alert('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
            window.location.href = 'loginC.html';

        } else {
            // ❌ Error controlado (ej: email ya existe)
            mostrarError(dataRes.message || 'No se pudo completar el registro. Intenta nuevamente.');
        }

    } catch (error) {
        console.error('[SportClub] Error en registro:', error);

        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mostrarError('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
        } else {
            mostrarError('Ocurrió un error inesperado. Intenta nuevamente.');
        }
    } finally {
        setBotonCargando(e.target, false);
    }
}

// ------------------------------------------------------------
//  PARTE 3 — PROTECCIÓN DE DASHBOARDS
//  Se llama automáticamente si existe el elemento .dash-main
//  en la página actual (es decir, estamos en un dashboard).
// ------------------------------------------------------------

/**
 * Verifica que exista un token y un usuario guardado.
 * Si no, redirige al index para que el usuario elija su login.
 * Además valida que el rol del usuario coincida con el dashboard actual.
 */
function protegerDashboard() {
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    // Detectamos qué dashboard es por el título de la página
    const titulo = document.title.toLowerCase();

    const esDashboardAdmin = titulo.includes('admin');
    const esDashboardCoach = titulo.includes('coach');
    const esDashboardUser  = titulo.includes('usuario');

    // Si el rol no corresponde al dashboard, redirigimos al correcto
    if (esDashboardAdmin && user.role !== 'admin') {
        window.location.href = RUTAS_POR_ROL[user.role] || 'index.html';
        return;
    }
    if (esDashboardCoach && user.role !== 'coach') {
        window.location.href = RUTAS_POR_ROL[user.role] || 'index.html';
        return;
    }
    if (esDashboardUser && user.role !== 'user') {
        window.location.href = RUTAS_POR_ROL[user.role] || 'index.html';
        return;
    }

    // ✅ Todo OK — inyectamos el nombre del usuario donde corresponda
    inyectarNombreUsuario(user);
}

/**
 * Inyecta el nombre del usuario en los elementos del dashboard.
 * Busca: #coach-name, .datos p strong, y el texto del welcome-text.
 */
function inyectarNombreUsuario(user) {
    const nombre = user.full_name || user.name || 'Usuario';

    // Dashboard Coach: <strong id="coach-name">
    const coachName = document.getElementById('coach-name');
    if (coachName) coachName.textContent = nombre;

    // Dashboard Usuario: <p><strong>Nombre:</strong> ...</p>
    const datosNombre = document.querySelector('.datos p strong');
    if (datosNombre) {
        datosNombre.parentElement.innerHTML = `<strong>Nombre:</strong> ${nombre}`;
    }

    // Dashboard Usuario: email
    const datosEmail = document.querySelectorAll('.datos p');
    if (datosEmail.length > 1) {
        datosEmail[1].innerHTML = `<strong>Email:</strong> ${user.email}`;
    }
}

// ------------------------------------------------------------
//  PARTE 4 — CERRAR SESIÓN
//  Aplica a cualquier botón/enlace con clase .cerrar-sesion
// ------------------------------------------------------------

function configurarCierreSesion() {
    document.querySelectorAll('.cerrar-sesion').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    });
}

// ------------------------------------------------------------
//  INICIALIZACIÓN — Se ejecuta cuando el DOM está listo
// ------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {

    // 1. Configurar cerrar sesión (aplica en cualquier página)
    configurarCierreSesion();

    // 2. Detectar y conectar formularios de LOGIN
    const formAdmin = document.getElementById('formAdmin');
    const formCoach = document.getElementById('formCoach');
    const formUser  = document.getElementById('formUser');

    if (formAdmin) formAdmin.addEventListener('submit', manejarLogin);
    if (formCoach) formCoach.addEventListener('submit', manejarLogin);
    if (formUser)  formUser.addEventListener('submit', manejarLogin);

    // 3. Detectar y conectar formulario de REGISTRO
    const formRegister = document.getElementById('formRegister');
    if (formRegister) formRegister.addEventListener('submit', manejarRegistro);

    // 4. Si estamos en un dashboard, protegerlo
    const esDashboard = document.querySelector('.dash-main');
    if (esDashboard) protegerDashboard();
});
