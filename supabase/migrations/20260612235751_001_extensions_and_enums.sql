CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('super_admin','manager','sales','inventory','accountant','delivery'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE movement_type AS ENUM ('stock_in','stock_out','transfer','adjustment','damage','return','opening'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE po_status AS ENUM ('draft','sent','partial','received','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_type AS ENUM ('retail','contractor','builder','architect','interior_designer','corporate'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quotation_status AS ENUM ('draft','sent','accepted','rejected','expired','converted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE invoice_status AS ENUM ('draft','issued','partial','paid','overdue','cancelled','returned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash','card','bank_transfer','cheque','credit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE project_status AS ENUM ('enquiry','active','on_hold','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_status AS ENUM ('pending','assigned','in_transit','delivered','failed','returned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE claim_status AS ENUM ('open','in_progress','resolved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employment_type AS ENUM ('full_time','part_time','contract','intern'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active','on_leave','terminated','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE account_type AS ENUM ('asset','liability','equity','revenue','expense'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;