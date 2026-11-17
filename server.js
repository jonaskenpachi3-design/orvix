require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

const requiredEnvironment = ["DATABASE_URL", "JWT_SECRET"];

const missingEnvironment = requiredEnvironment.filter(
    (name) => !process.env[name]?.trim()
);

if (missingEnvironment.length > 0) {
    console.error(
        `Variáveis de ambiente obrigatórias ausentes: ${missingEnvironment.join(", ")}`
    );
    process.exit(1);
}

if (NODE_ENV === "production" && process.env.JWT_SECRET.length < 32) {
    console.error("JWT_SECRET deve ter pelo menos 32 caracteres em produção.");
    process.exit(1);
}

// Frontend build path (Angular output)
const FRONTEND_DIST = path.join(__dirname, "frontend", "dist", "orvix-frontend");

if (NODE_ENV === "production" && !fs.existsSync(path.join(FRONTEND_DIST, "index.html"))) {
    console.error(
        `Build do frontend não encontrado em ${FRONTEND_DIST}. Execute o build do Angular antes de iniciar.`
    );
    process.exit(1);
}

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

const installmentRoutes =
    require("./src/routes/installmentRoutes");

const aiRoutes =
    require("./src/routes/aiRoutes");


// ========================================
// APLICAÇÃO
// ========================================

const app = express();


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
// Em produção, CORS_ORIGIN restringe o acesso à origem configurada.
// Sem ela, o navegador só poderá fazer chamadas same-origin.

const configuredCorsOrigin = process.env.CORS_ORIGIN?.trim();
const corsOptions = NODE_ENV === "production"
    ? { origin: configuredCorsOrigin || false }
    : { origin: true };

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
// ARQUIVOS ESTÁTICOS (Frontend Angular)
// ========================================

// Serve Angular build in production
if (NODE_ENV === "production") {
    // Explicit route for root to serve index.html with no-cache
    app.get('/', (req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
    // Explicit routes for other no-cache files
    app.get(['/index.html', '/ngsw.json', '/ngsw-worker.js', '/manifest.webmanifest'], (req, res) => {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(path.join(FRONTEND_DIST, req.path));
    });
    // Static files for everything else (hashed assets get long cache)
    app.use(express.static(FRONTEND_DIST, {
        etag: true,
        setHeaders: (res, file) => {
            const filename = file.split(/[\\/]/).pop();
            if (/\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|jpeg|gif|svg|ico)$/.test(filename)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
        }
    }));
}


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


app.use(
    "/api/installments",
    installmentRoutes
);


app.use(
    "/api/ai",
    aiRoutes
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
                    "connected",

                aiConfigured:
                    Boolean(process.env.ANTHROPIC_API_KEY)
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
                    "disconnected",

                aiConfigured:
                    Boolean(process.env.ANTHROPIC_API_KEY)
            });
        }
    }
);


// ========================================
// PÁGINA INICIAL & SPA FALLBACK
// ========================================

// In production, serve Angular index.html for all non-API routes
if (NODE_ENV === "production") {
    // Use middleware to serve SPA for non-API routes
    app.use((req, res, next) => {
        // Skip API routes
        if (req.path.startsWith("/api")) {
            return next();
        }
        res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
} else {
    // Development: serve login.html for root
    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "public", "login.html"));
    });
}


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
    "0.0.0.0",
    () => {
        console.log(
            `Servidor Orvix rodando na porta ${PORT}`
        );

        console.log(
            `Ambiente: ${NODE_ENV}`
        );
    }
);
