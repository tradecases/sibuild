CREATE TABLE IF NOT EXISTS document_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT UNIQUE NOT NULL,
  prefix TEXT NOT NULL,
  current_value INT DEFAULT 0,
  padding INT DEFAULT 5
);

INSERT INTO document_counters (type, prefix, current_value, padding) VALUES
  ('quotation',      'QT',  0, 5),
  ('invoice',        'INV', 0, 5),
  ('purchase_order', 'PO',  0, 5),
  ('goods_receipt',  'GRN', 0, 5),
  ('delivery',       'DO',  0, 5),
  ('warranty',       'WR',  0, 5),
  ('warranty_claim', 'WC',  0, 5),
  ('payment',        'PMT', 0, 5),
  ('expense',        'EXP', 0, 5),
  ('project',        'PRJ', 0, 5),
  ('sales_return',   'SR',  0, 5),
  ('journal_entry',  'JE',  0, 5)
ON CONFLICT (type) DO NOTHING;

CREATE OR REPLACE FUNCTION get_next_document_number(doc_type TEXT)
RETURNS TEXT AS $$
DECLARE
  counter RECORD;
BEGIN
  UPDATE document_counters
  SET current_value = current_value + 1
  WHERE type = doc_type
  RETURNING * INTO counter;
  RETURN counter.prefix || '-' || LPAD(counter.current_value::TEXT, counter.padding, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info','success','warning','error')) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);