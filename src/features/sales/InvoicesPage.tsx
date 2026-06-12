import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate, downloadCSV } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBar } from '../../components/ui/SearchBar';
import { ConfirmModal } from '../../components/ui/Modal';
import type { Invoice, InvoiceStatus } from '../../types';

export function InvoicesPage() {
  const navigate = useNavigate();
  const { toast } = useUiStore();
  const { user } = useAuthStore();

  const [invoices, setInvoices] = useState<(Invoice & { customer?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalInvoiced: 0, totalPaid: 0, outstanding: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load invoices
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('invoices')
          .select('*, customer:customers(*)', { count: 'exact' });

        if (searchTerm) {
          query = query.or(
            `invoice_number.ilike.%${searchTerm}%,customer.name.ilike.%${searchTerm}%`
          );
        }

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        if (dateFrom) {
          query = query.gte('invoice_date', new Date(dateFrom).toISOString());
        }

        if (dateTo) {
          query = query.lte('invoice_date', new Date(dateTo).toISOString());
        }

        const { data, count, error } = await query
          .order('invoice_date', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) throw error;

        setInvoices(data || []);
        setTotal(count || 0);

        // Load stats for this month
        const monthStart = new Date();
        monthStart.setDate(1);

        const { data: monthInvoices } = await supabase
          .from('invoices')
          .select('total_amount, paid_amount, balance_due')
          .gte('invoice_date', monthStart.toISOString());

        if (monthInvoices) {
          const totalInvoiced = monthInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
          const totalPaid = monthInvoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
          const outstanding = monthInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);
          setStats({ totalInvoiced, totalPaid, outstanding });
        }
      } catch (err) {
        console.error('Error loading invoices:', err);
        toast({ message: 'Failed to load invoices', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [searchTerm, statusFilter, dateFrom, dateTo, page, pageSize, toast]);

  // Delete invoice
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id);
      if (error) throw error;
      setInvoices(invoices.filter(inv => inv.id !== id));
      toast({ message: 'Invoice deleted', type: 'success' });
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast({ message: 'Failed to delete invoice', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Mark as paid
  const handleMarkPaid = async (invoice: Invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          paid_amount: invoice.total_amount,
          balance_due: 0,
          status: 'paid',
        })
        .eq('id', invoice.id);

      if (error) throw error;

      setInvoices(
        invoices.map(inv =>
          inv.id === invoice.id
            ? {
                ...inv,
                paid_amount: invoice.total_amount,
                balance_due: 0,
                status: 'paid' as const,
              }
            : inv
        )
      );

      toast({ message: 'Invoice marked as paid', type: 'success' });
    } catch (err) {
      console.error('Error marking paid:', err);
      toast({ message: 'Failed to mark as paid', type: 'error' });
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const data = invoices.map(inv => ({
      'Invoice #': inv.invoice_number,
      Date: formatDate(inv.invoice_date),
      Customer: inv.customer?.name,
      Items: inv.items?.length || 0,
      Subtotal: inv.subtotal,
      Tax: inv.tax_amount,
      Discount: inv.discount_amount,
      Total: inv.total_amount,
      Paid: inv.paid_amount,
      Balance: inv.balance_due,
      Status: inv.status,
    }));

    downloadCSV(data, `invoices-${new Date().toISOString().split('T')[0]}`);
    toast({ message: 'Exported successfully', type: 'success' });
  };

  const statusBadgeVariant = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'draft':
        return 'outline';
      case 'issued':
        return 'info';
      case 'partial':
        return 'warning';
      case 'overdue':
        return 'danger';
      case 'cancelled':
      case 'returned':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Total: {total} invoices</p>
        </div>
        <Button onClick={() => navigate('/sales/pos')}>New Invoice</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Invoiced (Month)"
          value={formatCurrency(stats.totalInvoiced)}
          trend="up"
          trendValue="+12%"
        />
        <StatCard
          title="Total Paid (Month)"
          value={formatCurrency(stats.totalPaid)}
          trend="up"
          trendValue="+8%"
        />
        <StatCard
          title="Outstanding (Month)"
          value={formatCurrency(stats.outstanding)}
          trend="down"
          trendValue="-5%"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search invoice #, customer..." />

          <Select
            value={statusFilter}
            onChange={v => {
              setStatusFilter(v as InvoiceStatus | 'all');
              setPage(1);
            }}
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Draft', value: 'draft' },
              { label: 'Issued', value: 'issued' },
              { label: 'Partial', value: 'partial' },
              { label: 'Paid', value: 'paid' },
              { label: 'Overdue', value: 'overdue' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
          />

          <Input
            type="date"
            value={dateFrom}
            onChange={e => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            placeholder="From date"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={e => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            placeholder="To date"
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} cols={10} />
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <>
            <Table
              columns={[
                { key: 'invoice_number', label: 'Invoice #', width: '12%' },
                { key: 'invoice_date', label: 'Date', width: '12%', render: (v) => formatDate(v) },
                { key: 'customer_name', label: 'Customer', width: '15%', render: (_, row: any) => row.customer?.name },
                { key: 'items_count', label: 'Items', width: '8%', render: (_, row: any) => row.items?.length || 0 },
                { key: 'subtotal', label: 'Subtotal', width: '10%', render: (v) => formatCurrency(v) },
                { key: 'tax_amount', label: 'Tax', width: '10%', render: (v) => formatCurrency(v) },
                { key: 'discount_amount', label: 'Discount', width: '10%', render: (v) => formatCurrency(v) },
                { key: 'total_amount', label: 'Total', width: '10%', render: (v) => formatCurrency(v) },
                { key: 'paid_amount', label: 'Paid', width: '10%', render: (v) => formatCurrency(v) },
                { key: 'balance_due', label: 'Balance', width: '10%', render: (v) => formatCurrency(v) },
                {
                  key: 'status',
                  label: 'Status',
                  width: '12%',
                  render: (v) => <Badge variant={statusBadgeVariant(v)}>{v}</Badge>,
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  width: '15%',
                  render: (_, invoice: any) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/sales/invoices/${invoice.id}`)}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMarkPaid(invoice)}
                        disabled={invoice.status === 'paid'}
                      >
                        Paid
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(invoice.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={invoices}
              striped
            />

            {/* Pagination */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
                </span>
                <Select
                  value={pageSize}
                  onChange={v => {
                    setPageSize(parseInt(v));
                    setPage(1);
                  }}
                  options={[
                    { label: '10 per page', value: '10' },
                    { label: '25 per page', value: '25' },
                    { label: '50 per page', value: '50' },
                  ]}
                  className="w-40"
                />
              </div>

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        title="Delete Invoice"
        message="Are you sure? This action cannot be undone."
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
}
