document.addEventListener('submit', async (e) => {
    // Verificamos qué formulario se está enviando
    const formId = e.target.id;
    const isLoginForm = formId === 'formAdmin' || formId === 'formUser' || formId === 'formCoach';

    // ==========================================
    // PARTE 1: LÓGICA DE LOGIN
    // ==========================================
    if (isLoginForm) {
        e.preventDefault(); 

        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const errorMsg = document.getElementById('error-msg');

        const emailValue = emailInput.value.trim();
        const passValue = passInput.value.trim();

        try {
            // Consumo de API idéntico a la imagen de tu profe
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailValue,
                    password: passValue
                })
            });

            const dataRes = await response.json();

            // Validamos si la respuesta del backend tiene "ok": true (como en la foto)
            if (dataRes.ok) {
                // Ahora sí, extraemos desde "data" como manda el profesor
                const token = dataRes.data.token;
                const user = dataRes.data.user;

                // Guardamos en localStorage
                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify(user));

                // Redirigimos según el rol
                const routes = {
                    'admin': 'dashboardA.html',
                    'coach': 'dashboardCO.html',
                    'user': 'dashboardC.html'
                };

                if (routes[user.role]) {
                    window.location.href = routes[user.role];
                }

            } else {
                // Si falla (credenciales malas), mostramos el error
                if (errorMsg) {
                    errorMsg.textContent = dataRes.message || "Credenciales incorrectas.";
                    errorMsg.style.display = 'block';
                }
            }

        } catch (error) {
            console.error("Error en la conexión:", error);
            if (errorMsg) {
                errorMsg.textContent = "Error al conectar con el servidor.";
                errorMsg.style.display = 'block';
            }
        }
    }
});