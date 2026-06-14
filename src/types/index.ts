export type UserRole = 'super_admin' | 'manager' | 'sales' | 'inventory' | 'accountant' | 'delivery';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  branch_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_number: string | null;
  currency: string;
  currency_symbol: string;
  financial_year_start: string;
}

// ---- PRODUCT CATALOG ----
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  country_of_origin: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  brand_id: string | null;
  unit_id: string | null;
  sku: string | null;
  barcode: string | null;
  cost_price: number;
  selling_price: number;
  min_selling_price: number;
  tax_rate: number;
  reorder_level: number;
  max_stock_level: number;
  specifications: Record<string, string>;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
  brand?: Brand;
  unit?: Unit;
  images?: ProductImage[];
  stock_levels?: StockLevel[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  attributes: Record<string, string>;
  cost_price: number | null;
  selling_price: number | null;
  is_active: boolean;
}

// ---- WAREHOUSE & STOCK ----
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  branch_id: string | null;
  address: string | null;
  is_active: boolean;
}

export interface StockLevel {
  id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  warehouse?: Warehouse;
}

export type MovementType = 'stock_in' | 'stock_out' | 'transfer' | 'adjustment' | 'damage' | 'return' | 'opening';

export interface StockMovement {
  id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string;
  destination_warehouse_id: string | null;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Product;
  warehouse?: Warehouse;
  created_by_profile?: Profile;
}

// ---- SUPPLIERS ----
export interface Supplier {
  id: string;
  name: string;
  code: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  payment_terms: number;
  credit_limit: number;
  outstanding_balance: number;
  total_purchases: number;
  total_payments: number;
  discount_percentage: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

// ---- PURCHASE MANAGEMENT ----
export type POStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  warehouse_id: string;
  status: POStatus;
  order_date: string;
  expected_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  received_quantity: number;
  unit_cost: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  product?: Product;
}

// ---- CUSTOMERS ----
export type CustomerType = 'retail' | 'contractor' | 'builder' | 'architect' | 'interior_designer' | 'corporate';

export interface Customer {
  id: string;
  name: string;
  code: string | null;
  type: CustomerType;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string;
  tax_number: string | null;
  credit_limit: number;
  outstanding_balance: number;
  total_purchases: number;
  discount_percentage: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- QUOTATIONS ----
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';

export interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  project_id: string | null;
  status: QuotationStatus;
  valid_until: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: QuotationItem[];
  created_by_profile?: Profile;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  variant_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  sort_order: number;
  product?: Product;
}

// ---- INVOICES ----
export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'returned';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'credit';

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  quotation_id: string | null;
  project_id: string | null;
  status: InvoiceStatus;
  invoice_date: string;
  due_date: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_method: PaymentMethod;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  variant_id: string | null;
  warehouse_id: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  sort_order: number;
  product?: Product;
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string | null;
  customer_id: string | null;
  purchase_order_id: string | null;
  supplier_id: string | null;
  type: 'received' | 'paid';
  amount: number;
  payment_method: PaymentMethod;
  reference_number: string | null;
  payment_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ---- PROJECTS ----
export type ProjectStatus = 'enquiry' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  name: string;
  project_number: string;
  customer_id: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  description: string | null;
  address: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

// ---- DELIVERY ----
export type DeliveryStatus = 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'returned';

export interface DeliveryOrder {
  id: string;
  delivery_number: string;
  invoice_id: string | null;
  customer_id: string;
  status: DeliveryStatus;
  scheduled_date: string | null;
  delivered_date: string | null;
  delivery_address: string | null;
  vehicle: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  customer?: Customer;
  invoice?: Invoice;
}

// ---- WARRANTY ----
export interface Warranty {
  id: string;
  warranty_number: string;
  product_id: string;
  invoice_id: string | null;
  customer_id: string;
  serial_number: string | null;
  purchase_date: string;
  warranty_period_months: number;
  expiry_date: string;
  notes: string | null;
  created_at: string;
  product?: Product;
  customer?: Customer;
}

export type ClaimStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

export interface WarrantyClaim {
  id: string;
  claim_number: string;
  warranty_id: string;
  status: ClaimStatus;
  issue_description: string;
  resolution: string | null;
  claim_date: string;
  resolved_date: string | null;
  handled_by: string | null;
  created_at: string;
  warranty?: Warranty;
}

// ---- EMPLOYEES ----
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type EmployeeStatus = 'active' | 'on_leave' | 'terminated' | 'suspended';

export interface Employee {
  id: string;
  employee_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  department: string | null;
  branch_id: string | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  join_date: string;
  basic_salary: number;
  bank_account: string | null;
  emergency_contact: string | null;
  address: string | null;
  created_at: string;
}

// ---- ACCOUNTING ----
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
}

export interface JournalEntry {
  id: string;
  entry_number: string;
  description: string;
  entry_date: string;
  reference_type: string | null;
  reference_id: string | null;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  created_at: string;
  lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  description: string | null;
  debit: number;
  credit: number;
  account?: Account;
}

export interface Expense {
  id: string;
  expense_number: string;
  account_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  vendor_name: string | null;
  receipt_url: string | null;
  branch_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ---- AUDIT ----
export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  link: string | null;
  created_at: string;
}

// ---- UI ----
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  search: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  [key: string]: string | undefined;
}
