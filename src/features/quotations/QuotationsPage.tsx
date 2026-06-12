import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate, downloadCSV } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import { Pagination } from '../../components/ui/Pagination';
import { SearchBar } from '../../components/ui/SearchBar';
import { ConfirmModal } from '../../components/ui/Modal';
import type { Quotation, QuotationStatus } from '../../types';

export function QuotationsPage() {
  const navigate = useNavigate();
  const { toast } = useUiStore();

  const [quotations, setQuotations] = useState<(Quotation & { customer?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalQuoted: 0, totalAccepted: 0, conversionRate: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load quotations
  useEffect(() => {
    const loadQuotations = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('quotations')
          .select('*, customer:customers(*)', { count: 'exact' });

        if (searchTerm) {
          query = query.or(
            `quotation_number.ilike.%${searchTerm}%,customer.name.ilike.%${searchTerm}%`
          );
        }

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, count, error } = await query
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) throw error;

        setQuotations(data || []);
        setTotal(count || 0);

        // Load stats
        const { data: allQuotations } = await supabase
          .from('quotations')
          .select('status, total_amount');

        if (allQuotations) {
          const totalQuoted = allQuotations.reduce((sum, q) => sum + q.total_amount, 0);
          const acceptedCount = allQuotations.filter(q => q.status === 'accepted').length;
          const totalCount = allQuotations.length;
          const conversionRate = totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;

          const totalAccepted = allQuotations
            .filter(q => q.status === 'accepted')
            .reduce((sum, q) => sum + q.total_amount, 0);

          setStats({ totalQuoted, totalAccepted, conversionRate });
        }
      } catch (err) {
        console.error('Error loading quotations:', err);
        toast({ message: 'Failed to load quotations', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadQuotations();
  }, [searchTerm, statusFilter, page, pageSize, toast]);

  // Delete quotation
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
      setQuotations(quotations.filter(q => q.id !== id));
      toast({ message: 'Quotation deleted', type: 'success' });
    } catch (err) {
      console.error('Error deleting quotation:', err);
      toast({ message: 'Failed to delete quotation', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const data = quotations.map(q => ({
      'Quote #': q.quotation_number,
      Date: formatDate(q.created_at),
      Customer: q.customer?.name,
      'Valid Until': formatDate(q.valid_until),
      Items: q.items?.length || 0,
      Total: q.total_amount,
      Status: q.status,
    }));

    downloadCSV(data, `quotations-${new Date().toISOString().split('T')[0]}`);
    toast({ message: 'Exported successfully', type: 'success' });
  };

  const statusBadgeVariant = (status: QuotationStatus) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'draft':
        return 'outline';
      case 'sent':
        return 'info';
      case 'rejected':
      case 'expired':
        return 'danger';
      case 'converted':
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
          <h1 className="text-3xl font-bold text-gray-900">Quotations</h1>
          <p className="text-gray-600">Total: {total} quotations</p>
        </div>
        <Button onClick={() => navigate('/quotations/new')}>New Quotation</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Quoted"
          value={formatCurrency(stats.totalQuoted)}
          trend="up"
          trendValue="+15%"
        />
        <StatCard
          title="Total Accepted"
          value={formatCurrency(stats.totalAccepted)}
          trend="up"
          trendValue="+8%"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate.toFixed(1)}%`}
          trend="up"
          trendValue="+2%"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search quote #, customer..." />

          <Select
            value={statusFilter}
            onChange={v => {
              setStatusFilter(v as QuotationStatus | 'all');
              setPage(1);
            }}
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Draft', value: 'draft' },
              { label: 'Sent', value: 'sent' },
              { label: 'Accepted', value: 'accepted' },
              { label: 'Rejected', value: 'rejected' },
              { label: 'Expired', value: 'expired' },
              { label: 'Converted', value: 'converted' },
            ]}
          />

          <Button variant="outline" onClick={handleExportCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} cols={8} />
        ) : quotations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No quotations found</p>
          </div>
        ) : (
          <>
            <Table
              columns={[
                { key: 'quotation_number', label: 'Quote #', width: '12%' },
                { key: 'customer_name', label: 'Customer', width: '18%', render: (_, row: any) => row.customer?.name },
                { key: 'created_at', label: 'Date', width: '12%', render: (v) => formatDate(v) },
                { key: 'valid_until', label: 'Valid Until', width: '12%', render: (v) => formatDate(v) },
                { key: 'items_count', label: 'Items', width: '10%', render: (_, row: any) => row.items?.length || 0 },
                { key: 'total_amount', label: 'Total', width: '12%', render: (v) => formatCurrency(v) },
                {
                  key: 'status',
                  label: 'Status',
                  width: '12%',
                  render: (v) => <Badge variant={statusBadgeVariant(v)}>{v}</Badge>,
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  width: '20%',
                  render: (_, quotation: any) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/quotations/${quotation.id}`)}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(quotation.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={quotations}
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
        title="Delete Quotation"
        message="Are you sure? This action cannot be undone."
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
}
