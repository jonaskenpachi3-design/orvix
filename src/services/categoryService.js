const pool = require("../config/database");


async function createCategory(userId, name, type, icon = 'bi-tag', color = '#6C757D') {
    const result = await pool.query(
        `
        INSERT INTO categories (
            user_id,
            name,
            type,
            icon,
            color
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id,
            name,
            type,
            icon,
            color,
            created_at
        `,
        [userId, name, type, icon, color]
    );

    return result.rows[0];
}


async function getCategoriesByUser(userId) {
    const result = await pool.query(
        `
        SELECT
            c.id,
            c.name,
            c.type,
            c.icon,
            c.color,
            c.created_at,
            COUNT(t.id)::int AS transaction_count
        FROM categories c
        LEFT JOIN transactions t
            ON t.category_id = c.id
            AND t.user_id = c.user_id
        WHERE c.user_id = $1
        GROUP BY c.id
        ORDER BY c.type, c.name
        `,
        [userId]
    );

    return result.rows;
}


async function updateCategory(userId, categoryId, name, type, icon, color) {
    const result = await pool.query(
        `
        UPDATE categories
        SET
            name = $1,
            type = $2,
            icon = $3,
            color = $4
        WHERE id = $5
          AND user_id = $6
        RETURNING
            id,
            name,
            type,
            icon,
            color,
            created_at
        `,
        [
            name,
            type,
            icon,
            color,
            categoryId,
            userId
        ]
    );

    return result.rows[0];
}


async function deleteCategory(userId, categoryId) {
    const result = await pool.query(
        `
        DELETE FROM categories
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [
            categoryId,
            userId
        ]
    );

    return result.rows[0];
}


module.exports = {
    createCategory,
    getCategoriesByUser,
    updateCategory,
    deleteCategory
};