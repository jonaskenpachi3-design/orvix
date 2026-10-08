const pool = require("../config/database");


async function createCategory(userId, name, type) {
    const result = await pool.query(
        `
        INSERT INTO categories (
            user_id,
            name,
            type
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            name,
            type,
            created_at
        `,
        [userId, name, type]
    );

    return result.rows[0];
}


async function getCategoriesByUser(userId) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            type,
            created_at
        FROM categories
        WHERE user_id = $1
        ORDER BY type, name
        `,
        [userId]
    );

    return result.rows;
}


async function updateCategory(userId, categoryId, name, type) {
    const result = await pool.query(
        `
        UPDATE categories
        SET
            name = $1,
            type = $2
        WHERE id = $3
          AND user_id = $4
        RETURNING
            id,
            name,
            type,
            created_at
        `,
        [
            name,
            type,
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