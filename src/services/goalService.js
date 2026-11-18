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

/* =========================
   GOAL CONTRIBUTIONS
========================= */

async function addGoalContribution(
    userId,
    goalId,
    amount,
    description,
    contributionDate,
    installmentNumber,
    installmentsTotal,
    type
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Verifica se a meta existe e pertence ao usuário
        const goalResult = await client.query(
            `SELECT id, target_amount, current_amount FROM goals WHERE id = $1 AND user_id = $2`,
            [goalId, userId]
        );

        if (goalResult.rows.length === 0) {
            throw new Error("Meta não encontrada.");
        }

        const goal = goalResult.rows[0];
        const newCurrentAmount = Number(goal.current_amount) + Number(amount);

        // Valida se não ultrapassa o target (apenas aviso, não bloqueia)
        if (newCurrentAmount > Number(goal.target_amount)) {
            console.warn(`Contribuição faria current_amount (${newCurrentAmount}) exceder target_amount (${goal.target_amount})`);
        }

        // Insere a contribuição
        const contribResult = await client.query(
            `
            INSERT INTO goal_contributions (
                goal_id,
                user_id,
                amount,
                description,
                contribution_date,
                installment_number,
                installments_total,
                type
            )
            VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7, $8)
            RETURNING
                id,
                goal_id,
                user_id,
                amount,
                description,
                contribution_date,
                installment_number,
                installments_total,
                type,
                created_at
            `,
            [
                goalId,
                userId,
                amount,
                description || null,
                contributionDate || null,
                installmentNumber || null,
                installmentsTotal || null,
                type || 'manual'
            ]
        );

        // A trigger update_goal_current_amount atualiza automaticamente current_amount

        await client.query("COMMIT");

        return contribResult.rows[0];

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}


async function getGoalContributions(userId, goalId) {
    const result = await pool.query(
        `
        SELECT
            id,
            goal_id,
            user_id,
            amount,
            description,
            contribution_date,
            installment_number,
            installments_total,
            type,
            created_at
        FROM goal_contributions
        WHERE goal_id = $1
          AND user_id = $2
        ORDER BY contribution_date DESC, created_at DESC
        `,
        [goalId, userId]
    );

    return result.rows.map(row => ({
        ...row,
        amount: Number(row.amount)
    }));
}


async function updateGoalContribution(
    userId,
    goalId,
    contributionId,
    amount,
    description,
    contributionDate
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Busca contribuição antiga para calcular diferença
        const oldResult = await client.query(
            `SELECT amount FROM goal_contributions WHERE id = $1 AND goal_id = $2 AND user_id = $3`,
            [contributionId, goalId, userId]
        );

        if (oldResult.rows.length === 0) {
            throw new Error("Contribuição não encontrada.");
        }

        const oldAmount = Number(oldResult.rows[0].amount);
        const newAmount = Number(amount);
        const diff = newAmount - oldAmount;

        // Atualiza a contribuição
        const result = await client.query(
            `
            UPDATE goal_contributions
            SET
                amount = $1,
                description = $2,
                contribution_date = COALESCE($3::date, contribution_date)
            WHERE id = $4 AND goal_id = $5 AND user_id = $6
            RETURNING
                id,
                goal_id,
                user_id,
                amount,
                description,
                contribution_date,
                installment_number,
                installments_total,
                type,
                created_at
            `,
            [newAmount, description || null, contributionDate || null, contributionId, goalId, userId]
        );

        // A trigger atualiza current_amount automaticamente com a diferença

        await client.query("COMMIT");

        return result.rows[0];

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}


async function deleteGoalContribution(userId, goalId, contributionId) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `DELETE FROM goal_contributions WHERE id = $1 AND goal_id = $2 AND user_id = $3 RETURNING id`,
            [contributionId, goalId, userId]
        );

        await client.query("COMMIT");

        return result.rows[0];

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}


async function addRecurringContributions(
    userId,
    goalId,
    amount,
    description,
    firstDate,
    installmentsTotal,
    frequencyMonths = 1
) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Verifica a meta
        const goalResult = await client.query(
            `SELECT id, target_amount, current_amount FROM goals WHERE id = $1 AND user_id = $2`,
            [goalId, userId]
        );

        if (goalResult.rows.length === 0) {
            throw new Error("Meta não encontrada.");
        }

        const contributions = [];
        const [year, month, day] = firstDate.split("-").map(Number);

        for (let i = 1; i <= installmentsTotal; i++) {
            const dueDate = new Date(Date.UTC(year, month - 1 + (i - 1) * frequencyMonths, day));
            // Ajusta se o dia não existe no mês
            if (dueDate.getUTCDate() !== day) {
                dueDate.setUTCDate(0);
            }

            const dueDateStr = `${dueDate.getUTCFullYear()}-${String(dueDate.getUTCMonth() + 1).padStart(2, '0')}-${String(dueDate.getUTCDate()).padStart(2, '0')}`;

            const contribResult = await client.query(
                `
                INSERT INTO goal_contributions (
                    goal_id,
                    user_id,
                    amount,
                    description,
                    contribution_date,
                    installment_number,
                    installments_total,
                    type
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'installment')
                RETURNING
                    id,
                    goal_id,
                    user_id,
                    amount,
                    description,
                    contribution_date,
                    installment_number,
                    installments_total,
                    type,
                    created_at
                `,
                [goalId, userId, amount, description || null, dueDateStr, i, installmentsTotal]
            );

            contributions.push(contribResult.rows[0]);
        }

        // A trigger atualiza current_amount automaticamente

        await client.query("COMMIT");

        return contributions;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}


module.exports = {
    createGoal,
    getGoalsByUser,
    getGoalById,
    updateGoal,
    deleteGoal,
    addGoalContribution,
    getGoalContributions,
    updateGoalContribution,
    deleteGoalContribution,
    addRecurringContributions
};