CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  quotation_id UUID REFERENCES quotations(id),
  project_id UUID REFERENCES projects(id),
  status invoice_status DEFAULT 'draft',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance_due DECIMAL(12,2) DEFAULT 0,
  payment_method payment_method DEFAULT 'cash',
  notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  warehouse_id UUID REFERENCES warehouses(id),
  description TEXT,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 5,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_number TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  supplier_id UUID REFERENCES suppliers(id),
  type TEXT NOT NULL CHECK (type IN ('received', 'paid')),
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  reference_number TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  return_number TEXT UNIQUE NOT NULL,
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(12,2) DEFAULT 0,
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_number TEXT UNIQUE NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status delivery_status DEFAULT 'pending',
  scheduled_date DATE,
  delivered_date DATE,
  delivery_address TEXT,
  vehicle TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  notes TEXT,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  quantity DECIMAL(12,2) NOT NULL,
  delivered_quantity DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);