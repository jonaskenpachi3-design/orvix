const { Pool } = require("pg");

const isProduction =
    process.env.NODE_ENV === "production";

const pool = new Pool({
    connectionString:
        process.env.DATABASE_URL,

    ssl: isProduction
        ? {
            rejectUnauthorized: false
        }
        : false,

    max: isProduction
        ? 10
        : 5,

    idleTimeoutMillis: 30000,

    connectionTimeoutMillis: 5000
});


// ========================================
// ERRO DO POOL
// ========================================

pool.on(
    "error",
    (error) => {

        console.error(
            "Erro inesperado no PostgreSQL:",
            error.message
        );

    }
);


module.exports = pool;