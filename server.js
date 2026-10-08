require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const pool = require("./src/config/database");


// ========================================
// ROTAS
// ========================================

const authRoutes =
    require("./src/routes/authRoutes");

const transactionRoutes =
    require("./src/routes/transactionRoutes");

const categoryRoutes =
    require("./src/routes/categoryRoutes");

const dashboardRoutes =
    require("./src/routes/dashboardRoutes");

const goalRoutes =
    require("./src/routes/goalRoutes");

const budgetRoutes =
    require("./src/routes/budgetRoutes");

const reportRoutes =
    require("./src/routes/reportRoutes");

const insightRoutes =
    require("./src/routes/insightRoutes");


// ========================================
// APLICAÇÃO
// ========================================

const app = express();

const PORT =
    process.env.PORT || 3000;

const NODE_ENV =
    process.env.NODE_ENV || "development";


// ========================================
// CONFIGURAÇÕES DE SEGURANÇA
// ========================================

// Permite identificar corretamente HTTPS
// quando o Orvix estiver atrás do proxy do Render.
if (NODE_ENV === "production") {

    app.set(
        "trust proxy",
        1
    );

}


// Helmet adiciona headers de segurança HTTP.
//
// A Content Security Policy padrão fica desativada
// porque o dashboard utiliza Chart.js via CDN.
app.use(
    helmet({
        contentSecurityPolicy: false
    })
);


// ========================================
// CORS
// ========================================

// Em desenvolvimento, mantém o acesso flexível.
//
// Em produção, se CORS_ORIGIN estiver definido,
// somente essa origem será permitida.

const corsOptions =
    NODE_ENV === "production" &&
    process.env.CORS_ORIGIN
        ? {
            origin:
                process.env.CORS_ORIGIN
        }
        : {
            origin: true
        };

app.use(
    cors(corsOptions)
);


// ========================================
// BODY PARSER
// ========================================

// Limita o tamanho das requisições JSON
// para evitar payloads excessivamente grandes.

app.use(
    express.json({
        limit: "1mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);


// ========================================
// ARQUIVOS ESTÁTICOS
// ========================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// ========================================
// ROTAS DA API
// ========================================

app.use(
    "/api/auth",
    authRoutes
);


app.use(
    "/api/transactions",
    transactionRoutes
);


app.use(
    "/api/categories",
    categoryRoutes
);


app.use(
    "/api/dashboard",
    dashboardRoutes
);


app.use(
    "/api/goals",
    goalRoutes
);


app.use(
    "/api/budgets",
    budgetRoutes
);


app.use(
    "/api/reports",
    reportRoutes
);


app.use(
    "/api/insights",
    insightRoutes
);


// ========================================
// HEALTH CHECK
// ========================================

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await pool.query(
                "SELECT 1"
            );


            return res.status(200).json({
                status: "ok",

                application:
                    "Orvix",

                environment:
                    NODE_ENV,

                database:
                    "connected"
            });

        } catch (error) {

            console.error(
                "Erro no health check:",
                error.message
            );


            return res.status(500).json({
                status: "error",

                application:
                    "Orvix",

                environment:
                    NODE_ENV,

                database:
                    "disconnected"
            });
        }
    }
);


// ========================================
// PÁGINA INICIAL
// ========================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "login.html"
            )
        );
    }
);


// ========================================
// API 404
// ========================================

app.use(
    "/api",
    (req, res) => {

        return res.status(404).json({
            message:
                "Endpoint da API não encontrado."
        });
    }
);


// ========================================
// ERRO GLOBAL
// ========================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Erro interno:",
            error.message
        );


        // Em produção, não expõe detalhes
        // internos do servidor.

        if (NODE_ENV === "production") {

            return res.status(500).json({
                error:
                    "Erro interno do servidor."
            });

        }


        // Em desenvolvimento,
        // mantém detalhes para facilitar debug.

        return res.status(500).json({
            error:
                "Erro interno do servidor.",

            details:
                error.message
        });
    }
);


// ========================================
// SERVIDOR
// ========================================

app.listen(
    PORT,
    () => {

        console.log(
            `Servidor Orvix rodando na porta ${PORT}`
        );

        console.log(
            `Ambiente: ${NODE_ENV}`
        );
    }
);