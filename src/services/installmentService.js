const pool = require("../config/database");

const PLAN_NOT_FOUND = "Plano de parcelamento não encontrado.";
const INSTALLMENT_NOT_FOUND = "Parcela não encontrada.";

/**
 * Calcula o valor de cada parcela.
 * A última parcela absorve a diferença de centavos.
 */
function calculateInstallmentAmounts(totalAmount, installmentsTotal) {
    const baseAmount = Math.floor((totalAmount * 100) / installmentsTotal) / 100;
    const remainder = Math.round((totalAmount - baseAmount * installmentsTotal) * 100) / 100;

    const amounts = [];
    for (let i = 1; i <= installmentsTotal; i++) {
        if (i === installmentsTotal) {
            amounts.push(Number((baseAmount + remainder).toFixed(2)));
        } else {
            amounts.push(Number(baseAmount.toFixed(2)));
        }
    }
    return amounts;
}

/**
 * Calcula a data de vencimento da parcela.
 * Se o dia não existir no mês (ex: 31 em fevereiro), usa o último dia do mês.
 */
function calculateDueDate(firstDueDate, installmentIndex) {
    const date = new Date(firstDueDate);
    date.setMonth(date.getMonth() + (installmentIndex - 1));

    // Se o dia original não existe no mês resultante, ajusta para o último dia do mês
    const originalDay = new Date(firstDueDate).getDate();
    if (date.getDate() !== originalDay) {
        // Volta para o último dia do mês anterior
        date.setDate(0);
    }

    return date.toISOString().split("T")[0];
}

/**
 * Valida se a categoria pertence ao usuário (ou é nula).
 */
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
        throw new Error("Categoria não encontrada.");
    }
}

/**
 * Cria um plano de parcelamento e gera as transações agendadas.
 */
