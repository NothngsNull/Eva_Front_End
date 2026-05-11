// perfil.js - módulo de perfil para los 3 roles

const API_BASE_PERFIL = 'http://localhost:3000';

// configuración de nav y colores según el rol

const CONFIG_ROL = {
    user: {
        clase:      'rol-user',
        badgeTexto: 'user',
        rolLabel:   'Usuario del Sistema',
        headerTxt:  'DASHBOARD USUARIO',
        dashboard:  'dashboardC.html',
        navLinks: [
            { href: 'dashboardC.html', texto: 'Inicio' },
            { href: '#',               texto: 'Clases' },
            { href: '#',               texto: 'Reservas' },
            { href: '#',               texto: 'Mi Progreso' },
            { href: 'perfil.html',     texto: 'Perfil', activo: true }
        ]
    },
    coach: {
        clase:      'rol-coach',
        badgeTexto: 'coach',
        rolLabel:   'Entrenador',
        headerTxt:  'DASHBOARD COACH',
        dashboard:  'dashboardCO.html',
        navLinks: [
            { href: 'dashboardCO.html', texto: 'Inicio' },
            { href: '#',                texto: 'Mis Alumnos' },
            { href: '#',                texto: 'Mi Horario' },
            { href: '#',                texto: 'Reportes' },
            { href: 'perfil.html',      texto: 'Perfil', activo: true }
        ]
    },
    admin: {
        clase:      'rol-admin',
        badgeTexto: 'admin',
        rolLabel:   'Administrador',
        headerTxt:  'DASHBOARD ADMIN',
        dashboard:  'dashboardA.html',
        navLinks: [
            { href: 'dashboardA.html', texto: 'Inicio' },
            { href: '#',               texto: 'Usuarios' },
            { href: '#',               texto: 'Estadísticas' },
            { href: '#',               texto: 'Reportes' },
            { href: '#',               texto: 'Configuración' },
            { href: 'perfil.html',     texto: 'Perfil', activo: true }
        ]
    }
};

// funciones de utilidad

/** Formatea una fecha ISO o yyyy-mm-dd a dd/mm/yyyy */
function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    // Puede venir como "2000-01-10" o "2000-01-10T00:00:00.000Z"
    const partes = fechaStr.split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/** Convierte dd/mm/yyyy → yyyy-mm-dd para el input[type=date] */
function fechaParaInput(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('T')[0];
    return partes; // ya viene en yyyy-mm-dd desde la API
}

/** Capitaliza la primera letra de cada palabra */
function capitalizar(str) {
    if (!str) return '—';
    return str.replace(/\b\w/g, l => l.toUpperCase());
}

/** Muestra/oculta clases .oculto */
function mostrar(id)  { document.getElementById(id)?.classList.remove('oculto'); }
function ocultar(id)  { document.getElementById(id)?.classList.add('oculto'); }

/** Error de campo */
function mostrarErrCampo(id, msg) {
    const span = document.getElementById(id);
    if (!span) return;
    span.textContent = msg;
    span.classList.add('visible');
    const input = span.previousElementSibling?.tagName === 'INPUT' || 
                  span.previousElementSibling?.tagName === 'TEXTAREA'
        ? span.previousElementSibling
        : span.closest('.campo-grupo')?.querySelector('input, textarea, select');
    if (input) { input.classList.add('input-invalido'); input.classList.remove('input-valido'); }
}

function limpiarErrCampo(id) {
    const span = document.getElementById(id);
    if (!span) return;
    span.textContent = '';
    span.classList.remove('visible');
    const input = span.closest('.campo-grupo')?.querySelector('input, textarea, select');
    if (input) { input.classList.remove('input-invalido', 'input-valido'); }
}

function marcarCampoValido(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.classList.remove('input-invalido');
    input.classList.add('input-valido');
}

function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// inicializa el módulo de perfil

