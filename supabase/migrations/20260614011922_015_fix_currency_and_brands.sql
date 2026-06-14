-- Fix brands table - make slug nullable since we're not using it in the form
ALTER TABLE brands ALTER COLUMN slug DROP NOT NULL;

-- Fix company settings - correct currency and symbol
UPDATE company_settings 
SET currency = 'BDT', currency_symbol = '৳'
WHERE currency != 'BDT';

-- Update default values for company_settings
ALTER TABLE company_settings ALTER COLUMN currency SET DEFAULT 'BDT';
ALTER TABLE company_settings ALTER COLUMN currency_symbol SET DEFAULT '৳';
ALTER TABLE company_settings ALTER COLUMN country SET DEFAULT 'Bangladesh';