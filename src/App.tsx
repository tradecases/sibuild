import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { AppShell } from './components/layout/AppShell';
import { AuthGuard, GuestGuard } from './features/auth/AuthGuard';
import { LoginPage } from './features/auth/LoginPage';

// Lazy-loaded feature pages
const DashboardPage = React.lazy(() => import('./features/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProductsPage = React.lazy(() => import('./features/inventory/ProductsPage').then(m => ({ default: m.ProductsPage })));
const CategoriesPage = React.lazy(() => import('./features/inventory/CategoriesPage').then(m => ({ default: m.CategoriesPage })));
const StockOperationsPage = React.lazy(() => import('./features/inventory/StockOperationsPage').then(m => ({ default: m.StockOperationsPage })));
const CustomersPage = React.lazy(() => import('./features/customers/CustomersPage').then(m => ({ default: m.CustomersPage })));
const CustomerDetail = React.lazy(() => import('./features/customers/CustomerDetail').then(m => ({ default: m.CustomerDetail })));
const QuotationsPage = React.lazy(() => import('./features/quotations/QuotationsPage').then(m => ({ default: m.QuotationsPage })));
const QuotationForm = React.lazy(() => import('./features/quotations/QuotationForm').then(m => ({ default: m.QuotationForm })));
const QuotationDetail = React.lazy(() => import('./features/quotations/QuotationDetail').then(m => ({ default: m.QuotationDetail })));
const POSPage = React.lazy(() => import('./features/sales/POSPage').then(m => ({ default: m.POSPage })));
const InvoicesPage = React.lazy(() => import('./features/sales/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const InvoiceDetail = React.lazy(() => import('./features/sales/InvoiceDetail').then(m => ({ default: m.InvoiceDetail })));
const SuppliersPage = React.lazy(() => import('./features/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })));
const SupplierDetail = React.lazy(() => import('./features/suppliers/SupplierDetail').then(m => ({ default: m.SupplierDetail })));
const PurchasesPage = React.lazy(() => import('./features/purchases/PurchasesPage').then(m => ({ default: m.PurchasesPage })));
const PurchaseOrderForm = React.lazy(() => import('./features/purchases/PurchaseOrderForm').then(m => ({ default: m.PurchaseOrderForm })));
const ProjectsPage = React.lazy(() => import('./features/projects/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProjectDetail = React.lazy(() => import('./features/projects/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const DeliveryPage = React.lazy(() => import('./features/delivery/DeliveryPage').then(m => ({ default: m.DeliveryPage })));
const WarrantyPage = React.lazy(() => import('./features/warranty/WarrantyPage').then(m => ({ default: m.WarrantyPage })));
const AccountingPage = React.lazy(() => import('./features/accounting/AccountingPage').then(m => ({ default: m.AccountingPage })));
const EmployeesPage = React.lazy(() => import('./features/employees/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const CatalogPage = React.lazy(() => import('./features/catalog/CatalogPage').then(m => ({ default: m.CatalogPage })));
const ReportsPage = React.lazy(() => import('./features/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = React.lazy(() => import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 size={24} className="animate-spin text-primary-500" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/auth/login" element={
          <GuestGuard>
            <LoginPage />
          </GuestGuard>
        } />

        {/* Protected app routes */}
        <Route path="/" element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          } />

          {/* Inventory */}
          <Route path="inventory/products" element={
            <Suspense fallback={<PageLoader />}>
              <ProductsPage />
            </Suspense>
          } />
          <Route path="inventory/categories" element={
            <Suspense fallback={<PageLoader />}>
              <CategoriesPage />
            </Suspense>
          } />
          <Route path="inventory/stock" element={
            <Suspense fallback={<PageLoader />}>
              <StockOperationsPage />
            </Suspense>
          } />

          {/* Catalog */}
          <Route path="catalog" element={
            <Suspense fallback={<PageLoader />}>
              <CatalogPage />
            </Suspense>
          } />

          {/* Customers */}
          <Route path="customers" element={
            <Suspense fallback={<PageLoader />}>
              <CustomersPage />
            </Suspense>
          } />
          <Route path="customers/:id" element={
            <Suspense fallback={<PageLoader />}>
              <CustomerDetail />
            </Suspense>
          } />

          {/* Quotations */}
          <Route path="quotations" element={
            <Suspense fallback={<PageLoader />}>
              <QuotationsPage />
            </Suspense>
          } />
          <Route path="quotations/new" element={
            <Suspense fallback={<PageLoader />}>
              <QuotationForm />
            </Suspense>
          } />
          <Route path="quotations/:id" element={
            <Suspense fallback={<PageLoader />}>
              <QuotationDetail />
            </Suspense>
          } />
          <Route path="quotations/:id/edit" element={
            <Suspense fallback={<PageLoader />}>
              <QuotationForm />
            </Suspense>
          } />

          {/* Sales */}
          <Route path="sales/pos" element={
            <Suspense fallback={<PageLoader />}>
              <POSPage />
            </Suspense>
          } />
          <Route path="sales/invoices" element={
            <Suspense fallback={<PageLoader />}>
              <InvoicesPage />
            </Suspense>
          } />
          <Route path="sales/invoices/:id" element={
            <Suspense fallback={<PageLoader />}>
              <InvoiceDetail />
            </Suspense>
          } />

          {/* Suppliers */}
          <Route path="suppliers" element={
            <Suspense fallback={<PageLoader />}>
              <SuppliersPage />
            </Suspense>
          } />
          <Route path="suppliers/:id" element={
            <Suspense fallback={<PageLoader />}>
              <SupplierDetail />
            </Suspense>
          } />

          {/* Purchases */}
          <Route path="purchases" element={
            <Suspense fallback={<PageLoader />}>
              <PurchasesPage />
            </Suspense>
          } />
          <Route path="purchases/new" element={
            <Suspense fallback={<PageLoader />}>
              <PurchaseOrderForm />
            </Suspense>
          } />
          <Route path="purchases/:id" element={
            <Suspense fallback={<PageLoader />}>
              <PurchaseOrderForm />
            </Suspense>
          } />

          {/* Projects */}
          <Route path="projects" element={
            <Suspense fallback={<PageLoader />}>
              <ProjectsPage />
            </Suspense>
          } />
          <Route path="projects/:id" element={
            <Suspense fallback={<PageLoader />}>
              <ProjectDetail />
            </Suspense>
          } />

          {/* Delivery */}
          <Route path="delivery" element={
            <Suspense fallback={<PageLoader />}>
              <DeliveryPage />
            </Suspense>
          } />

          {/* Warranty */}
          <Route path="warranty" element={
            <Suspense fallback={<PageLoader />}>
              <WarrantyPage />
            </Suspense>
          } />

          {/* Accounting */}
          <Route path="accounting" element={
            <Suspense fallback={<PageLoader />}>
              <AccountingPage />
            </Suspense>
          } />
          <Route path="accounting/expenses" element={
            <Suspense fallback={<PageLoader />}>
              <AccountingPage />
            </Suspense>
          } />
          <Route path="accounting/payments" element={
            <Suspense fallback={<PageLoader />}>
              <AccountingPage />
            </Suspense>
          } />

          {/* Employees */}
          <Route path="employees" element={
            <Suspense fallback={<PageLoader />}>
              <EmployeesPage />
            </Suspense>
          } />

          {/* Reports */}
          <Route path="reports" element={
            <Suspense fallback={<PageLoader />}>
              <ReportsPage />
            </Suspense>
          } />

          {/* Settings */}
          <Route path="settings" element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          } />
          <Route path="settings/profile" element={
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Root redirect */}
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
