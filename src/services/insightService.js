const pool = require("../config/database");


// ========================================
// RESUMO DO PERÍODO
// ========================================

async function getPeriodSummary(
    userId,
    startDate,
    endDate
) {
    const result = await pool.query(
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
            ) AS total_expense,

            COUNT(*) AS total_transactions

        FROM transactions

        WHERE user_id = $1

          AND transaction_date >= $2

          AND transaction_date <= $3
        `,
        [
            userId,
            startDate,
            endDate
        ]
    );


    const row =
        result.rows[0];


    const income =
        Number(
            row.total_income
        );


    const expense =
        Number(
            row.total_expense
        );


    return {
        income,
        expense,
        balance:
            income - expense,

        transactions:
            Number(
                row.total_transactions
            )
    };
}


// ========================================
// DESPESAS POR CATEGORIA
// ========================================

async function getCategoryExpenses(
    userId,
    startDate,
    endDate
) {
    const result = await pool.query(
        `
        SELECT

            c.name AS category_name,

            COALESCE(
                SUM(t.amount),
                0
            ) AS total

        FROM transactions t

        INNER JOIN categories c
            ON c.id = t.category_id

        WHERE t.user_id = $1

          AND t.type = 'expense'

          AND t.transaction_date >= $2

          AND t.transaction_date <= $3

        GROUP BY
            c.name

        ORDER BY
            total DESC
        `,
        [
            userId,
            startDate,
            endDate
        ]
    );


    return result.rows.map(
        row => ({
            category_name:
                row.category_name,

            total:
                Number(
                    row.total
                )
        })
    );
}


// ========================================
// GERAR INSIGHT DE ECONOMIA
// ========================================

function generateSavingsInsight(
    summary
) {
    if (summary.income <= 0) {

        return null;
    }


    const savingsRate =
        (
            summary.balance /
            summary.income
        ) * 100;


    if (savingsRate < 0) {

        return {
            type: "negative",
            icon: "⚠️",
            title:
                "Despesas acima das receitas",
            message:
                `Você gastou ${formatCurrency(
                    Math.abs(
                        summary.balance
                    )
                )} a mais do que recebeu no período.`
        };
    }


    if (savingsRate < 10) {

        return {
            type: "warning",
            icon: "⚠️",
            title:
                "Margem de economia baixa",
            message:
                `Sua taxa de economia foi de ${savingsRate.toFixed(
                    1
                )}%. Existe pouco espaço entre suas receitas e despesas.`
        };
    }


    if (savingsRate < 20) {

        return {
            type: "positive",
            icon: "💰",
            title:
                "Você está economizando",
            message:
                `Você economizou ${formatCurrency(
                    summary.balance
                )}, equivalente a ${savingsRate.toFixed(
                    1
                )}% das suas receitas.`
        };
    }


    return {
        type: "excellent",
        icon: "🚀",
        title:
            "Excelente taxa de economia",
        message:
            `Você economizou ${formatCurrency(
                summary.balance
            )}, equivalente a ${savingsRate.toFixed(
                1
            )}% das suas receitas.`
    };
}


// ========================================
// GERAR INSIGHT DE CATEGORIA
// ========================================

function generateCategoryInsight(
    categories
) {
    if (!categories.length) {

        return null;
    }


    const totalExpenses =
        categories.reduce(
            (
                total,
                category
            ) =>
                total +
                category.total,
            0
        );


    if (totalExpenses <= 0) {

        return null;
    }


    const largestCategory =
        categories[0];


    const percentage =
        (
            largestCategory.total /
            totalExpenses
        ) * 100;


    return {
        type:
            percentage >= 50
                ? "warning"
                : "info",

        icon:
            percentage >= 50
                ? "⚠️"
                : "📊",

        title:
            "Maior categoria de gasto",

        message:
            `A categoria ${largestCategory.category_name} representa ${percentage.toFixed(
                1
            )}% das suas despesas, totalizando ${formatCurrency(
                largestCategory.total
            )}.`
    };
}


// ========================================
// FORMATAÇÃO
// ========================================

function formatCurrency(
    value
) {
    return Number(value)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}


// ========================================
// INSIGHTS FINANCEIROS
// ========================================

async function getFinancialInsights(
    userId,
    startDate,
    endDate
) {
    const [
        summary,
        categories
    ] = await Promise.all([

        getPeriodSummary(
            userId,
            startDate,
            endDate
        ),

        getCategoryExpenses(
            userId,
            startDate,
            endDate
        )
    ]);


    const insights = [];


    const savingsInsight =
        generateSavingsInsight(
            summary
        );


    if (savingsInsight) {

        insights.push(
            savingsInsight
        );
    }


    const categoryInsight =
        generateCategoryInsight(
            categories
        );


    if (categoryInsight) {

        insights.push(
            categoryInsight
        );
    }


    return {
        period: {
            start_date:
                startDate,

            end_date:
                endDate
        },

        summary: {
            income:
                summary.income,

            expense:
                summary.expense,

            balance:
                summary.balance,

            transactions:
                summary.transactions
        },

        insights,

        top_categories:
            categories.slice(
                0,
                5
            )
    };
}


// ========================================
// EXPORT
// ========================================

module.exports = {
    getFinancialInsights
};