CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Sanitary & Ceramics',         'sanitary-ceramics',    'droplets',      1),
  ('Bath Fittings',               'bath-fittings',        'bath',          2),
  ('Electrical & Cables',         'electrical-cables',    'zap',           3),
  ('Switches & Sockets',          'switches-sockets',     'toggle-left',   4),
  ('Circuit Breakers & Protection','circuit-breakers',    'shield',        5),
  ('Lighting',                    'lighting',             'lightbulb',     6),
  ('Tiles & Flooring',            'tiles-flooring',       'grid-2x2',      7),
  ('Pipes & Fittings',            'pipes-fittings',       'circle-dot',    8),
  ('Plywood & Boards',            'plywood-boards',       'layers',        9),
  ('Paints & Finishes',           'paints-finishes',      'paintbrush',   10),
  ('Hardware & Tools',            'hardware-tools',       'wrench',       11),
  ('Doors & Locks',               'doors-locks',          'door-open',    12),
  ('Kitchen Appliances',          'kitchen-appliances',   'utensils',     13),
  ('AC & Cooling',                'ac-cooling',           'wind',         14),
  ('Generators & Power Solutions','generators-power',     'battery',      15),
  ('Solar Panels & Inverters',    'solar-panels',         'sun',          16),
  ('CCTV & Security Systems',     'cctv-security',        'cctv',         17),
  ('Elevators & Lifts',           'elevators-lifts',      'arrow-up-down',18)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  country_of_origin TEXT,
  website TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO units (name, abbreviation) VALUES
  ('Piece',        'Pcs'),
  ('Box',          'Box'),
  ('Meter',        'M'),
  ('Square Meter', 'SqM'),
  ('Kilogram',     'Kg'),
  ('Liter',        'Ltr'),
  ('Roll',         'Roll'),
  ('Pair',         'Pair'),
  ('Set',          'Set'),
  ('Carton',       'Ctn'),
  ('Bag',          'Bag'),
  ('Sheet',        'Sheet')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  brand_id UUID REFERENCES brands(id),
  unit_id UUID REFERENCES units(id),
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  cost_price DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  min_selling_price DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 5,
  reorder_level INT DEFAULT 0,
  max_stock_level INT DEFAULT 0,
  specifications JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  barcode TEXT UNIQUE,
  attributes JSONB DEFAULT '{}',
  cost_price DECIMAL(12,2),
  selling_price DECIMAL(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);