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
    const {
        includeScheduled = false,
        startDate,
        endDate,
        type,
        categoryId
    } = options;

    const conditions = ["t.user_id = $1"];
    const values = [userId];

    if (!includeScheduled) {
        conditions.push("(t.status = 'paid' OR t.status IS NULL)");
    }

    if (startDate) {
        values.push(startDate);
        conditions.push(`t.transaction_date >= $${values.length}`);
    }

    if (endDate) {
        values.push(endDate);
        conditions.push(`t.transaction_date <= $${values.length}`);
    }

    if (type) {
        values.push(type);
        conditions.push(`t.type = $${values.length}`);
    }

    if (categoryId) {
        values.push(categoryId);
        conditions.push(`t.category_id = $${values.length}`);
    }

    const result = await pool.query(
        `
        SELECT
            t.id,
            t.category_id,
            c.name AS category_name,
            c.type AS category_type,
            c.icon AS category_icon,
            c.color AS category_color,
            t.description,
            t.amount,
            t.type,
            t.transaction_date,
            t.plan_id,
            t.installment_number,
            t.status,
            t.created_at
        FROM transactions t
        LEFT JOIN categories c
            ON c.id = t.category_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY t.transaction_date DESC, t.created_at DESC
        `,
        values
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