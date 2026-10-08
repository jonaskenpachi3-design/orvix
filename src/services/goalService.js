const pool = require("../config/database");


async function createGoal(
    userId,
    name,
    targetAmount,
    currentAmount,
    deadline
) {

    const result = await pool.query(
        `
        INSERT INTO goals (
            user_id,
            name,
            target_amount,
            current_amount,
            deadline
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id,
            user_id,
            name,
            target_amount,
            current_amount,
            deadline,
            created_at
        `,
        [
            userId,
            name,
            targetAmount,
            currentAmount || 0,
            deadline || null
        ]
    );

    return result.rows[0];
}


async function getGoalsByUser(userId) {

    const result = await pool.query(
        `
        SELECT
            id,
            name,
            target_amount,
            current_amount,
            deadline,
            created_at,
            updated_at
        FROM goals
        WHERE user_id = $1
        ORDER BY
            deadline ASC NULLS LAST,
            created_at DESC
        `,
        [userId]
    );

    return result.rows;
}


async function getGoalById(
    userId,
    goalId
) {

    const result = await pool.query(
        `
        SELECT
            id,
            name,
            target_amount,
            current_amount,
            deadline,
            created_at,
            updated_at
        FROM goals
        WHERE id = $1
          AND user_id = $2
        `,
        [
            goalId,
            userId
        ]
    );

    return result.rows[0];
}


async function updateGoal(
    userId,
    goalId,
    name,
    targetAmount,
    currentAmount,
    deadline
) {

    const result = await pool.query(
        `
        UPDATE goals
        SET
            name = $1,
            target_amount = $2,
            current_amount = $3,
            deadline = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
          AND user_id = $6
        RETURNING
            id,
            name,
            target_amount,
            current_amount,
            deadline,
            updated_at
        `,
        [
            name,
            targetAmount,
            currentAmount,
            deadline || null,
            goalId,
            userId
        ]
    );

    return result.rows[0];
}


async function deleteGoal(
    userId,
    goalId
) {

    const result = await pool.query(
        `
        DELETE FROM goals
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [
            goalId,
            userId
        ]
    );

    return result.rows[0];
}


module.exports = {
    createGoal,
    getGoalsByUser,
    getGoalById,
    updateGoal,
    deleteGoal
};