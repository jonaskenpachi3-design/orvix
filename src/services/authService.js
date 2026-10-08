const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

async function registerUser(name, email, password) {
    const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error("E-mail já cadastrado.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await pool.query(
        `
        INSERT INTO users (name, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at
        `,
        [name, email, hashedPassword]
    );

    return result.rows[0];
}

async function loginUser(email, password) {
    const result = await pool.query(
        `
        SELECT id, name, email, password
        FROM users
        WHERE email = $1
        `,
        [email]
    );

    if (result.rows.length === 0) {
        throw new Error("Credenciais inválidas.");
    }

    const user = result.rows[0];

    const passwordMatches = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatches) {
        throw new Error("Credenciais inválidas.");
    }

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    };
}

module.exports = {
    registerUser,
    loginUser
};