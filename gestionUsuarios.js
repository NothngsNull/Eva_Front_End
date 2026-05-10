// ============================================================
//  gestionUsuarios.js — Módulo de Gestión de Usuarios
//  Solo accesible para rol 'admin'
//  API: http://localhost:3000
// ============================================================

const API = 'http://localhost:3000';

// Estado global del módulo
let todosLosUsuarios = [];   // Cache de usuarios cargados
let usuarioAEliminar = null; // ID del usuario pendiente de eliminar
let modoEdicion      = false; // true = editando, false = creando

// ============================================================
//  ARRANQUE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar sesión y que sea admin
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user) { window.location.href = 'index.html'; return; }
    if (user.role !== 'admin') {
        // Si no es admin, redirigir a su dashboard
        const rutas = { user: 'dashboardC.html', coach: 'dashboardCO.html' };
        window.location.href = rutas[user.role] || 'index.html';
        return;
    }

    // 2. Mostrar info del admin en sidebar y topbar
    const nombre = user.full_name || user.name || 'Admin';
    const email  = (user.email || '').toLowerCase();
    setText('sidebar-admin-nombre', nombre);
    setText('sidebar-admin-email',  email);
    setText('topbar-admin-nombre',  nombre);
    setText('topbar-admin-email',   email);

    // 3. Cargar lista de usuarios
    cargarUsuarios();

    // 4. Listeners del modal de creación/edición
    document.getElementById('btn-abrir-modal')?.addEventListener('click', abrirModalNuevo);
    document.getElementById('btn-cerrar-modal')?.addEventListener('click', cerrarModal);
    document.getElementById('btn-cancelar-modal')?.addEventListener('click', cerrarModal);
    document.getElementById('form-usuario')?.addEventListener('submit', guardarUsuario);

    // 5. Listeners del modal de eliminación
    document.getElementById('btn-cerrar-eliminar')?.addEventListener('click', cerrarModalEliminar);
    document.getElementById('btn-cancelar-eliminar')?.addEventListener('click', cerrarModalEliminar);
    document.getElementById('btn-confirmar-eliminar')?.addEventListener('click', confirmarEliminar);

    // 6. Cerrar modales al hacer clic fuera
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') cerrarModal();
    });
    document.getElementById('modal-eliminar-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-eliminar-overlay') cerrarModalEliminar();
    });

    // 7. Buscador en tiempo real
    document.getElementById('buscador')?.addEventListener('input', filtrarTabla);

    // 8. Limpieza de errores en tiempo real al escribir
    [
        ['u-nombre', 'err-u-nombre'],
        ['u-email',  'err-u-email'],
        ['u-pass',   'err-u-pass'],
        ['u-pass-confirm', 'err-u-pass-confirm'],
    ].forEach(([inputId, errId]) => {
        document.getElementById(inputId)?.addEventListener('input', () => limpiarErr(errId));
    });

    // 9. Cerrar sesión (lo maneja main.js, pero por si acaso)
    document.querySelectorAll('.cerrar-sesion').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    });
});

// ============================================================
//  UTILIDADES
// ============================================================

function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function mostrarEl(id)  { document.getElementById(id)?.classList.remove('oculto'); }
function ocultarEl(id)  { document.getElementById(id)?.classList.add('oculto'); }

function mostrarErr(id, msg) {
    const span = document.getElementById(id);
    if (!span) return;
    span.textContent = msg;
    span.classList.add('visible');
    // Marcar input anterior como inválido
    const input = span.closest('.campo-grupo')?.querySelector('input, select');
    if (input) { input.classList.add('input-invalido'); input.classList.remove('input-valido'); }
}

function limpiarErr(id) {
    const span = document.getElementById(id);
    if (!span) return;
    span.textContent = '';
    span.classList.remove('visible');
    const input = span.closest('.campo-grupo')?.querySelector('input, select');
    if (input) { input.classList.remove('input-invalido', 'input-valido'); }
}

function marcarValido(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.classList.remove('input-invalido');
    el.classList.add('input-valido');
}

function esEmailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Formatea fecha ISO → dd/mm/yyyy */
function formatFecha(fechaStr) {
    if (!fechaStr) return '—';
    const d = new Date(fechaStr);
    if (isNaN(d)) return fechaStr;
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

/** Crea el HTML del badge de rol */
function badgeRol(rol) {
    const clases = {
        admin: 'gu-badge-admin',
        coach: 'gu-badge-coach',
        user:  'gu-badge-user'
    };
    const clase = clases[rol] || 'gu-badge-user';
    return `<span class="gu-badge ${clase}">${rol}</span>`;
}

/** Devuelve los headers con Authorization */
function authHeaders(extra = {}) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...extra
    };
}

// ============================================================
//  CARGAR LISTA DE USUARIOS
// ============================================================

