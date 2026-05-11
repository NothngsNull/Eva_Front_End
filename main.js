// main.js - login, registro y recuperar contraseña

const API_BASE = 'http://localhost:3000';

// funciones para mostrar/ocultar errores en los campos

/**
 * Muestra un error inline bajo un campo específico.
 */
function mostrarCampoError(id, msg) {
    const span = document.getElementById(id);
    if (!span) return;
    span.textContent = msg;
    span.classList.add('visible');

    // Marca el input/select/textarea anterior como inválido
    const input = span.previousElementSibling;
    if (input && ['INPUT', 'SELECT', 'TEXTAREA'].includes(input.tagName)) {
        input.classList.add('input-invalido');
        input.classList.remove('input-valido');
    }
}

/**
 * Limpia el error inline de un campo específico.
 */
function limpiarCampoError(id) {
    const span = document.getElementById(id);
    if (!span) return;
    span.textContent = '';
    span.classList.remove('visible');

    const input = span.previousElementSibling;
    if (input && ['INPUT', 'SELECT', 'TEXTAREA'].includes(input.tagName)) {
        input.classList.remove('input-invalido', 'input-valido');
    }
}

/**
 * Marca un campo como válido visualmente.
 */
function marcarValido(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.remove('input-invalido');
    input.classList.add('input-valido');
}

/**
 * Muestra el error general de API (#error-msg).
 */
function mostrarErrorGeneral(msg) {
    const el = document.getElementById('error-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

/**
 * Oculta el error general de API.
 */
function ocultarErrorGeneral() {
    const el = document.getElementById('error-msg');
    if (!el) return;
    el.style.display = 'none';
    el.textContent = '';
}

/**
 * Muestra mensaje de éxito (#success-msg).
 */
function mostrarExito(msg) {
    const el = document.getElementById('success-msg');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
}

/**
 * Deshabilita o habilita el botón submit mientras carga.
 */
function setBotonCargando(form, cargando) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (cargando) {
        btn.dataset.textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Cargando...';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.textoOriginal || btn.textContent;
    }
}

// funciones de validación reutilizables

/** Valida formato de email */
function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Agrega limpieza de error en tiempo real al escribir en un campo.
 */
function agregarLimpiezaEnTiempoReal(inputId, errorId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const eventos = input.tagName === 'SELECT' ? ['change'] : ['input'];
    eventos.forEach(evento => {
        input.addEventListener(evento, () => {
            if (input.value.trim() !== '') {
                limpiarCampoError(errorId);
            }
        });
    });
}

// --- login ---

const RUTAS_POR_ROL = {
    admin: 'dashboardA.html',
    coach: 'dashboardCO.html',
    user:  'dashboardC.html'
};

function validarLogin() {
    let valido = true;

    const email    = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();

    limpiarCampoError('error-email');
    if (!email) {
        mostrarCampoError('error-email', 'El correo electrónico es obligatorio.');
        valido = false;
    } else if (!esEmailValido(email)) {
        mostrarCampoError('error-email', 'Ingresa un correo electrónico válido.');
        valido = false;
    } else {
        marcarValido('email');
    }

    limpiarCampoError('error-password');
    if (!password) {
        mostrarCampoError('error-password', 'La contraseña es obligatoria.');
        valido = false;
    } else if (password.length < 6) {
        mostrarCampoError('error-password', 'La contraseña debe tener al menos 6 caracteres.');
        valido = false;
    } else {
        marcarValido('password');
    }

    return valido;
}

async function manejarLogin(e) {
    e.preventDefault();
    ocultarErrorGeneral();

    if (!validarLogin()) return;

    setBotonCargando(e.target, true);

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok && response.status !== 400 && response.status !== 401) {
            throw new Error(`Error del servidor: ${response.status}`);
        }

        const dataRes = await response.json();

        if (dataRes.ok) {
            const { token, user } = dataRes.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            const destino = RUTAS_POR_ROL[user.role];
            if (destino) {
                window.location.href = destino;
            } else {
                mostrarErrorGeneral(`Rol desconocido: "${user.role}". Contacta al administrador.`);
            }
        } else {
            // Credenciales incorrectas — borde rojo en ambos campos + mensaje general
            mostrarCampoError('error-email', ' ');
            mostrarCampoError('error-password', ' ');
            mostrarErrorGeneral(dataRes.message || 'Correo o contraseña incorrectos.');
        }

    } catch (error) {
        console.error('[SportClub] Error en login:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mostrarErrorGeneral('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
        } else {
            mostrarErrorGeneral('Ocurrió un error inesperado. Intenta nuevamente.');
        }
    } finally {
        setBotonCargando(e.target, false);
    }
}