function inicializarPerfil() {
    // 1. Verificar sesión
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user) {
        window.location.href = 'index.html';
        return;
    }

    const rol    = user.role || 'user';
    const config = CONFIG_ROL[rol] || CONFIG_ROL.user;

    // 2. Aplicar clase de rol al body (para variables CSS)
    document.body.classList.add(config.clase);

    // 3. Construir nav dinámico
    construirNav(config, user);

    // 4. Intentar obtener datos frescos de la API; si falla, usar localStorage
    cargarDatosUsuario(token, user, config);

    // 5. Botón "Editar Perfil" toggle
    document.getElementById('btn-editar-toggle')?.addEventListener('click', activarModoEdicion);
    document.getElementById('btn-cancelar-info')?.addEventListener('click', cancelarEdicion);

    // 6. Formulario info personal
    document.getElementById('form-info')?.addEventListener('submit', guardarInfoPersonal);

    // 7. Formulario cambiar contraseña
    document.getElementById('form-pass')?.addEventListener('submit', cambiarContrasena);

    // 8. Botones mostrar/ocultar contraseña
    document.querySelectorAll('.btn-ver-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input    = document.getElementById(targetId);
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.textContent = input.type === 'password' ? '👁' : '🙈';
        });
    });

    // limpieza en tiempo real
    [
        ['edit-nombre',    'err-nombre'],
        ['edit-fecha',     'err-fecha'],
        ['pass-actual',    'err-pass-actual'],
        ['pass-nueva',     'err-pass-nueva'],
        ['pass-confirmar', 'err-pass-confirmar'],
    ].forEach(([inputId, errId]) => {
        document.getElementById(inputId)?.addEventListener('input', () => {
            limpiarErrCampo(errId);
        });
    });
}

// construye el nav según el rol

function construirNav(config, user) {
    // Header título
    const headerTitulo = document.getElementById('header-titulo');
    if (headerTitulo) headerTitulo.textContent = config.headerTxt;

    // Nav links
    const navLinks = document.getElementById('nav-links');
    if (navLinks) {
        navLinks.innerHTML = config.navLinks.map(link =>
            `<li><a href="${link.href}" ${link.activo ? 'class="active"' : ''}>${link.texto}</a></li>`
        ).join('');
    }

    // Botón "← Dashboard"
    const btnDash = document.getElementById('nav-dashboard');
    if (btnDash) btnDash.href = config.dashboard;

    // Breadcrumb
    const bcInicio = document.getElementById('breadcrumb-inicio');
    if (bcInicio) {
        bcInicio.href = config.dashboard;
        bcInicio.textContent = 'Inicio';
    }
}

// carga datos frescos desde la API o usa los del localStorage

