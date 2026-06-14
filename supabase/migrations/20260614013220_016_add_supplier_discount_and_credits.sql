-- Add discount_percentage to suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0;

-- Add outstanding_balance and credit tracking
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_purchases NUMERIC(12,2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS total_payments NUMERIC(12,2) DEFAULT 0;