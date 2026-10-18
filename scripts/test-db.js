require("dotenv").config();

const pool = require("../src/config/database");

async function testarConexao() {
    try {
        const resultado = await pool.query("SELECT NOW() AS horario");

        console.log("✅ Conexão com o banco funcionando!");
        console.log("Horário do banco:", resultado.rows[0].horario);
    } catch (erro) {
        console.error("❌ Erro na conexão:", erro.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

testarConexao();