// --- registro ---

function validarRegistro() {
    let valido = true;

    const nombre          = document.getElementById('nombre')?.value.trim();
    const edad            = document.getElementById('edad')?.value.trim();
    const email           = document.getElementById('email')?.value.trim();
    const password        = document.getElementById('password')?.value.trim();
    const passwordConfirm = document.getElementById('password_confirm')?.value.trim();

    // Nombre
    limpiarCampoError('error-nombre');
    if (!nombre) {
        mostrarCampoError('error-nombre', 'El nombre es obligatorio.');
        valido = false;
    } else if (nombre.length < 2) {
        mostrarCampoError('error-nombre', 'El nombre debe tener al menos 2 caracteres.');
        valido = false;
    } else {
        marcarValido('nombre');
    }

    // Edad (opcional, pero si se ingresa debe ser válida)
    limpiarCampoError('error-edad');
    if (edad !== '') {
        const edadNum = Number(edad);
        if (isNaN(edadNum) || edadNum < 5 || edadNum > 120) {
            mostrarCampoError('error-edad', 'Ingresa una edad válida (entre 5 y 120).');
            valido = false;
        } else {
            marcarValido('edad');
        }
    }

    // Email
    limpiarCampoError('error-email');
    if (!email) {
        mostrarCampoError('error-email', 'El correo electrónico es obligatorio.');
        valido = false;
    } else if (!esEmailValido(email)) {
        mostrarCampoError('error-email', 'Ingresa un correo electrónico válido. Ej: usuario@mail.com');
        valido = false;
    } else {
        marcarValido('email');
    }

    // Contraseña
    limpiarCampoError('error-password');
    if (!password) {
        mostrarCampoError('error-password', 'La contraseña es obligatoria.');
        valido = false;
    } else if (password.length < 6) {
        mostrarCampoError('error-password', 'La contraseña debe tener al menos 6 caracteres.');
        valido = false;
    } else {
        marcarValido('password');
    }

    // Confirmar contraseña
    limpiarCampoError('error-password-confirm');
    if (!passwordConfirm) {
        mostrarCampoError('error-password-confirm', 'Debes repetir la contraseña.');
        valido = false;
    } else if (password && passwordConfirm !== password) {
        mostrarCampoError('error-password-confirm', 'Las contraseñas no coinciden.');
        valido = false;
    } else if (passwordConfirm) {
        marcarValido('password_confirm');
    }

    return valido;
}

async function manejarRegistro(e) {
    e.preventDefault();
    ocultarErrorGeneral();

    if (!validarRegistro()) return;

    setBotonCargando(e.target, true);

    const nombre          = document.getElementById('nombre').value.trim();
    const edad            = document.getElementById('edad')?.value.trim();
    const practicaDeporte = document.getElementById('deporte')?.value;
    const objetivo        = document.getElementById('objetivo')?.value.trim();
    const nivel           = document.getElementById('nivel')?.value;
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value.trim();
    const infoAdicional   = document.getElementById('info_adicional')?.value.trim();

    let birth_date = null;
    if (edad && !isNaN(edad) && Number(edad) > 0) {
        const anioNacimiento = new Date().getFullYear() - Number(edad);
        birth_date = `${anioNacimiento}-01-01`;
    }

    const body = {
        full_name: nombre,
        email,
        password,
        birth_date,
        metadata: {
            practica_deporte: practicaDeporte === 'si',
            sports: practicaDeporte === 'si'
                ? [{ name: objetivo || 'general', frequency_per_week: 3 }]
                : [],
            objetivo:       objetivo      || null,
            nivel:          nivel         || null,
            info_adicional: infoAdicional || null
        }
    };

    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const dataRes = await response.json();

        if (dataRes.ok || response.status === 201) {
            // Redirige al login con parámetro para mostrar mensaje de éxito
            window.location.href = 'login.html?registro=ok';
        } else {
            const msg = dataRes.message || '';
            if (msg.toLowerCase().includes('email') ||
                msg.toLowerCase().includes('correo') ||
                msg.toLowerCase().includes('exist')) {
                mostrarCampoError('error-email', 'Este correo ya está registrado. Prueba con otro.');
            } else {
                mostrarErrorGeneral(msg || 'No se pudo completar el registro. Intenta nuevamente.');
            }
        }

    } catch (error) {
        console.error('[SportClub] Error en registro:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            mostrarErrorGeneral('No se pudo conectar con el servidor. Verifica que el backend esté activo.');
        } else {
            mostrarErrorGeneral('Ocurrió un error inesperado. Intenta nuevamente.');
        }
    } finally {
        setBotonCargando(e.target, false);
    }
}

