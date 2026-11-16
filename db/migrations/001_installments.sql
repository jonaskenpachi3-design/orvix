-- =========================================================
-- MIGRATION 001: INSTALLMENT PLANS
-- Idempotente - pode rodar múltiplas vezes
-- =========================================================

-- 1. Cria tabela installment_plans
CREATE TABLE IF NOT EXISTS installment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    description VARCHAR(255) NOT NULL,

    total_amount NUMERIC(12, 2) NOT NULL,

    installments_total INT NOT NULL,

    first_due_date DATE NOT NULL,

    category_id UUID,

    card_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_installment_plans_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_installment_plans_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

    CONSTRAINT installment_plans_total_amount_check
        CHECK (total_amount > 0),

    CONSTRAINT installment_plans_installments_check
        CHECK (installments_total > 0)
);

-- 2. Adiciona colunas em transactions (idempotente com IF NOT EXISTS)
DO $$
BEGIN
    -- plan_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'plan_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN plan_id UUID;
    END IF;

    -- installment_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'installment_number'
    ) THEN
        ALTER TABLE transactions ADD COLUMN installment_number INT;
    END IF;

    -- status com DEFAULT 'paid' para transações antigas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'status'
    ) THEN
        ALTER TABLE transactions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'paid';
    END IF;
END $$;

-- 3. Constraints em transactions (idempotente)
DO $$
BEGIN
    -- FK para installment_plans
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_transactions_plan'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT fk_transactions_plan
        FOREIGN KEY (plan_id)
        REFERENCES installment_plans(id)
        ON DELETE SET NULL;
    END IF;

    -- Check status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transactions_status_check'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT transactions_status_check
        CHECK (status IN ('scheduled', 'paid'));
    END IF;

    -- Check installment_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'transactions_installment_number_check'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT transactions_installment_number_check
        CHECK (installment_number IS NULL OR installment_number > 0);
    END IF;
END $$;

-- 4. Índices (idempotente com IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_transactions_plan_id
    ON transactions(plan_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
    ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_installment_plans_user_id
    ON installment_plans(user_id);

-- 5. Atualiza status NULL para 'paid' (caso existam)
UPDATE transactions
SET status = 'paid'
WHERE status IS NULL;