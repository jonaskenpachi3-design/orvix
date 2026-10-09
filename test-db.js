
require("dotenv").config();

const pool = require("./db");

async function testarConexao() {
  try {
    const resultado = await pool.query("SELECT NOW() AS horario");

    console.log("✅ Conexão com Supabase funcionando!");
    console.log("Horário do banco:", resultado.rows[0].horario);
  } catch (erro) {
    console.error("❌ Erro na conexão:", erro.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testarConexao();
