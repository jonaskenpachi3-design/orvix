-- =========================================================
-- MIGRATION 003: ICON E COR PARA CATEGORIAS
-- Idempotente - pode rodar múltiplas vezes
-- =========================================================

-- 1. Adiciona colunas icon e color na tabela categories
DO $$
BEGIN
    -- icon (nome do ícone Bootstrap Icons, ex: 'bi-cart', 'bi-credit-card')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'icon'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon VARCHAR(50) DEFAULT 'bi-tag';
    END IF;

    -- color (hex color, ex: '#FF6B6B', '#4ECDC4')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories' AND column_name = 'color'
    ) THEN
        ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#6C757D';
    END IF;
END $$;

-- 2. Atualiza categorias existentes com ícones e cores padrão baseadas no nome
-- (Opcional: pode ser feito via script separado ou na primeira execução do usuário)
UPDATE categories
SET icon = CASE
    WHEN LOWER(name) LIKE '%aliment%' THEN 'bi-egg-fried'
    WHEN LOWER(name) LIKE '%mercad%' THEN 'bi-cart'
    WHEN LOWER(name) LIKE '%transporte%' THEN 'bi-bus-front'
    WHEN LOWER(name) LIKE '%combust%' THEN 'bi-fuel-pump'
    WHEN LOWER(name) LIKE '%saude%' THEN 'bi-heart-pulse'
    WHEN LOWER(name) LIKE '%educ%' THEN 'bi-book'
    WHEN LOWER(name) LIKE '%lazer%' THEN 'bi-controller'
    WHEN LOWER(name) LIKE '%assinatur%' THEN 'bi-credit-card'
    WHEN LOWER(name) LIKE '%compras%' THEN 'bi-bag'
    WHEN LOWER(name) LIKE '%moradia%' THEN 'bi-house'
    WHEN LOWER(name) LIKE '%viagem%' THEN 'bi-airplane'
    WHEN LOWER(name) LIKE '%beleza%' THEN 'bi-gem'
    WHEN LOWER(name) LIKE '%servic%' THEN 'bi-tools'
    WHEN LOWER(name) LIKE '%transfer%' THEN 'bi-arrow-left-right'
    WHEN LOWER(name) LIKE '%salari%' THEN 'bi-cash-stack'
    WHEN LOWER(name) LIKE '%rendiment%' THEN 'bi-graph-up'
    WHEN LOWER(name) LIKE '%reembols%' THEN 'bi-arrow-return-left'
    ELSE 'bi-tag'
END,
color = CASE
    WHEN type = 'income' THEN '#28A745'
    ELSE '#DC3545'
END
WHERE icon = 'bi-tag' AND color = '#6C757D';