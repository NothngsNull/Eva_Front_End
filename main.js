const users = [
    { user: "user1@sportclub.cl", password: "1234", role: "user", name: "Juan Pérez" },
    { user: "user2@sportclub.cl", password: "1234", role: "user", name: "María López" },
    { user: "coach1@sportclub.cl", password: "1234", role: "coach", name: "Roberto Coach" },
    { user: "coach2@sportclub.cl", password: "1234", role: "coach", name: "Ana Entrenadora" },
    { user: "admin1@sportclub.cl", password: "1234", role: "admin", name: "Admin Root" },
    { user: "admin2@sportclub.cl", password: "1234", role: "admin", name: "Soporte Técnico" }
];

// Usamos el evento 'submit' directamente en el documento para que no falle
document.addEventListener('submit', (e) => {
    // 1. BLOQUEO TOTAL: Evita que el formulario haga cualquier cosa por su cuenta
    e.preventDefault(); 

    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-msg');

    // Limpiamos espacios
    const emailValue = emailInput.value.trim();
    const passValue = passInput.value.trim();

    // 2. BUSCADOR: Verificamos si existe en nuestro JSON
    const found = users.find(u => u.user === emailValue && u.password === passValue);

    if (found) {
        // Si todo está bien, guardamos y redirigimos
        localStorage.setItem("user", JSON.stringify(found));
        
        const routes = {
            'admin': 'dashboardA.html',
            'coach': 'dashboardCO.html',
            'user': 'dashboardC.html'
        };
        
        window.location.href = routes[found.role];
    } else {
        // 3. ERROR: Aquí es donde aparecen las letras rojas
        // Si no se encuentra el usuario, solo mostramos el texto y NO redirigimos
        if (errorMsg) {
            errorMsg.style.display = 'block';
        }
    }
});