CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  branch_id UUID REFERENCES branches(id),
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO warehouses (name, code) VALUES
  ('Main Warehouse', 'WH-MAIN'),
  ('Showroom Floor',  'WH-SHOW')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS stock_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity DECIMAL(12,2) DEFAULT 0,
  reserved_quantity DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, variant_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  destination_warehouse_id UUID REFERENCES warehouses(id),
  movement_type movement_type NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2),
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);