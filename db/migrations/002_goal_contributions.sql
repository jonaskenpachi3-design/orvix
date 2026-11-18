-- =========================================================
-- GOAL CONTRIBUTIONS (Histórico de aportes nas metas)
-- =========================================================

CREATE TABLE IF NOT EXISTS goal_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    goal_id UUID NOT NULL,

    user_id UUID NOT NULL,

    amount NUMERIC(12, 2) NOT NULL,

    description VARCHAR(255),

    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Para parcelamento/recorrência
    installment_number INT,
    installments_total INT,

    -- Tipo de contribuição
    type VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'recurring', 'installment')),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_goal_contributions_goal
        FOREIGN KEY (goal_id)
        REFERENCES goals(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_goal_contributions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT goal_contributions_amount_check
        CHECK (amount > 0),

    CONSTRAINT goal_contributions_installment_check
        CHECK (
            (installment_number IS NULL AND installments_total IS NULL) OR
            (installment_number IS NOT NULL AND installments_total IS NOT NULL AND installment_number > 0 AND installments_total > 0 AND installment_number <= installments_total)
        )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON goal_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_date ON goal_contributions(contribution_date);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_type ON goal_contributions(type);

-- Trigger para atualizar current_amount da meta automaticamente
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE goals
        SET current_amount = current_amount + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.goal_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE goals
        SET current_amount = current_amount - OLD.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.goal_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE goals
        SET current_amount = current_amount - OLD.amount + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.goal_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goal_current_amount ON goal_contributions;
CREATE TRIGGER trigger_update_goal_current_amount
AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
FOR EACH ROW EXECUTE FUNCTION update_goal_current_amount();

-- View para facilitar consulta de metas com progresso
CREATE OR REPLACE VIEW goals_with_progress AS
SELECT
    g.*,
    CASE
        WHEN g.target_amount = 0 THEN 0
        ELSE ROUND((g.current_amount / g.target_amount) * 100)
    END AS progress_percent,
    GREATEST(g.target_amount - g.current_amount, 0) AS remaining_amount
FROM goals g;