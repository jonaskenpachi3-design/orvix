const authService = require("../services/authService");

async function register(req, res) {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Nome, e-mail e senha são obrigatórios."
            });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({
                error: "O nome deve ter pelo menos 2 caracteres."
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "A senha deve ter pelo menos 6 caracteres."
            });
        }

        const user = await authService.registerUser(
            name.trim(),
            email.trim().toLowerCase(),
            password
        );

        return res.status(201).json({
            message: "Usuário criado com sucesso.",
            user
        });

    } catch (error) {
        console.error("Erro no cadastro:", error);

        if (error.message === "E-mail já cadastrado.") {
            return res.status(409).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "E-mail e senha são obrigatórios."
            });
        }

        const result = await authService.loginUser(
            email.trim().toLowerCase(),
            password
        );

        return res.status(200).json(result);

    } catch (error) {
        console.error("Erro no login:", error);

        if (error.message === "Credenciais inválidas.") {
            return res.status(401).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Erro interno do servidor."
        });
    }
}


module.exports = {
    register,
    login
};