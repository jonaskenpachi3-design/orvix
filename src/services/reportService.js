const pool = require("../config/database");


// ========================================
// RESUMO FINANCEIRO
// ========================================

async function getFinancialSummary(
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


    const summary =
        result.rows[0];


    const totalIncome =
        Number(
            summary.total_income
        );


    const totalExpense =
        Number(
            summary.total_expense
        );


    const balance =
        totalIncome -
        totalExpense;


    return {
        total_income: totalIncome,

        total_expense: totalExpense,

        balance,

        total_transactions:
            Number(
                summary.total_transactions
            )
    };
}


// ========================================
// RECEITAS X DESPESAS POR MÊS
// ========================================

async function getMonthlyEvolution(
    userId,
    startDate,
    endDate
) {
    const result = await pool.query(
        `
        SELECT
            TO_CHAR(
                DATE_TRUNC(
                    'month',
                    transaction_date
                ),
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
          AND transaction_date >= $2
          AND transaction_date <= $3

        GROUP BY
            DATE_TRUNC(
                'month',
                transaction_date
            )

        ORDER BY
            DATE_TRUNC(
                'month',
                transaction_date
            ) ASC
        `,
        [
            userId,
            startDate,
            endDate
        ]
    );


    return result.rows.map(
        row => ({
            month: row.month,

            income:
                Number(
                    row.income
                ),

            expense:
                Number(
                    row.expense
                )
        })
    );
}


// ========================================
// DESPESAS POR CATEGORIA
// ========================================

async function getExpensesByCategory(
    userId,
    startDate,
    endDate
) {
    const result = await pool.query(
        `
        SELECT
            c.id AS category_id,

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
            c.id,
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
            category_id:
                row.category_id,

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
// RELATÓRIO COMPLETO
// ========================================

async function getFinancialReport(
    userId,
    startDate,
    endDate
) {
    const [
        summary,
        monthlyEvolution,
        expensesByCategory
    ] = await Promise.all([
        getFinancialSummary(
            userId,
            startDate,
            endDate
        ),

        getMonthlyEvolution(
            userId,
            startDate,
            endDate
        ),

        getExpensesByCategory(
            userId,
            startDate,
            endDate
        )
    ]);


    return {
        period: {
            start_date: startDate,
            end_date: endDate
        },

        summary,

        monthly_evolution:
            monthlyEvolution,

        expenses_by_category:
            expensesByCategory
    };
}


module.exports = {
    getFinancialSummary,
    getMonthlyEvolution,
    getExpensesByCategory,
    getFinancialReport
};