async function cargarDatosUsuario(token, userLocal, config) {
    let user = userLocal;

    try {
        const res = await fetch(`${API_BASE_PERFIL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            // La API puede devolver { ok, data: user } o directamente el user
            user = data.data || data.user || data || userLocal;
            // Actualizamos localStorage con datos frescos
            localStorage.setItem('user', JSON.stringify(user));
        }
    } catch (e) {
        // Sin conexión: usamos datos del localStorage
        console.warn('[Perfil] No se pudo conectar a la API, usando datos locales.');
    }

    renderizarPerfil(user, config);
}

// rellena la interfaz con los datos del usuario

function renderizarPerfil(user, config) {
    const nombre    = capitalizar(user.full_name || user.name || '');
    const email     = (user.email || '').toLowerCase();
    const rol       = user.role || 'user';
    const fechaNac  = formatearFecha(user.birth_date || user.fecha_nacimiento);
    const fechaReg  = formatearFecha(user.created_at || user.fecha_registro);

    // Extraer metadata
    const meta      = user.metadata || user.otros || {};
    const deporte   = meta.sports?.[0]?.name || meta.deporte || '—';
    const infoExtra = meta.info_adicional || meta.otros || '';

    // ---- SIDEBAR ----
    setText('sidebar-nombre',    nombre    || '—');
    setText('sidebar-rol-label', config.rolLabel);
    setText('sidebar-badge',     config.badgeTexto);
    setText('sidebar-email',     email     || '—');
    setText('sidebar-fecha',     fechaNac  || '—');
    setText('sidebar-rol',       capitalizar(rol));
    setText('sidebar-registro',  fechaReg  || '—');

    // ---- VISTA INFO ----
    setText('vista-nombre',   nombre   || '—');
    setText('vista-email',    email    || '—');
    setText('vista-fecha',    fechaNac || '—');
    setText('vista-deporte',  capitalizar(deporte));
    setText('vista-metadata', infoExtra || '—');

    // ---- FORMULARIO (pre-rellenar para cuando se abra) ----
    setVal('edit-nombre',   user.full_name || user.name || '');
    setVal('edit-email',    email);
    setVal('edit-fecha',    user.birth_date || user.fecha_nacimiento || '');
    setVal('edit-deporte',  meta.sports?.[0]?.name || meta.deporte || '');
    setVal('edit-metadata', infoExtra);
}

function setText(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

function setVal(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor || '';
}

// activa y cancela el modo edición

function activarModoEdicion() {
    ocultar('vista-info');
    mostrar('form-info');
    document.getElementById('btn-editar-toggle').textContent = '✕ Cancelar';
    document.getElementById('btn-editar-toggle').onclick = cancelarEdicion;
    // Scroll suave a la sección
    document.getElementById('seccion-info')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelarEdicion() {
    ocultar('form-info');
    mostrar('vista-info');
    ocultar('exito-info');
    ocultar('error-info');
    document.getElementById('btn-editar-toggle').textContent = '✏️ Editar Perfil';
    document.getElementById('btn-editar-toggle').onclick = activarModoEdicion;
    // Limpiar errores
    ['err-nombre','err-email','err-fecha','err-deporte','err-metadata'].forEach(limpiarErrCampo);
}

// validación y guardado de datos personales

function validarInfoPersonal() {
    let valido = true;

    const nombre = document.getElementById('edit-nombre')?.value.trim();
    const fecha  = document.getElementById('edit-fecha')?.value;

    limpiarErrCampo('err-nombre');
    if (!nombre) {
        mostrarErrCampo('err-nombre', 'El nombre es obligatorio.');
        valido = false;
    } else if (nombre.length < 2) {
        mostrarErrCampo('err-nombre', 'El nombre debe tener al menos 2 caracteres.');
        valido = false;
    } else {
        marcarCampoValido('edit-nombre');
    }

    limpiarErrCampo('err-fecha');
    if (!fecha) {
        mostrarErrCampo('err-fecha', 'La fecha de nacimiento es obligatoria.');
        valido = false;
    } else {
        const hoy   = new Date();
        const nacim = new Date(fecha);
        if (nacim > hoy) {
            mostrarErrCampo('err-fecha', 'La fecha no puede ser futura.');
            valido = false;
        } else {
            marcarCampoValido('edit-fecha');
        }
    }

    return valido;
}

async function guardarInfoPersonal(e) {
    e.preventDefault();
    ocultar('exito-info');
    ocultar('error-info');

    if (!validarInfoPersonal()) return;

    const btn = e.target.querySelector('.btn-guardar');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    const token   = localStorage.getItem('token');
    const user    = JSON.parse(localStorage.getItem('user') || '{}');
    const deporte = document.getElementById('edit-deporte')?.value.trim();
    const metaOld = user.metadata || {};

    // Solo se envían los campos editables — email y rol no se pueden cambiar
    const body = {
        full_name:  document.getElementById('edit-nombre').value.trim(),
        birth_date: document.getElementById('edit-fecha').value,
        metadata: {
            ...metaOld,
            sports: deporte
                ? [{ name: deporte, frequency_per_week: metaOld.sports?.[0]?.frequency_per_week || 3 }]
                : metaOld.sports || [],
            info_adicional: document.getElementById('edit-metadata')?.value.trim() || null
        }
    };

    try {
        // Editar perfil del usuario logueado
        const res = await fetch(`${API_BASE_PERFIL}/api/auth/me`, {
            method:  'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (res.ok || data.ok) {
            // Actualizar localStorage
            const userActualizado = { ...user, ...body };
            localStorage.setItem('user', JSON.stringify(userActualizado));

            const config = CONFIG_ROL[user.role] || CONFIG_ROL.user;
            renderizarPerfil(userActualizado, config);

            mostrar('exito-info');
            setTimeout(() => ocultar('exito-info'), 4000);
            cancelarEdicion();
        } else {
            const errEl = document.getElementById('error-info');
            if (errEl) {
                errEl.textContent = data.message || 'No se pudo actualizar el perfil.';
                mostrar('error-info');
            }
        }

    } catch (err) {
        console.error('[Perfil] Error al guardar:', err);
        // Actualización local si no hay conexión
        const userActualizado = { ...user, ...body };
        localStorage.setItem('user', JSON.stringify(userActualizado));
        const config = CONFIG_ROL[user.role] || CONFIG_ROL.user;
        renderizarPerfil(userActualizado, config);
        mostrar('exito-info');
        setTimeout(() => ocultar('exito-info'), 4000);
        cancelarEdicion();
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '✓ Guardar cambios'; }
    }
}

// validación y cambio de contraseña

function validarCambioPass() {
    let valido = true;

    const actual     = document.getElementById('pass-actual')?.value.trim();
    const nueva      = document.getElementById('pass-nueva')?.value.trim();
    const confirmar  = document.getElementById('pass-confirmar')?.value.trim();

    limpiarErrCampo('err-pass-actual');
    if (!actual) {
        mostrarErrCampo('err-pass-actual', 'La contraseña actual es obligatoria.');
        valido = false;
    } else {
        marcarCampoValido('pass-actual');
    }

    limpiarErrCampo('err-pass-nueva');
    if (!nueva) {
        mostrarErrCampo('err-pass-nueva', 'La nueva contraseña es obligatoria.');
        valido = false;
    } else if (nueva.length < 8) {
        mostrarErrCampo('err-pass-nueva', 'Mínimo 8 caracteres.');
        valido = false;
    } else if (!/[0-9]/.test(nueva)) {
        mostrarErrCampo('err-pass-nueva', 'Debe incluir al menos un número.');
        valido = false;
    } else if (!/[a-zA-Z]/.test(nueva)) {
        mostrarErrCampo('err-pass-nueva', 'Debe incluir al menos una letra.');
        valido = false;
    } else {
        marcarCampoValido('pass-nueva');
    }

    limpiarErrCampo('err-pass-confirmar');
    if (!confirmar) {
        mostrarErrCampo('err-pass-confirmar', 'Debes confirmar la nueva contraseña.');
        valido = false;
    } else if (nueva && confirmar !== nueva) {
        mostrarErrCampo('err-pass-confirmar', 'Las contraseñas no coinciden.');
        valido = false;
    } else if (confirmar) {
        marcarCampoValido('pass-confirmar');
    }

    return valido;
}

async function cambiarContrasena(e) {
    e.preventDefault();
    ocultar('exito-pass');
    ocultar('error-pass');

    if (!validarCambioPass()) return;

    const btn = e.target.querySelector('.btn-actualizar-pass');
    if (btn) { btn.disabled = true; btn.textContent = 'Actualizando...'; }

    const token  = localStorage.getItem('token');
    const user   = JSON.parse(localStorage.getItem('user') || '{}');

    const body = {
        current_password: document.getElementById('pass-actual').value.trim(),
        new_password:     document.getElementById('pass-nueva').value.trim()
    };

    try {
        // Cambiar contraseña del usuario logueado
        const res = await fetch(`${API_BASE_PERFIL}/api/auth/me/password`, {
            method:  'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();

        if (res.ok || data.ok) {
            mostrar('exito-pass');
            setTimeout(() => ocultar('exito-pass'), 4000);
            // Limpiar campos
            ['pass-actual','pass-nueva','pass-confirmar'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.value = ''; el.type = 'password'; }
                const btnVer = document.querySelector(`[data-target="${id}"]`);
                if (btnVer) btnVer.textContent = '👁';
            });
            ['err-pass-actual','err-pass-nueva','err-pass-confirmar'].forEach(limpiarErrCampo);
        } else {
            const errEl = document.getElementById('error-pass');
            if (errEl) {
                errEl.textContent = data.message || 'No se pudo cambiar la contraseña. Verifica la contraseña actual.';
                mostrar('error-pass');
            }
        }

    } catch (err) {
        console.error('[Perfil] Error al cambiar contraseña:', err);
        const errEl = document.getElementById('error-pass');
        if (errEl) {
            errEl.textContent = 'No se pudo conectar con el servidor.';
            mostrar('error-pass');
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🔒 Actualizar contraseña'; }
    }
}

// arranque
document.addEventListener('DOMContentLoaded', inicializarPerfil);
