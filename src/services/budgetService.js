const pool = require("../config/database");

async function getBudgets(userId, month) {
    const result = await pool.query(
        `
        SELECT
            b.id,
            b.amount,
            b.month,
            b.category_id,
            c.name AS category_name,
            c.type AS category_type
        FROM budgets b
        INNER JOIN categories c
            ON c.id = b.category_id
        WHERE b.user_id = $1
          AND b.month = $2
        ORDER BY c.name ASC
        `,
        [userId, month]
    );

    return result.rows;
}

async function getBudgetById(userId, budgetId) {
    const result = await pool.query(
        `
        SELECT
            b.id,
            b.amount,
            b.month,
            b.category_id,
            c.name AS category_name,
            c.type AS category_type
        FROM budgets b
        INNER JOIN categories c
            ON c.id = b.category_id
        WHERE b.id = $1
          AND b.user_id = $2
        `,
        [budgetId, userId]
    );

    return result.rows[0] || null;
}

async function createBudget(
    userId,
    categoryId,
    amount,
    month
) {
    const categoryResult = await pool.query(
        `
        SELECT id, name, type
        FROM categories
        WHERE id = $1
          AND user_id = $2
        `,
        [categoryId, userId]
    );

    if (categoryResult.rows.length === 0) {
        throw new Error("Categoria não encontrada.");
    }

    const category = categoryResult.rows[0];

    if (category.type !== "expense") {
        throw new Error(
            "Orçamentos só podem ser criados para categorias de despesas."
        );
    }

    const existingBudget = await pool.query(
        `
        SELECT id
        FROM budgets
        WHERE user_id = $1
          AND category_id = $2
          AND month = $3
        `,
        [userId, categoryId, month]
    );

    if (existingBudget.rows.length > 0) {
        throw new Error(
            "Já existe um orçamento para esta categoria neste mês."
        );
    }

    const result = await pool.query(
        `
        INSERT INTO budgets (
            user_id,
            category_id,
            amount,
            month
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            category_id,
            amount,
            month
        `,
        [
            userId,
            categoryId,
            amount,
            month
        ]
    );

    return {
        ...result.rows[0],
        category_name: category.name
    };
}

async function updateBudget(
    userId,
    budgetId,
    categoryId,
    amount,
    month
) {
    const budget = await getBudgetById(
        userId,
        budgetId
    );

    if (!budget) {
        throw new Error("Orçamento não encontrado.");
    }

    const categoryResult = await pool.query(
        `
        SELECT id, name, type
        FROM categories
        WHERE id = $1
          AND user_id = $2
        `,
        [categoryId, userId]
    );

    if (categoryResult.rows.length === 0) {
        throw new Error("Categoria não encontrada.");
    }

    const category = categoryResult.rows[0];

    if (category.type !== "expense") {
        throw new Error(
            "Orçamentos só podem ser criados para categorias de despesas."
        );
    }

    const duplicateBudget = await pool.query(
        `
        SELECT id
        FROM budgets
        WHERE user_id = $1
          AND category_id = $2
          AND month = $3
          AND id <> $4
        `,
        [
            userId,
            categoryId,
            month,
            budgetId
        ]
    );

    if (duplicateBudget.rows.length > 0) {
        throw new Error(
            "Já existe um orçamento para esta categoria neste mês."
        );
    }

    const result = await pool.query(
        `
        UPDATE budgets
        SET
            category_id = $1,
            amount = $2,
            month = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
          AND user_id = $5
        RETURNING
            id,
            category_id,
            amount,
            month
        `,
        [
            categoryId,
            amount,
            month,
            budgetId,
            userId
        ]
    );

    return {
        ...result.rows[0],
        category_name: category.name
    };
}

async function deleteBudget(
    userId,
    budgetId
) {
    const result = await pool.query(
        `
        DELETE FROM budgets
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [budgetId, userId]
    );

    if (result.rows.length === 0) {
        throw new Error("Orçamento não encontrado.");
    }

    return result.rows[0];
}

async function getBudgetUsage(
    userId,
    month
) {
    const result = await pool.query(
        `
        SELECT
            b.id,
            b.amount AS budget_amount,
            b.month,
            b.category_id,
            c.name AS category_name,

            COALESCE(
                SUM(
                    CASE
                        WHEN t.type = 'expense'
                        THEN t.amount
                        ELSE 0
                    END
                ),
                0
            ) AS spent_amount

        FROM budgets b

        INNER JOIN categories c
            ON c.id = b.category_id

        LEFT JOIN transactions t
            ON t.category_id = b.category_id
            AND t.user_id = b.user_id
            AND t.transaction_date >= b.month
            AND t.transaction_date < (
                b.month + INTERVAL '1 month'
            )

        WHERE b.user_id = $1
          AND b.month = $2

        GROUP BY
            b.id,
            b.amount,
            b.month,
            b.category_id,
            c.name

        ORDER BY
            c.name ASC
        `,
        [userId, month]
    );

    return result.rows.map((budget) => {
        const budgetAmount = Number(
            budget.budget_amount
        );

        const spentAmount = Number(
            budget.spent_amount
        );

        const remainingAmount =
            budgetAmount - spentAmount;

        const percentage =
            budgetAmount > 0
                ? (spentAmount / budgetAmount) * 100
                : 0;

        let status = "within";

        if (percentage >= 100) {
            status = "exceeded";
        } else if (percentage >= 80) {
            status = "near_limit";
        } else if (percentage >= 50) {
            status = "attention";
        }

        return {
            id: budget.id,
            category_id: budget.category_id,
            category_name: budget.category_name,
            month: budget.month,
            budget_amount: budgetAmount,
            spent_amount: spentAmount,
            remaining_amount: remainingAmount,
            percentage: Number(
                percentage.toFixed(2)
            ),
            status
        };
    });
}

module.exports = {
    getBudgets,
    getBudgetById,
    createBudget,
    updateBudget,
    deleteBudget,
    getBudgetUsage
};