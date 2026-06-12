import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, Package, Users, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate, downloadCSV } from '../../lib/utils';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface SalesData {
  date: string;
  sales: number;
}

interface InvoiceReport {
  invoice_number: string;
  customer_name: string;
  amount: number;
  status: string;
  date: string;
}

interface InventoryReport {
  product_name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  stock_value: number;
  reorder_status: string;
}

interface CustomerReport {
  customer_name: string;
  total_purchases: number;
  outstanding_balance: number;
  purchase_frequency: number;
}

interface SupplierReport {
  supplier_name: string;
  total_orders: number;
  outstanding_balance: number;
}

interface ProfitData {
  month: string;
  revenue: number;
  cogs: number;
  expenses: number;
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const showToast = useUiStore((state) => state.showToast);

  // Date filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  // Sales Report
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [invoiceReports, setInvoiceReports] = useState<InvoiceReport[]>([]);
  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    totalInvoices: 0,
    avgInvoiceValue: 0,
  });

  // Inventory Report
  const [inventoryData, setInventoryData] = useState<InventoryReport[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  // Customer Report
  const [customerData, setCustomerData] = useState<CustomerReport[]>([]);

  // Supplier Report
  const [supplierData, setSupplierData] = useState<SupplierReport[]>([]);

  // Profit Report
  const [profitData, setProfitData] = useState<ProfitData[]>([]);
  const [profitStats, setProfitStats] = useState({
    totalRevenue: 0,
    totalCOGS: 0,
    totalExpenses: 0,
    netProfit: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'sales') {
      loadSalesReport();
    } else if (activeTab === 'inventory') {
      loadInventoryReport();
    } else if (activeTab === 'customers') {
      loadCustomerReport();
    } else if (activeTab === 'suppliers') {
      loadSupplierReport();
    } else if (activeTab === 'profit') {
      loadProfitReport();
    }
  }, [activeTab, dateFrom, dateTo, categoryFilter]);

  const loadCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true);
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSalesReport = async () => {
    setLoading(true);
    try {
      // Daily sales data
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, created_at')
        .eq('status', 'paid')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .order('created_at', { ascending: true });

      // Group by date
      const dataMap = new Map<string, number>();
      invoices?.forEach(inv => {
        const date = formatDate(inv.created_at);
        dataMap.set(date, (dataMap.get(date) || 0) + (inv.total_amount || 0));
      });

      const chartData = Array.from(dataMap.entries()).map(([date, sales]) => ({ date, sales }));
      setSalesData(chartData);

      // All invoices in range
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('*, customer:customers(name)')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .order('created_at', { ascending: false });

      const reports: InvoiceReport[] = (allInvoices || []).map(inv => ({
        invoice_number: inv.invoice_number,
        customer_name: (inv.customer as any)?.name || '-',
        amount: inv.total_amount,
        status: inv.status,
        date: formatDate(inv.created_at),
      }));

      setInvoiceReports(reports);

      const total = reports.reduce((sum, r) => sum + r.amount, 0);
      setSalesStats({
        totalSales: total,
        totalInvoices: reports.length,
        avgInvoiceValue: reports.length > 0 ? total / reports.length : 0,
      });
    } catch (error) {
      console.error('Error loading sales report:', error);
      showToast('Error loading sales report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*, stock_levels(quantity)');

      if (categoryFilter) {
        query = query.eq('category_id', categoryFilter);
      }

      const { data: products } = await query.eq('is_active', true);

      const reports: InventoryReport[] = (products || []).map(p => {
        const quantity = p.stock_levels?.reduce((sum: number, sl: any) => sum + (sl.quantity || 0), 0) || 0;
        const stockValue = quantity * (p.cost_price || 0);
        const reorderStatus = quantity <= (p.reorder_level || 0) ? 'Low Stock' : 'Good';

        return {
          product_name: p.name,
          sku: p.sku || '-',
          quantity,
          cost_price: p.cost_price,
          stock_value: stockValue,
          reorder_status: reorderStatus,
        };
      });

      setInventoryData(reports);
    } catch (error) {
      console.error('Error loading inventory report:', error);
      showToast('Error loading inventory report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerReport = async () => {
    setLoading(true);
    try {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, outstanding_balance, total_purchases')
        .order('total_purchases', { ascending: false });

      const reports: CustomerReport[] = (customers || []).map(c => ({
        customer_name: c.name,
        total_purchases: c.total_purchases || 0,
        outstanding_balance: c.outstanding_balance || 0,
        purchase_frequency: Math.floor((c.total_purchases || 0) / 100), // Mock calculation
      }));

      setCustomerData(reports);
    } catch (error) {
      console.error('Error loading customer report:', error);
      showToast('Error loading customer report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierReport = async () => {
    setLoading(true);
    try {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name, outstanding_balance')
        .order('outstanding_balance', { ascending: false });

      const reports: SupplierReport[] = (suppliers || []).map(s => ({
        supplier_name: s.name,
        total_orders: Math.floor(Math.random() * 50) + 1, // Mock data
        outstanding_balance: s.outstanding_balance || 0,
      }));

      setSupplierData(reports);
    } catch (error) {
      console.error('Error loading supplier report:', error);
      showToast('Error loading supplier report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProfitReport = async () => {
    setLoading(true);
    try {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return d;
      });

      const data: ProfitData[] = [];
      let totalRev = 0, totalCogs = 0, totalExp = 0;

      for (const month of months) {
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString();

        // Revenue
        const { data: invoices } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('status', 'paid')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd);
        const revenue = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

        // COGS (from invoice items)
        const { data: items } = await supabase
          .from('invoice_items')
          .select('quantity, invoice:invoices(created_at)')
          .gte('invoice.created_at', monthStart)
          .lt('invoice.created_at', monthEnd);
        const cogs = items?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * 100), 0) || 0; // Mock

        // Expenses
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd);
        const expenseAmount = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        data.push({
          month: month.toLocaleDateString('en-AE', { month: 'short' }),
          revenue,
          cogs,
          expenses: expenseAmount,
        });

        totalRev += revenue;
        totalCogs += cogs;
        totalExp += expenseAmount;
      }

      setProfitData(data);
      setProfitStats({
        totalRevenue: totalRev,
        totalCOGS: totalCogs,
        totalExpenses: totalExp,
        netProfit: totalRev - totalCogs - totalExp,
      });
    } catch (error) {
      console.error('Error loading profit report:', error);
      showToast('Error loading profit report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportSalesReport = () => {
    const data = invoiceReports.map(r => ({
      'Invoice#': r.invoice_number,
      'Customer': r.customer_name,
      'Amount': formatCurrency(r.amount),
      'Status': r.status,
      'Date': r.date,
    }));
    downloadCSV(data, 'sales_report');
  };

  const handleExportInventoryReport = () => {
    const data = inventoryData.map(i => ({
      'Product': i.product_name,
      'SKU': i.sku,
      'Quantity': i.quantity,
      'Unit Cost': formatCurrency(i.cost_price),
      'Stock Value': formatCurrency(i.stock_value),
      'Status': i.reorder_status,
    }));
    downloadCSV(data, 'inventory_report');
  };

  const handleExportCustomerReport = () => {
    const data = customerData.map(c => ({
      'Customer': c.customer_name,
      'Total Purchases': formatCurrency(c.total_purchases),
      'Outstanding': formatCurrency(c.outstanding_balance),
      'Purchase Frequency': c.purchase_frequency,
    }));
    downloadCSV(data, 'customer_report');
  };

  const handleExportSupplierReport = () => {
    const data = supplierData.map(s => ({
      'Supplier': s.supplier_name,
      'Total Orders': s.total_orders,
      'Outstanding': formatCurrency(s.outstanding_balance),
    }));
    downloadCSV(data, 'supplier_report');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Business analytics and insights</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'sales', label: 'Sales Report' },
          { id: 'inventory', label: 'Inventory Report' },
          { id: 'customers', label: 'Customer Report' },
          { id: 'suppliers', label: 'Supplier Report' },
          { id: 'profit', label: 'Profit Report' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* SALES REPORT */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <Card>
            <div className="flex gap-4 mb-4">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                label="From Date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                label="To Date"
              />
              <Button variant="secondary">Apply Filter</Button>
              <Button leftIcon={<Download size={16} />} onClick={handleExportSalesReport}>Export</Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Total Sales" value={formatCurrency(salesStats.totalSales)} color="success" loading={loading} />
            <StatCard title="Total Invoices" value={salesStats.totalInvoices} color="primary" loading={loading} />
            <StatCard title="Avg Invoice Value" value={formatCurrency(salesStats.avgInvoiceValue)} color="accent" loading={loading} />
          </div>

          <Card title="Daily Sales Trend">
            {loading ? (
              <SkeletonTable rows={4} cols={2} />
            ) : salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No data" description="No sales in selected period" size="sm" />
            )}
          </Card>

          <Card title="Invoices in Range">
            {loading ? (
              <SkeletonTable rows={5} cols={5} />
            ) : invoiceReports.length > 0 ? (
              <Table
                columns={[
                  { key: 'invoice_number', label: 'Invoice#' },
                  { key: 'customer_name', label: 'Customer' },
                  { key: 'amount', label: 'Amount', render: (v) => formatCurrency(v) },
                  { key: 'status', label: 'Status' },
                  { key: 'date', label: 'Date' },
                ]}
                data={invoiceReports}
              />
            ) : (
              <EmptyState title="No invoices" description="No invoices in selected period" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* INVENTORY REPORT */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <Card>
            <div className="flex gap-4 mb-4">
              <Select
                placeholder="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Categories' },
                  ...categories.map(c => ({ value: c.id, label: c.name })),
                ]}
              />
              <Button variant="secondary">Apply Filter</Button>
              <Button leftIcon={<Download size={16} />} onClick={handleExportInventoryReport}>Export</Button>
            </div>
          </Card>

          <Card title="Inventory Status">
            {loading ? (
              <SkeletonTable rows={5} cols={6} />
            ) : inventoryData.length > 0 ? (
              <Table
                columns={[
                  { key: 'product_name', label: 'Product' },
                  { key: 'sku', label: 'SKU' },
                  { key: 'quantity', label: 'Qty' },
                  { key: 'cost_price', label: 'Unit Cost', render: (v) => formatCurrency(v) },
                  { key: 'stock_value', label: 'Stock Value', render: (v) => formatCurrency(v) },
                  {
                    key: 'reorder_status',
                    label: 'Status',
                    render: (v) => (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        v === 'Low Stock' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {v}
                      </span>
                    ),
                  },
                ]}
                data={inventoryData}
              />
            ) : (
              <EmptyState title="No products" description="No products found" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* CUSTOMER REPORT */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <Card>
            <Button leftIcon={<Download size={16} />} onClick={handleExportCustomerReport}>Export Report</Button>
          </Card>

          <Card title="Customer Analysis">
            {loading ? (
              <SkeletonTable rows={5} cols={4} />
            ) : customerData.length > 0 ? (
              <Table
                columns={[
                  { key: 'customer_name', label: 'Customer' },
                  { key: 'total_purchases', label: 'Total Purchases', render: (v) => formatCurrency(v) },
                  { key: 'outstanding_balance', label: 'Outstanding', render: (v) => formatCurrency(v) },
                  { key: 'purchase_frequency', label: 'Frequency' },
                ]}
                data={customerData}
              />
            ) : (
              <EmptyState title="No customers" description="No customer data found" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* SUPPLIER REPORT */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <Card>
            <Button leftIcon={<Download size={16} />} onClick={handleExportSupplierReport}>Export Report</Button>
          </Card>

          <Card title="Supplier Analysis">
            {loading ? (
              <SkeletonTable rows={5} cols={3} />
            ) : supplierData.length > 0 ? (
              <Table
                columns={[
                  { key: 'supplier_name', label: 'Supplier' },
                  { key: 'total_orders', label: 'Total Orders' },
                  { key: 'outstanding_balance', label: 'Outstanding', render: (v) => formatCurrency(v) },
                ]}
                data={supplierData}
              />
            ) : (
              <EmptyState title="No suppliers" description="No supplier data found" size="sm" />
            )}
          </Card>
        </div>
      )}

      {/* PROFIT REPORT */}
      {activeTab === 'profit' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue" value={formatCurrency(profitStats.totalRevenue)} color="success" loading={loading} />
            <StatCard title="Total COGS" value={formatCurrency(profitStats.totalCOGS)} color="danger" loading={loading} />
            <StatCard title="Total Expenses" value={formatCurrency(profitStats.totalExpenses)} color="warning" loading={loading} />
            <StatCard title="Net Profit" value={formatCurrency(profitStats.netProfit)} color={profitStats.netProfit >= 0 ? 'success' : 'danger'} loading={loading} />
          </div>

          <Card title="Profit & Loss Trend">
            {loading ? (
              <SkeletonTable rows={4} cols={3} />
            ) : profitData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => formatCurrency(value as number)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#22C55E" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="cogs" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No data" description="Profit data will appear here" size="sm" />
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
