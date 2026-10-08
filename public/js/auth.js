const form = document.getElementById("login-form");
const message = document.getElementById("message");
const button = document.getElementById("login-button");

function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    button.disabled = true;
    button.textContent = "Entrando...";
    message.className = "message";

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Erro ao realizar login.");
        }

        const user = data.user || {
            name: data.name || data.username || data.full_name || "Usuário",
            email: data.email || ""
        };

        const resolvedName = user.name || user.username || user.full_name || "Usuário";

        localStorage.setItem("orvix_token", data.token);
        localStorage.setItem("orvix_user", JSON.stringify({
            ...user,
            name: resolvedName
        }));
        localStorage.setItem("orvix_user_name", resolvedName);

        if (user.email) {
            localStorage.setItem("orvix_user_email", user.email);
        }

        showMessage("Login realizado com sucesso!", "success");

        setTimeout(() => {
            window.location.href = "/dashboard.html";
        }, 500);
    } catch (error) {
        showMessage(error.message, "error");
        button.disabled = false;
        button.textContent = "Entrar";
    }
});
