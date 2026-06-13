CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warranty_number TEXT UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  serial_number TEXT,
  purchase_date DATE NOT NULL,
  warranty_period_months INT DEFAULT 12,
  expiry_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number TEXT UNIQUE NOT NULL,
  warranty_id UUID NOT NULL REFERENCES warranties(id),
  status claim_status DEFAULT 'open',
  issue_description TEXT NOT NULL,
  resolution TEXT,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_date DATE,
  handled_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  designation TEXT,
  department TEXT,
  branch_id UUID REFERENCES branches(id),
  employment_type employment_type DEFAULT 'full_time',
  status employee_status DEFAULT 'active',
  join_date DATE NOT NULL,
  basic_salary DECIMAL(12,2) DEFAULT 0,
  bank_account TEXT,
  emergency_contact TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status TEXT CHECK (status IN ('present','absent','late','half_day','holiday','leave')) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

CREATE TABLE IF NOT EXISTS salary_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  basic_salary DECIMAL(12,2) NOT NULL,
  allowances DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  net_salary DECIMAL(12,2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  parent_id UUID REFERENCES accounts(id),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO accounts (code, name, type) VALUES
  ('1100', 'Cash in Hand',        'asset'),
  ('1200', 'Bank Account',        'asset'),
  ('1300', 'Accounts Receivable', 'asset'),
  ('1400', 'Inventory',           'asset'),
  ('2100', 'Accounts Payable',    'liability'),
  ('3000', 'Owner Equity',        'equity'),
  ('4100', 'Sales Revenue',       'revenue'),
  ('5000', 'Cost of Goods Sold',  'expense'),
  ('6100', 'Salaries & Wages',    'expense'),
  ('6200', 'Rent',                'expense'),
  ('6300', 'Utilities',           'expense'),
  ('6400', 'Marketing & Ads',     'expense'),
  ('6500', 'Transport & Delivery','expense'),
  ('6600', 'Miscellaneous',       'expense')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_number TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_type TEXT,
  reference_id UUID,
  total_debit DECIMAL(12,2) DEFAULT 0,
  total_credit DECIMAL(12,2) DEFAULT 0,
  is_posted BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  description TEXT,
  debit DECIMAL(12,2) DEFAULT 0,
  credit DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_number TEXT UNIQUE NOT NULL,
  account_id UUID REFERENCES accounts(id),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method DEFAULT 'cash',
  reference_number TEXT,
  vendor_name TEXT,
  receipt_url TEXT,
  branch_id UUID REFERENCES branches(id),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);