async function cargarUsuarios() {
    mostrarEl('estado-carga');
    ocultarEl('estado-error');
    ocultarEl('tabla-usuarios');

    try {
        const res = await fetch(`${API}/api/users`, {
            headers: authHeaders()
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                mostrarEstadoError('Sin autorización. Inicia sesión nuevamente.');
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
                return;
            }
            throw new Error(`Error ${res.status}`);
        }

        const data = await res.json();

        // La API puede devolver { ok, data: [...] } o directamente el array
        todosLosUsuarios = Array.isArray(data) ? data
            : Array.isArray(data.data) ? data.data
            : [];

        ocultarEl('estado-carga');
        mostrarEl('tabla-usuarios');
        renderizarTabla(todosLosUsuarios);

    } catch (err) {
        console.error('[GU] Error cargando usuarios:', err);
        ocultarEl('estado-carga');
        mostrarEstadoError('No se pudo cargar la lista de usuarios. Verifica que el backend esté activo.');
    }
}

function mostrarEstadoError(msg) {
    const el = document.getElementById('estado-error');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('oculto');
}

// ============================================================
//  RENDERIZAR TABLA
// ============================================================

function renderizarTabla(usuarios) {
    const tbody = document.getElementById('tbody-usuarios');
    if (!tbody) return;

    if (!usuarios.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="gu-sin-resultados">No se encontraron usuarios.</td></tr>`;
        return;
    }

    tbody.innerHTML = usuarios.map(u => `
        <tr data-id="${u.id}">
            <td><strong>${u.id}</strong></td>
            <td>${u.full_name || u.name || '—'}</td>
            <td style="color:#475569">${(u.email || '').toLowerCase()}</td>
            <td>${badgeRol(u.role)}</td>
            <td style="color:#64748b;font-size:13px">${formatFecha(u.created_at || u.fecha_registro)}</td>
            <td>
                <div class="gu-acciones">
                    <button class="gu-btn-editar"  onclick="abrirModalEditar(${u.id})">✏️ Editar</button>
                    <button class="gu-btn-eliminar" onclick="abrirModalEliminar(${u.id}, '${(u.full_name || u.name || '').replace(/'/g, "\\'")}')">🗑</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================================
//  BUSCADOR
// ============================================================

function filtrarTabla() {
    const q = document.getElementById('buscador')?.value.toLowerCase().trim() || '';

    if (!q) {
        renderizarTabla(todosLosUsuarios);
        return;
    }

    const filtrados = todosLosUsuarios.filter(u =>
        (u.full_name || u.name  || '').toLowerCase().includes(q) ||
        (u.email                || '').toLowerCase().includes(q) ||
        (u.role                 || '').toLowerCase().includes(q) ||
        String(u.id).includes(q)
    );

    renderizarTabla(filtrados);
}

// ============================================================
//  MODAL — NUEVO USUARIO
// ============================================================

function abrirModalNuevo() {
    modoEdicion = false;

    setText('modal-titulo', 'Nuevo Usuario');
    resetFormulario();

    // Mostrar campos de contraseña
    mostrarEl('seccion-pass');

    // Limpiar id oculto
    const idInput = document.getElementById('edit-user-id');
    if (idInput) idInput.value = '';

    mostrarEl('modal-overlay');
}

function cerrarModal() {
    ocultarEl('modal-overlay');
    ocultarEl('modal-exito');
    ocultarEl('modal-error');
    resetFormulario();
}

function resetFormulario() {
    const form = document.getElementById('form-usuario');
    if (form) form.reset();

    ['err-u-nombre','err-u-email','err-u-rol','err-u-fecha',
     'err-u-pass','err-u-pass-confirm'].forEach(limpiarErr);

    ocultarEl('modal-exito');
    ocultarEl('modal-error');

    const btn = document.getElementById('btn-guardar-modal');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
}

// ============================================================
//  MODAL — EDITAR USUARIO
// ============================================================

function abrirModalEditar(userId) {
    const usuario = todosLosUsuarios.find(u => u.id === userId);
    if (!usuario) return;

    modoEdicion = true;
    setText('modal-titulo', 'Editar Usuario');
    resetFormulario();

    // Ocultar campos de contraseña en edición
    ocultarEl('seccion-pass');

    // Prerellenar campos
    const idInput = document.getElementById('edit-user-id');
    if (idInput) idInput.value = userId;

    setVal('u-nombre', usuario.full_name || usuario.name || '');
    setVal('u-email',  (usuario.email || '').toLowerCase());
    setVal('u-rol',    usuario.role || 'user');
    setVal('u-fecha',  usuario.birth_date || '');

    mostrarEl('modal-overlay');
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

// ============================================================
//  VALIDACIÓN DEL FORMULARIO
// ============================================================

function validarFormulario() {
    let valido = true;

    const nombre = document.getElementById('u-nombre')?.value.trim();
    const email  = document.getElementById('u-email')?.value.trim();
    const pass   = document.getElementById('u-pass')?.value.trim();
    const passC  = document.getElementById('u-pass-confirm')?.value.trim();

    limpiarErr('err-u-nombre');
    if (!nombre) {
        mostrarErr('err-u-nombre', 'El nombre completo es obligatorio.');
        valido = false;
    } else if (nombre.length < 2) {
        mostrarErr('err-u-nombre', 'El nombre debe tener al menos 2 caracteres.');
        valido = false;
    } else {
        marcarValido('u-nombre');
    }

    limpiarErr('err-u-email');
    if (!email) {
        mostrarErr('err-u-email', 'El email es obligatorio.');
        valido = false;
    } else if (!esEmailValido(email)) {
        mostrarErr('err-u-email', 'Email inválido. Ej: juan@demo.cl');
        valido = false;
    } else {
        marcarValido('u-email');
    }

    // Contraseñas solo al crear
    if (!modoEdicion) {
        limpiarErr('err-u-pass');
        if (!pass) {
            mostrarErr('err-u-pass', 'La contraseña es obligatoria.');
            valido = false;
        } else if (pass.length < 8) {
            mostrarErr('err-u-pass', 'Contraseña mínima 8 caracteres.');
            valido = false;
        } else {
            marcarValido('u-pass');
        }

        limpiarErr('err-u-pass-confirm');
        if (!passC) {
            mostrarErr('err-u-pass-confirm', 'Debes confirmar la contraseña.');
            valido = false;
        } else if (pass && passC !== pass) {
            mostrarErr('err-u-pass-confirm', 'Las contraseñas no coinciden.');
            valido = false;
        } else if (passC) {
            marcarValido('u-pass-confirm');
        }
    }

    return valido;
}

// ============================================================
//  GUARDAR USUARIO (Crear o Editar)
// ============================================================

async function guardarUsuario(e) {
    e.preventDefault();
    ocultarEl('modal-exito');
    ocultarEl('modal-error');

    if (!validarFormulario()) return;

    const btn = document.getElementById('btn-guardar-modal');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    const userId = document.getElementById('edit-user-id')?.value;
    const body   = {
        full_name:  document.getElementById('u-nombre').value.trim(),
        email:      document.getElementById('u-email').value.trim().toLowerCase(),
        role:       document.getElementById('u-rol').value,
        birth_date: document.getElementById('u-fecha')?.value || null
    };

    if (!modoEdicion) {
        body.password = document.getElementById('u-pass').value.trim();
    }

    try {
        let res;

        if (modoEdicion) {
            // PUT /api/users/:id
            res = await fetch(`${API}/api/users/${userId}`, {
                method:  'PUT',
                headers: authHeaders(),
                body:    JSON.stringify(body)
            });
        } else {
            // POST /api/users  (crear con cualquier rol, requiere token admin)
            res = await fetch(`${API}/api/users`, {
                method:  'POST',
                headers: authHeaders(),
                body:    JSON.stringify(body)
            });
        }

        const data = await res.json();

        if (res.ok || data.ok) {
            const exito = document.getElementById('modal-exito');
            if (exito) {
                exito.textContent = modoEdicion
                    ? '✓ Usuario actualizado correctamente.'
                    : '✓ Usuario creado correctamente.';
                mostrarEl('modal-exito');
            }

            // Recargar tabla y cerrar modal tras 1.2s
            await cargarUsuarios();
            setTimeout(cerrarModal, 1200);

        } else {
            const errEl = document.getElementById('modal-error');
            if (errEl) {
                const msg = data.message || '';
                // Detectar email duplicado
                if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('exist')) {
                    mostrarErr('err-u-email', 'Este email ya está registrado.');
                } else {
                    errEl.textContent = msg || 'No se pudo guardar el usuario.';
                    mostrarEl('modal-error');
                }
            }
        }

    } catch (err) {
        console.error('[GU] Error al guardar:', err);
        const errEl = document.getElementById('modal-error');
        if (errEl) {
            errEl.textContent = 'Error de conexión con el servidor.';
            mostrarEl('modal-error');
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
    }
}

// ============================================================
//  ELIMINAR USUARIO
// ============================================================

function abrirModalEliminar(userId, nombreUsuario) {
    usuarioAEliminar = userId;
    const msg = document.getElementById('msg-eliminar');
    if (msg) {
        msg.textContent = `¿Estás seguro de que deseas eliminar a "${nombreUsuario}"? Esta acción no se puede deshacer.`;
    }
    ocultarEl('error-eliminar');
    mostrarEl('modal-eliminar-overlay');
}

function cerrarModalEliminar() {
    usuarioAEliminar = null;
    ocultarEl('modal-eliminar-overlay');
    ocultarEl('error-eliminar');
}

async function confirmarEliminar() {
    if (!usuarioAEliminar) return;

    const btn = document.getElementById('btn-confirmar-eliminar');
    if (btn) { btn.disabled = true; btn.textContent = 'Eliminando...'; }

    try {
        const res = await fetch(`${API}/api/users/${usuarioAEliminar}`, {
            method:  'DELETE',
            headers: authHeaders()
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok || data.ok) {
            cerrarModalEliminar();
            await cargarUsuarios();
        } else {
            const errEl = document.getElementById('error-eliminar');
            if (errEl) {
                errEl.textContent = data.message || 'No se pudo eliminar el usuario.';
                mostrarEl('error-eliminar');
            }
        }

    } catch (err) {
        console.error('[GU] Error al eliminar:', err);
        const errEl = document.getElementById('error-eliminar');
        if (errEl) {
            errEl.textContent = 'Error de conexión con el servidor.';
            mostrarEl('error-eliminar');
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🗑 Eliminar'; }
    }
}
