-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brands
CREATE POLICY "select_brands" ON brands FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_brands" ON brands FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'manager', 'inventory')));

CREATE POLICY "update_brands" ON brands FOR UPDATE
  TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'manager', 'inventory')));

CREATE POLICY "delete_brands" ON brands FOR DELETE
  TO authenticated USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin'));

-- Add brand_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);

-- Update company settings default currency to BDT
UPDATE company_settings 
SET currency = 'BDT', currency_symbol = '৳' 
WHERE currency = 'AED';
