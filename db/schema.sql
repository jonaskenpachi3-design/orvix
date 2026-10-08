-- =========================================================
-- ORVIX
-- Financial Intelligence Platform
-- Database Schema
-- =========================================================

-- =========================================================
-- EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =========================================================
-- USERS
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- CATEGORIES
-- =========================================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    name VARCHAR(100) NOT NULL,

    type VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT categories_type_check
        CHECK (type IN ('income', 'expense')),

    CONSTRAINT categories_user_name_unique
        UNIQUE (user_id, name, type)
);


-- =========================================================
-- TRANSACTIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    category_id UUID,

    description VARCHAR(255) NOT NULL,

    amount NUMERIC(12, 2) NOT NULL,

    type VARCHAR(20) NOT NULL,

    transaction_date DATE NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_transactions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_transactions_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id)
        ON DELETE SET NULL,

    CONSTRAINT transactions_amount_check
        CHECK (amount > 0),

    CONSTRAINT transactions_type_check
        CHECK (type IN ('income', 'expense'))
);


-- =========================================================
-- GOALS
-- =========================================================

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL,

    name VARCHAR(150) NOT NULL,

    target_amount NUMERIC(12, 2) NOT NULL,

    current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,

    deadline DATE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_goals_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT goals_target_amount_check
        CHECK (target_amount > 0),

    CONSTRAINT goals_current_amount_check
        CHECK (current_amount >= 0),

    CONSTRAINT goals_current_not_greater_than_target
        CHECK (current_amount <= target_amount)
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_categories_user_id
    ON categories(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id
    ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_category_id
    ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions(user_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_goals_user_id
    ON goals(user_id);


-- =========================================================
-- DEFAULT CATEGORIES
-- =========================================================
-- As categorias padrão serão criadas pela aplicação
-- para cada novo usuário durante o cadastro.
-- =========================================================