async function createInstallmentPlan(userId, planData) {
    const {
        description,
        totalAmount,
        installmentsTotal,
        firstDueDate,
        categoryId,
        cardId
    } = planData;

    await assertCategoryBelongsToUser(userId, categoryId);

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Cria o plano
        const planResult = await client.query(
            `
            INSERT INTO installment_plans (
                user_id,
                description,
                total_amount,
                installments_total,
                first_due_date,
                category_id,
                card_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                user_id,
                description,
                total_amount,
                installments_total,
                first_due_date,
                category_id,
                card_id,
                created_at
            `,
            [
                userId,
                description.trim(),
                totalAmount,
                installmentsTotal,
                firstDueDate,
                categoryId || null,
                cardId || null
            ]
        );

        const plan = planResult.rows[0];

        // 2. Calcula valores das parcelas
        const amounts = calculateInstallmentAmounts(totalAmount, installmentsTotal);

        // 3. Gera as transações agendadas (scheduled)
        const transactions = [];
        for (let i = 1; i <= installmentsTotal; i++) {
            const dueDate = calculateDueDate(firstDueDate, i);
            const amount = amounts[i - 1];

            const txResult = await client.query(
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
                VALUES ($1, $2, $3, $4, 'expense', $5, $6, $7, 'scheduled')
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
                    `${description.trim()} (${i}/${installmentsTotal})`,
                    amount,
                    dueDate,
                    plan.id,
                    i
                ]
            );

            transactions.push(txResult.rows[0]);
        }

        await client.query("COMMIT");

        return {
            plan,
            transactions
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Lista todos os planos de parcelamento do usuário.
 */
async function getInstallmentPlans(userId) {
    const result = await pool.query(
        `
        SELECT
            ip.id,
            ip.description,
            ip.total_amount,
            ip.installments_total,
            ip.first_due_date,
            ip.category_id,
            ip.card_id,
            ip.created_at,
            c.name AS category_name,
            COUNT(t.id) FILTER (WHERE t.status = 'paid') AS installments_paid,
            COUNT(t.id) FILTER (WHERE t.status = 'scheduled') AS installments_pending
        FROM installment_plans ip
        LEFT JOIN categories c ON c.id = ip.category_id
        LEFT JOIN transactions t ON t.plan_id = ip.id
        WHERE ip.user_id = $1
        GROUP BY ip.id, c.name
        ORDER BY ip.created_at DESC
        `,
        [userId]
    );

    return result.rows.map(row => ({
        ...row,
        total_amount: Number(row.total_amount),
        installments_paid: Number(row.installments_paid),
        installments_pending: Number(row.installments_pending)
    }));
}

/**
 * Busca um plano específico com suas parcelas.
 */
async function getInstallmentPlanWithTransactions(userId, planId) {
    const planResult = await pool.query(
        `
        SELECT
            ip.*,
            c.name AS category_name
        FROM installment_plans ip
        LEFT JOIN categories c ON c.id = ip.category_id
        WHERE ip.id = $1 AND ip.user_id = $2
        `,
        [planId, userId]
    );

    if (planResult.rows.length === 0) {
        throw new Error(PLAN_NOT_FOUND);
    }

    const plan = planResult.rows[0];

    const transactionsResult = await pool.query(
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
        WHERE plan_id = $1
        ORDER BY installment_number
        `,
        [planId]
    );

    return {
        ...plan,
        total_amount: Number(plan.total_amount),
        transactions: transactionsResult.rows.map(t => ({
            ...t,
            amount: Number(t.amount)
        }))
    };
}

/**
 * Busca parcelas futuras (scheduled) agrupadas por mês.
 * Usa o mesmo padrão do getPeriodSummary.
 */
async function getUpcomingInstallments(userId, startDate, endDate) {
    const result = await pool.query(
        `
        SELECT
            TO_CHAR(transaction_date, 'YYYY-MM') AS month,
            COALESCE(SUM(amount), 0) AS total
        FROM transactions
        WHERE user_id = $1
          AND status = 'scheduled'
          AND transaction_date >= $2
          AND transaction_date <= $3
        GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
        ORDER BY month
        `,
        [userId, startDate, endDate]
    );

    return result.rows.map(row => ({
        month: row.month,
        total: Number(row.total)
    }));
}

/**
 * Conta parcelas pendentes de um plano.
 */
async function getPendingInstallmentsCount(userId, planId) {
    const result = await pool.query(
        `
        SELECT COUNT(*) AS count
        FROM transactions
        WHERE plan_id = $1
          AND user_id = $2
          AND status = 'scheduled'
        `,
        [planId, userId]
    );

    return Number(result.rows[0].count);
}

/**
 * Marca uma parcela como paga.
 */
async function payInstallment(userId, transactionId) {
    const result = await pool.query(
        `
        UPDATE transactions
        SET
            status = 'paid',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND user_id = $2
          AND status = 'scheduled'
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
            updated_at
        `,
        [transactionId, userId]
    );

    if (result.rows.length === 0) {
        throw new Error(INSTALLMENT_NOT_FOUND);
    }

    return {
        ...result.rows[0],
        amount: Number(result.rows[0].amount)
    };
}

/**
 * Exclui um plano de parcelamento e suas parcelas agendadas.
 * Parcelas já pagas são mantidas (sem plan_id).
 */
async function deleteInstallmentPlan(userId, planId) {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Remove plan_id das parcelas já pagas
        await client.query(
            `
            UPDATE transactions
            SET plan_id = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE plan_id = $1
              AND user_id = $2
              AND status = 'paid'
            `,
            [planId, userId]
        );

        // 2. Exclui parcelas agendadas
        await client.query(
            `
            DELETE FROM transactions
            WHERE plan_id = $1
              AND user_id = $2
              AND status = 'scheduled'
            `,
            [planId, userId]
        );

        // 3. Exclui o plano
        const result = await client.query(
            `
            DELETE FROM installment_plans
            WHERE id = $1 AND user_id = $2
            RETURNING id
            `,
            [planId, userId]
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

/**
 * Busca resumo de parcelas por período (para dashboard/relatórios).
 * Inclui apenas status = 'paid' por padrão.
 */
async function getInstallmentsSummary(userId, startDate, endDate, includeScheduled = false) {
    const statusFilter = includeScheduled
        ? "AND status IN ('paid', 'scheduled')"
        : "AND status = 'paid'";

    const result = await pool.query(
        `
        SELECT
            COALESCE(SUM(amount), 0) AS total
        FROM transactions
        WHERE user_id = $1
          AND type = 'expense'
          AND transaction_date >= $2
          AND transaction_date <= $3
          ${statusFilter}
        `,
        [userId, startDate, endDate]
    );

    return Number(result.rows[0].total);
}

module.exports = {
    PLAN_NOT_FOUND,
    INSTALLMENT_NOT_FOUND,
    calculateInstallmentAmounts,
    calculateDueDate,
    createInstallmentPlan,
    getInstallmentPlans,
    getInstallmentPlanWithTransactions,
    getUpcomingInstallments,
    getPendingInstallmentsCount,
    payInstallment,
    deleteInstallmentPlan,
    getInstallmentsSummary
};