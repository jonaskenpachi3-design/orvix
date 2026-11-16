const pool = require("../config/database");

const CATEGORY_NOT_FOUND = "Categoria não encontrada.";

// Garante que a categoria informada pertence ao usuário autenticado.
// Sem categoria (null/undefined) é permitido.
async function assertCategoryBelongsToUser(userId, categoryId) {
    if (!categoryId) {
        return;
    }

    const result = await pool.query(
        `
        SELECT id
        FROM categories
        WHERE id = $1
          AND user_id = $2
        `,
        [categoryId, userId]
    );

    if (result.rows.length === 0) {
        throw new Error(CATEGORY_NOT_FOUND);
    }
}

async function createTransaction(
    userId,
    categoryId,
    description,
    amount,
    type,
    transactionDate,
    planId = null,
    installmentNumber = null,
    status = 'paid'
) {
    await assertCategoryBelongsToUser(userId, categoryId);

    const result = await pool.query(
        `
        INSERT INTO transactions (
            user_id,
            category_id,
            description,
            amount,
            type,
            transaction_date,
            plan_id,
            installment_number,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
            id,
            user_id,
            category_id,
            description,
            amount,
            type,
            transaction_date,
            plan_id,
            installment_number,
            status,
            created_at
        `,
        [
            userId,
            categoryId || null,
            description,
            amount,
            type,
            transactionDate,
            planId,
            installmentNumber,
            status
        ]
    );

    return result.rows[0];
}


async function getTransactionsByUser(userId, options = {}) {
    const { includeScheduled = false } = options;

    const statusFilter = includeScheduled
        ? ""
        : "AND (status = 'paid' OR status IS NULL)";

    const result = await pool.query(
        `
        SELECT
            id,
            category_id,
            description,
            amount,
            type,
            transaction_date,
            plan_id,
            installment_number,
            status,
            created_at
        FROM transactions
        WHERE user_id = $1
        ${statusFilter}
        ORDER BY transaction_date DESC, created_at DESC
        `,
        [userId]
    );

    return result.rows;
}

async function deleteTransaction(userId, transactionId) {
    const result = await pool.query(
        `
        DELETE FROM transactions
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [transactionId, userId]
    );

    return result.rows[0];
}

async function updateTransaction(
    userId,
    transactionId,
    categoryId,
    description,
    amount,
    type,
    transactionDate,
    planId = null,
    installmentNumber = null,
    status = null
) {
    await assertCategoryBelongsToUser(userId, categoryId);

    // Constrói query dinamicamente para campos opcionais
    const updates = [];
    const values = [];
    let paramIndex = 1;

    updates.push(`category_id = $${paramIndex++}`);
    values.push(categoryId || null);

    updates.push(`description = $${paramIndex++}`);
    values.push(description);

    updates.push(`amount = $${paramIndex++}`);
    values.push(amount);

    updates.push(`type = $${paramIndex++}`);
    values.push(type);

    updates.push(`transaction_date = $${paramIndex++}`);
    values.push(transactionDate);

    if (planId !== null) {
        updates.push(`plan_id = $${paramIndex++}`);
        values.push(planId);
    }

    if (installmentNumber !== null) {
        updates.push(`installment_number = $${paramIndex++}`);
        values.push(installmentNumber);
    }

    if (status !== null) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(transactionId, userId);

    const result = await pool.query(
        `
        UPDATE transactions
        SET ${updates.join(", ")}
        WHERE id = $${paramIndex++}
          AND user_id = $${paramIndex}
        RETURNING
            id,
            category_id,
            description,
            amount,
            type,
            transaction_date,
            plan_id,
            installment_number,
            status,
            updated_at
        `,
        values
    );

    return result.rows[0];
}

module.exports = {
    CATEGORY_NOT_FOUND,
    createTransaction,
    getTransactionsByUser,
    deleteTransaction,
    updateTransaction
};