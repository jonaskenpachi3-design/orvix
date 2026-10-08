const pool = require("../config/database");

async function getDashboard(userId, period = "month") {

    const validPeriods = [
        "month",
        "previous_month",
        "3_months",
        "6_months",
        "year"
    ];

    if (!validPeriods.includes(period)) {
        period = "month";
    }

    const now = new Date();

    let startDate;
    let endDate;

    if (period === "month") {

        startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        );

    } else if (period === "previous_month") {

        startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            1
        );

        endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            0
        );

    } else if (period === "3_months") {

        startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 2,
            1
        );

        endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        );

    } else if (period === "6_months") {

        startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 5,
            1
        );

        endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0
        );

    } else if (period === "year") {

        startDate = new Date(
            now.getFullYear(),
            0,
            1
        );

        endDate = new Date(
            now.getFullYear(),
            11,
            31
        );
    }

    const formatDate = (date) => {

        return date.toISOString()
            .split("T")[0];
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);


    /* ============================================
       RESUMO FINANCEIRO
    ============================================ */

    const summaryResult = await pool.query(
        `
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN type = 'income'
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ) AS total_income,

            COALESCE(
                SUM(
                    CASE
                        WHEN type = 'expense'
                        THEN amount
                        ELSE 0
                    END
                ),
                0
            ) AS total_expense

        FROM transactions

        WHERE user_id = $1

        AND transaction_date
        BETWEEN $2 AND $3
        `,
        [
            userId,
            start,
            end
        ]
    );


    const totalIncome =
        Number(summaryResult.rows[0].total_income);

    const totalExpense =
        Number(summaryResult.rows[0].total_expense);

    const balance =
        totalIncome - totalExpense;


    /* ============================================
       TAXA DE POUPANÇA
    ============================================ */

    const savingsRate =
        totalIncome > 0
            ? Number(
                (
                    (balance / totalIncome) *
                    100
                ).toFixed(1)
            )
            : 0;


    /* ============================================
       SAÚDE FINANCEIRA
    ============================================ */

    let financialHealth =
        "critical";

    let financialHealthLabel =
        "Crítica";

    if (totalIncome === 0) {

        financialHealth =
            "critical";

        financialHealthLabel =
            "Sem receitas";

    } else if (balance < 0) {

        financialHealth =
            "critical";

        financialHealthLabel =
            "Crítica";

    } else if (savingsRate < 10) {

        financialHealth =
            "attention";

        financialHealthLabel =
            "Atenção";

    } else if (savingsRate < 20) {

        financialHealth =
            "good";

        financialHealthLabel =
            "Boa";

    } else {

        financialHealth =
            "excellent";

        financialHealthLabel =
            "Excelente";
    }


    /* ============================================
       PRINCIPAL CATEGORIA DE GASTO
    ============================================ */

    const topCategoryResult =
        await pool.query(
            `
            SELECT
                c.name AS category_name,
                COALESCE(
                    SUM(t.amount),
                    0
                ) AS total

            FROM transactions t

            LEFT JOIN categories c
                ON c.id = t.category_id

            WHERE t.user_id = $1

            AND t.type = 'expense'

            AND t.transaction_date
                BETWEEN $2 AND $3

            GROUP BY c.name

            ORDER BY total DESC

            LIMIT 1
            `,
            [
                userId,
                start,
                end
            ]
        );


    let topCategory = null;

    if (topCategoryResult.rows.length > 0) {

        const categoryTotal =
            Number(
                topCategoryResult.rows[0].total
            );

        const percentage =
            totalExpense > 0
                ? Number(
                    (
                        (categoryTotal /
                            totalExpense) *
                        100
                    ).toFixed(1)
                )
                : 0;

        topCategory = {

            name:
                topCategoryResult
                    .rows[0]
                    .category_name ||
                "Sem categoria",

            total:
                categoryTotal,

            percentage
        };
    }


    /* ============================================
       INSIGHT PRINCIPAL
    ============================================ */

    let mainInsight = {

        type: "info",

        icon: "💡",

        title: "Visão financeira",

        message:
            "Continue acompanhando suas finanças."
    };


    if (totalIncome === 0) {

        mainInsight = {

            type: "warning",

            icon: "⚠️",

            title:
                "Nenhuma receita registrada",

            message:
                "Registre suas receitas para começar a acompanhar sua saúde financeira."
        };

    } else if (balance < 0) {

        mainInsight = {

            type: "critical",

            icon: "🚨",

            title:
                "Despesas acima das receitas",

            message:
                `Você gastou R$ ${Math.abs(balance).toFixed(2).replace(".", ",")} a mais do que recebeu no período.`
        };

    } else if (savingsRate < 10) {

        mainInsight = {

            type: "warning",

            icon: "⚠️",

            title:
                "Margem de economia baixa",

            message:
                `Sua taxa de economia está em ${savingsRate}%. Considere revisar suas principais despesas.`
        };

    } else if (savingsRate < 20) {

        mainInsight = {

            type: "good",

            icon: "📈",

            title:
                "Você está economizando",

            message:
                `Sua taxa de economia está em ${savingsRate}%. Continue mantendo suas despesas sob controle.`
        };

    } else {

        mainInsight = {

            type: "excellent",

            icon: "🚀",

            title:
                "Excelente taxa de economia",

            message:
                `Você está economizando ${savingsRate}% das suas receitas.`
        };
    }


    /* ============================================
       COMPARAÇÃO MENSAL
    ============================================ */

    const currentMonthResult =
        await pool.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'income'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS income,

                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'expense'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS expense

            FROM transactions

            WHERE user_id = $1

            AND DATE_TRUNC(
                'month',
                transaction_date
            ) =
                DATE_TRUNC(
                    'month',
                    CURRENT_DATE
                )
            `,
            [userId]
        );


    const previousMonthResult =
        await pool.query(
            `
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'income'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS income,

                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'expense'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS expense

            FROM transactions

            WHERE user_id = $1

            AND DATE_TRUNC(
                'month',
                transaction_date
            ) =
                DATE_TRUNC(
                    'month',
                    CURRENT_DATE - INTERVAL '1 month'
                )
            `,
            [userId]
        );


    const currentIncome =
        Number(
            currentMonthResult.rows[0].income
        );

    const currentExpense =
        Number(
            currentMonthResult.rows[0].expense
        );

    const previousIncome =
        Number(
            previousMonthResult.rows[0].income
        );

    const previousExpense =
        Number(
            previousMonthResult.rows[0].expense
        );


    const calculateVariation =
        (current, previous) => {

            if (previous === 0) {

                return current === 0
                    ? 0
                    : 100;
            }

            return Number(
                (
                    ((current - previous) /
                        previous) *
                    100
                ).toFixed(1)
            );
        };


    const monthlyComparison = {

        current: {

            income:
                currentIncome,

            expense:
                currentExpense
        },

        previous: {

            income:
                previousIncome,

            expense:
                previousExpense
        },

        incomeVariation:
            calculateVariation(
                currentIncome,
                previousIncome
            ),

        expenseVariation:
            calculateVariation(
                currentExpense,
                previousExpense
            )
    };


    /* ============================================
       GASTOS POR CATEGORIA
    ============================================ */

    const categoryResult =
        await pool.query(
            `
            SELECT
                c.name AS category,
                COALESCE(
                    SUM(t.amount),
                    0
                ) AS total

            FROM transactions t

            LEFT JOIN categories c
                ON c.id = t.category_id

            WHERE t.user_id = $1

            AND t.type = 'expense'

            AND t.transaction_date
                BETWEEN $2 AND $3

            GROUP BY c.name

            ORDER BY total DESC
            `,
            [
                userId,
                start,
                end
            ]
        );


    const expensesByCategory =
        categoryResult.rows.map(
            row => ({

                category:
                    row.category ||
                    "Sem categoria",

                total:
                    Number(row.total)
            })
        );


    /* ============================================
       EVOLUÇÃO MENSAL
    ============================================ */

    const evolutionResult =
        await pool.query(
            `
            SELECT

                TO_CHAR(
                    transaction_date,
                    'YYYY-MM'
                ) AS month,

                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'income'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS income,

                COALESCE(
                    SUM(
                        CASE
                            WHEN type = 'expense'
                            THEN amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS expense

            FROM transactions

            WHERE user_id = $1

            AND transaction_date
                BETWEEN $2 AND $3

            GROUP BY
                TO_CHAR(
                    transaction_date,
                    'YYYY-MM'
                )

            ORDER BY month
            `,
            [
                userId,
                start,
                end
            ]
        );


    const monthlyEvolution =
        evolutionResult.rows.map(
            row => ({

                month:
                    row.month,

                income:
                    Number(row.income),

                expense:
                    Number(row.expense)
            })
        );


    /* ============================================
       RETORNO
    ============================================ */

    return {

        period: {

            startDate: start,

            endDate: end,

            period
        },

        summary: {

            totalIncome,

            totalExpense,

            balance,

            savingsRate,

            financialHealth,

            financialHealthLabel
        },

        mainInsight,

        topCategory,

        monthlyComparison,

        expensesByCategory,

        monthlyEvolution
    };
}


module.exports = {

    getDashboard

};