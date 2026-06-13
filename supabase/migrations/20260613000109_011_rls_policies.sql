-- Enable RLS on all tables
ALTER TABLE company_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands              ENABLE ROW LEVEL SECURITY;
ALTER TABLE units               ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_levels        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_returns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_claims     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance          ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines       ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses            ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_counters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- ── company_settings ──────────────────────────────────────────
CREATE POLICY "cs_select" ON company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "cs_update" ON company_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ── branches ──────────────────────────────────────────────────
CREATE POLICY "br_select" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "br_insert" ON branches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "br_update" ON branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "br_delete" ON branches FOR DELETE TO authenticated USING (true);

-- ── profiles ──────────────────────────────────────────────────
CREATE POLICY "pr_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "pr_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "pr_update" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pr_delete" ON profiles FOR DELETE TO authenticated USING (true);

-- ── Generic read/write for operational tables (single-tenant ERP) ──
DO $$
DECLARE tbl TEXT;
DECLARE tables TEXT[] := ARRAY[
  'categories','brands','units','products','product_images','product_variants',
  'warehouses','stock_levels','stock_movements',
  'suppliers','purchase_orders','purchase_order_items','goods_receipts','goods_receipt_items',
  'customers','customer_notes','projects',
  'quotations','quotation_items',
  'invoices','invoice_items','payments','sales_returns',
  'delivery_orders','delivery_items',
  'warranties','warranty_claims',
  'employees','attendance','salary_records',
  'accounts','journal_entries','journal_lines','expenses',
  'document_counters','activity_logs','notifications'
];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (true)',
      tbl || '_sel', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl || '_ins', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',
      tbl || '_upd', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE TO authenticated USING (true)',
      tbl || '_del', tbl);
  END LOOP;
END $$;