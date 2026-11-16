require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false
});

async function runMigrations() {
    const migrationsDir = path.join(__dirname, "..", "db", "migrations");

    if (!fs.existsSync(migrationsDir)) {
        console.log("Pasta de migrações não existe:", migrationsDir);
        return;
    }

    // Cria tabela de controle de migrações se não existir
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith(".sql"))
        .sort();

    console.log(`Encontradas ${files.length} migração(ões)`);

    for (const file of files) {
        // Verifica se já foi aplicada
        const check = await pool.query(
            "SELECT 1 FROM schema_migrations WHERE filename = $1",
            [file]
        );

        if (check.rows.length > 0) {
            console.log(`  ⏭  ${file} - já aplicada`);
            continue;
        }

        console.log(`  ▶  Aplicando ${file}...`);

        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

        const client = await pool.connect();
        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query(
                "INSERT INTO schema_migrations (filename) VALUES ($1)",
                [file]
            );
            await client.query("COMMIT");
            console.log(`  ✓  ${file} - aplicada com sucesso`);
        } catch (error) {
            await client.query("ROLLBACK");
            console.error(`  ✗  ${file} - ERRO:`, error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    console.log("\n✅ Todas as migrações foram aplicadas!");
    await pool.end();
}

runMigrations().catch(err => {
    console.error("Falha ao rodar migrações:", err);
    process.exit(1);
});