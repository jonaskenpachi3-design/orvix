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
    transactionDate
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
            transaction_date
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            user_id,
            category_id,
            description,
            amount,
            type,
            transaction_date,
            created_at
        `,
        [
            userId,
            categoryId || null,
            description,
            amount,
            type,
            transactionDate
        ]
    );

    return result.rows[0];
}


async function getTransactionsByUser(userId) {
    const result = await pool.query(
        `
        SELECT
            id,
            category_id,
            description,
            amount,
            type,
            transaction_date,
            created_at
        FROM transactions
        WHERE user_id = $1
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
    transactionDate
) {
    await assertCategoryBelongsToUser(userId, categoryId);

    const result = await pool.query(
        `
        UPDATE transactions
        SET
            category_id = $1,
            description = $2,
            amount = $3,
            type = $4,
            transaction_date = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
          AND user_id = $7
        RETURNING
            id,
            category_id,
            description,
            amount,
            type,
            transaction_date,
            updated_at
        `,
        [
            categoryId || null,
            description,
            amount,
            type,
            transactionDate,
            transactionId,
            userId
        ]
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