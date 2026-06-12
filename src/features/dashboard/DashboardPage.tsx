import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Package, AlertTriangle, Clock, Users, FileText, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Invoice, Quotation, Product, StockLevel, Customer } from '../../types';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

type DateRange = 'today' | 'week' | 'month' | 'year';

interface DashboardStats {
  todaysSales: number;
  monthlyRevenue: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  pendingQuotations: number;
  activeCustomers: number;
}

interface ChartData {
  month: string;
  revenue: number;
}

interface CategoryData {
  category: string;
  sales: number;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaysSales: 0,
    monthlyRevenue: 0,
    totalInventoryValue: 0,
    lowStockCount: 0,
    outstandingReceivables: 0,
    outstandingPayables: 0,
    pendingQuotations: 0,
    activeCustomers: 0,
  });

  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<(Product & { stock_levels?: StockLevel[] })[]>([]);
  const [pendingQuotations, setPendingQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange] = useState<DateRange>('month');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadRevenueData(),
        loadCategoryData(),
        loadRecentInvoices(),
        loadLowStockProducts(),
        loadPendingQuotations(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Today's sales
      const today = new Date().toISOString().split('T')[0];
      const { data: todayInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('created_at', today);
      const todaysSales = todayInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      // Monthly revenue
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthInvoices } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('status', 'paid')
        .gte('created_at', monthStart);
      const monthlyRevenue = monthInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      // Total inventory value
      const { data: products } = await supabase
        .from('products')
        .select('cost_price, stock_levels(quantity)');
      let totalInventoryValue = 0;
      if (products) {
        products.forEach(p => {
          const quantity = p.stock_levels?.reduce((sum: number, sl: any) => sum + (sl.quantity || 0), 0) || 0;
          totalInventoryValue += (p.cost_price || 0) * quantity;
        });
      }

      // Low stock count
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, reorder_level, stock_levels(quantity)');
      let lowStockCount = 0;
      if (allProducts) {
        allProducts.forEach(p => {
          const totalQty = p.stock_levels?.reduce((sum: number, sl: any) => sum + (sl.quantity || 0), 0) || 0;
          if (totalQty <= (p.reorder_level || 0)) lowStockCount++;
        });
      }

      // Outstanding receivables
      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('balance_due')
        .in('status', ['issued', 'partial', 'overdue']);
      const outstandingReceivables = unpaidInvoices?.reduce((sum, inv) => sum + (inv.balance_due || 0), 0) || 0;

      // Outstanding payables (from purchase orders)
      const { data: unpaidPOs } = await supabase
        .from('purchase_orders')
        .select('total_amount, paid_amount')
        .in('status', ['sent', 'partial', 'received']);
      const outstandingPayables = unpaidPOs?.reduce((sum, po) => sum + ((po.total_amount || 0) - (po.paid_amount || 0)), 0) || 0;

      // Pending quotations
      const { count: pendingCount } = await supabase
        .from('quotations')
        .select('*', { count: 'exact' })
        .in('status', ['draft', 'sent']);
      const pendingQuotations = pendingCount || 0;

      // Active customers
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('is_active', true);
      const activeCustomers = customerCount || 0;

      setStats({
        todaysSales,
        monthlyRevenue,
        totalInventoryValue,
        lowStockCount,
        outstandingReceivables,
        outstandingPayables,
        pendingQuotations,
        activeCustomers,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRevenueData = async () => {
    try {
      const months = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (6 - i));
        return d;
      });

      const data: ChartData[] = [];

      for (const month of months) {
        const monthStart = new Date(month.getFullYear(), month.getMonth(), 1).toISOString();
        const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString();

        const { data: invoices } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('status', 'paid')
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd);

        const revenue = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
        data.push({
          month: month.toLocaleDateString('en-AE', { month: 'short' }),
          revenue,
        });
      }

      setRevenueData(data);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    }
  };

  const loadCategoryData = async () => {
    try {
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('total_amount, product:products(category:categories(name))');

      const categoryMap: Record<string, number> = {};
      if (invoiceItems) {
        invoiceItems.forEach(item => {
          const category = (item.product as any)?.category?.name || 'Other';
          categoryMap[category] = (categoryMap[category] || 0) + (item.total_amount || 0);
        });
      }

      const data = Object.entries(categoryMap)
        .map(([category, sales]) => ({ category, sales }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 6);

      setCategoryData(data);
    } catch (error) {
      console.error('Error loading category data:', error);
    }
  };

  const loadRecentInvoices = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentInvoices(data || []);
    } catch (error) {
      console.error('Error loading recent invoices:', error);
    }
  };

  const loadLowStockProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*, stock_levels(quantity, warehouse:warehouses(name))')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        const filtered = data.filter(p => {
          const totalQty = p.stock_levels?.reduce((sum: number, sl: any) => sum + (sl.quantity || 0), 0) || 0;
          return totalQty <= (p.reorder_level || 0);
        });
        setLowStockProducts(filtered);
      }
    } catch (error) {
      console.error('Error loading low stock products:', error);
    }
  };

  const loadPendingQuotations = async () => {
    try {
      const { data } = await supabase
        .from('quotations')
        .select('*, customer:customers(name)')
        .in('status', ['draft', 'sent'])
        .order('created_at', { ascending: false })
        .limit(5);

      setPendingQuotations(data || []);
    } catch (error) {
      console.error('Error loading pending quotations:', error);
    }
  };

  const colors = ['#0F172A', '#14B8A6', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Welcome back! Here's your business overview.</p>
        </div>
        <div className="flex gap-2">
          <Button leftIcon={<Plus size={16} />}>New Sale</Button>
          <Button variant="secondary">Export</Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats.todaysSales)}
          icon={<DollarSign size={20} />}
          color="success"
          loading={loading}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          icon={<TrendingUp size={20} />}
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(stats.totalInventoryValue)}
          icon={<Package size={20} />}
          color="accent"
          loading={loading}
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount}
          icon={<AlertTriangle size={20} />}
          color="warning"
          loading={loading}
        />
        <StatCard
          title="Outstanding Receivables"
          value={formatCurrency(stats.outstandingReceivables)}
          icon={<Clock size={20} />}
          color="danger"
          loading={loading}
        />
        <StatCard
          title="Outstanding Payables"
          value={formatCurrency(stats.outstandingPayables)}
          icon={<DollarSign size={20} />}
          color="warning"
          loading={loading}
        />
        <StatCard
          title="Pending Quotations"
          value={stats.pendingQuotations}
          icon={<FileText size={20} />}
          color="primary"
          loading={loading}
        />
        <StatCard
          title="Active Customers"
          value={stats.activeCustomers}
          icon={<Users size={20} />}
          color="accent"
          loading={loading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card title="Revenue Trend (Last 7 Months)">
          {loading ? (
            <SkeletonTable rows={4} cols={2} />
          ) : revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#14B8A6" fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No revenue data" description="Sales data will appear here" size="sm" />
          )}
        </Card>

        {/* Sales by Category */}
        <Card title="Sales by Category">
          {loading ? (
            <SkeletonTable rows={4} cols={2} />
          ) : categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => formatCurrency(value as number)}
                />
                <Legend />
                <Bar dataKey="sales" fill="#0F172A" radius={[8, 8, 0, 0]}>
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No category data" description="Category sales will appear here" size="sm" />
          )}
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card title="Recent Invoices" className="lg:col-span-2">
          {loading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {recentInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{(invoice.customer as any)?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(invoice.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-slate-900">{formatCurrency(invoice.total_amount)}</p>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No invoices yet" description="Recent invoices will appear here" size="sm" />
          )}
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="space-y-2">
            <Button fullWidth variant="secondary" leftIcon={<Plus size={16} />}>New Sale</Button>
            <Button fullWidth variant="secondary" leftIcon={<Plus size={16} />}>New Quotation</Button>
            <Button fullWidth variant="secondary" leftIcon={<Plus size={16} />}>New Customer</Button>
            <Button fullWidth variant="secondary" leftIcon={<Package size={16} />}>Stock In</Button>
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts & Pending Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card title="Low Stock Alerts" className="border-warning-200">
          {loading ? (
            <SkeletonTable rows={4} cols={3} />
          ) : lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {lowStockProducts.map(product => {
                const totalQty = product.stock_levels?.reduce((sum, sl) => sum + (sl.quantity || 0), 0) || 0;
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 rounded-lg bg-warning-50 hover:bg-warning-100 transition-colors border border-warning-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">SKU: {product.sku || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-danger-600">{totalQty} units</p>
                      <p className="text-xs text-slate-500">Reorder: {product.reorder_level}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="All items stocked well" description="No items below reorder level" size="sm" />
          )}
        </Card>

        {/* Pending Quotations */}
        <Card title="Pending Quotations">
          {loading ? (
            <SkeletonTable rows={4} cols={3} />
          ) : pendingQuotations.length > 0 ? (
            <div className="space-y-2">
              {pendingQuotations.map(quotation => (
                <div key={quotation.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{(quotation.customer as any)?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatRelativeTime(quotation.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-slate-900">{formatCurrency(quotation.total_amount)}</p>
                    <StatusBadge status={quotation.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No pending quotations" description="Quotations will appear here" size="sm" />
          )}
        </Card>
      </div>
    </div>
  );
}
