-- =========================================================
-- MIGRATION 002: SINCRONIZAÇÃO BANCÁRIA (Open Finance via Pluggy)
-- Idempotente - pode rodar múltiplas vezes
-- =========================================================

-- 1. Origem e identificador externo das transações (evita duplicar ao sincronizar)
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual';

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS external_id VARCHAR(120);

-- NULLs são distintos no PostgreSQL: transações manuais (external_id nulo) não colidem
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external
    ON transactions(user_id, source, external_id);

-- 2. Conexões bancárias do usuário (itemId da Pluggy)
CREATE TABLE IF NOT EXISTS bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    provider VARCHAR(20) NOT NULL DEFAULT 'pluggy',

    item_id VARCHAR(100) NOT NULL,

    last_synced_at TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bank_connections_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT bank_connections_unique
        UNIQUE (user_id, provider, item_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user
    ON bank_connections(user_id);
