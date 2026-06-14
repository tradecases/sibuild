-- Add balance_due column to purchase_orders
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED;