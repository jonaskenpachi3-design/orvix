const form = document.getElementById("register-form");
const message = document.getElementById("message");
const button = document.getElementById("register-button");

function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (name.length < 2) {
        showMessage("Informe um nome válido.", "error");
        return;
    }

    if (password.length < 6) {
        showMessage("A senha deve ter pelo menos 6 caracteres.", "error");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("As senhas não conferem.", "error");
        return;
    }

    button.disabled = true;
    button.textContent = "Criando conta...";
    message.className = "message";

    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Erro ao criar cadastro.");
        }

        const user = data.user || {
            name,
            email
        };
        const resolvedName = user.name || user.username || user.full_name || name;

        if (data.token) {
            localStorage.setItem("orvix_token", data.token);
        }

        localStorage.setItem("orvix_user", JSON.stringify({
            ...user,
            name: resolvedName
        }));
        localStorage.setItem("orvix_user_name", resolvedName);
        localStorage.setItem("orvix_user_email", email);

        showMessage("Cadastro realizado com sucesso! Redirecionando para o login...", "success");

        setTimeout(() => {
            window.location.href = `/login.html?email=${encodeURIComponent(email)}`;
        }, 900);
    } catch (error) {
        showMessage(error.message, "error");
        button.disabled = false;
        button.textContent = "Criar conta";
    }
});
