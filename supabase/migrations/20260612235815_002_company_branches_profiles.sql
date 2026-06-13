CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'SI Building Solutions',
  logo_url TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'UAE',
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_number TEXT,
  currency TEXT DEFAULT 'AED',
  currency_symbol TEXT DEFAULT 'AED',
  invoice_notes TEXT DEFAULT 'Thank you for your business.',
  invoice_terms TEXT DEFAULT 'Payment is due within 30 days.',
  financial_year_start DATE DEFAULT '2024-01-01',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO company_settings (name, currency, currency_symbol)
VALUES ('SI Building Solutions', 'AED', 'AED')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO branches (name, code, address)
VALUES ('Main Showroom', 'MAIN', 'Dubai, UAE')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'sales',
  branch_id UUID REFERENCES branches(id),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);