// --- recuperar contraseña ---

function validarRecover() {
    let valido = true;
    const email = document.getElementById('email')?.value.trim();

    limpiarCampoError('error-email');
    if (!email) {
        mostrarCampoError('error-email', 'El correo electrónico es obligatorio.');
        valido = false;
    } else if (!esEmailValido(email)) {
        mostrarCampoError('error-email', 'Ingresa un correo electrónico válido.');
        valido = false;
    } else {
        marcarValido('email');
    }

    return valido;
}

async function manejarRecover(e) {
    e.preventDefault();
    ocultarErrorGeneral();

    const successEl = document.getElementById('success-msg');
    if (successEl) successEl.style.display = 'none';

    if (!validarRecover()) return;

    setBotonCargando(e.target, true);

    const email = document.getElementById('email').value.trim();

    try {
        await fetch(`${API_BASE}/api/auth/recover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        // Siempre mostramos el mismo mensaje por seguridad
        mostrarExito('✓ Si el correo existe, recibirás las instrucciones en breve.');
    } catch (error) {
        // Si el endpoint no está disponible igual mostramos el mensaje
        mostrarExito('✓ Si el correo existe, recibirás las instrucciones en breve.');
    } finally {
        setBotonCargando(e.target, false);
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = '';
            emailInput.classList.remove('input-valido');
        }
        limpiarCampoError('error-email');
    }
}

// --- protección de rutas según rol ---

function protegerDashboard() {
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    const titulo = document.title.toLowerCase();

    if (titulo.includes('admin') && user.role !== 'admin') {
        window.location.href = RUTAS_POR_ROL[user.role] || 'index.html';
        return;
    }
    if (titulo.includes('coach') && user.role !== 'coach') {
        window.location.href = RUTAS_POR_ROL[user.role] || 'index.html';
        return;
    }
    if (titulo.includes('usuario') && user.role !== 'user') {
        window.location.href = RUTAS_POR_ROL[user.role] || 'index.html';
        return;
    }

    inyectarNombreUsuario(user);
}

function inyectarNombreUsuario(user) {
    const nombre = user.full_name || user.name || 'Usuario';

    const coachName = document.getElementById('coach-name');
    if (coachName) coachName.textContent = nombre;

    const datosNombre = document.querySelector('.datos p strong');
    if (datosNombre) {
        datosNombre.parentElement.innerHTML = `<strong>Nombre:</strong> ${nombre}`;
    }

    const datosEmail = document.querySelectorAll('.datos p');
    if (datosEmail.length > 1) {
        datosEmail[1].innerHTML = `<strong>Email:</strong> ${user.email}`;
    }
}

// --- cerrar sesión ---

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

// muestra mensaje de éxito si viene de registrarse

function mostrarAvisoRegistroExitoso() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registro') !== 'ok') return;

    const exito = document.createElement('p');
    exito.className = 'login-success';
    exito.style.display = 'block';
    exito.textContent = '✓ Cuenta creada exitosamente. Ya puedes iniciar sesión.';

    const form = document.getElementById('formUser');
    if (form) form.insertAdjacentElement('beforebegin', exito);

    // Limpiar el parámetro de la URL sin recargar
    window.history.replaceState({}, '', 'login.html');
}

// inicialización según la página actual

document.addEventListener('DOMContentLoaded', () => {

    configurarCierreSesion();

    // LOGIN
    const formUser = document.getElementById('formUser');
    if (formUser) {
        formUser.addEventListener('submit', manejarLogin);
        agregarLimpiezaEnTiempoReal('email',    'error-email');
        agregarLimpiezaEnTiempoReal('password', 'error-password');
        mostrarAvisoRegistroExitoso();
    }

    // REGISTRO
    const formRegister = document.getElementById('formRegister');
    if (formRegister) {
        formRegister.addEventListener('submit', manejarRegistro);
        agregarLimpiezaEnTiempoReal('nombre',           'error-nombre');
        agregarLimpiezaEnTiempoReal('edad',             'error-edad');
        agregarLimpiezaEnTiempoReal('email',            'error-email');
        agregarLimpiezaEnTiempoReal('password',         'error-password');
        agregarLimpiezaEnTiempoReal('password_confirm', 'error-password-confirm');
    }

    // RECUPERAR CONTRASEÑA
    const formRecover = document.getElementById('formRecover');
    if (formRecover) {
        formRecover.addEventListener('submit', manejarRecover);
        agregarLimpiezaEnTiempoReal('email', 'error-email');
    }

    // DASHBOARDS
    const esDashboard = document.querySelector('.dash-main');
    if (esDashboard) protegerDashboard();
});
