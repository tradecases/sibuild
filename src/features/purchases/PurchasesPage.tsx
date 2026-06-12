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
import type { PurchaseOrder, POStatus } from '../../types';

export function PurchasesPage() {
  const navigate = useNavigate();
  const { toast } = useUiStore();

  const [orders, setOrders] = useState<(PurchaseOrder & { supplier?: any; warehouse?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalValue: 0, totalPaid: 0, outstanding: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load purchase orders
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('purchase_orders')
          .select('*, supplier:suppliers(*), warehouse:warehouses(*)', { count: 'exact' });

        if (searchTerm) {
          query = query.or(
            `po_number.ilike.%${searchTerm}%,supplier.name.ilike.%${searchTerm}%`
          );
        }

        if (statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }

        const { data, count, error } = await query
          .order('order_date', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) throw error;

        setOrders(data || []);
        setTotal(count || 0);

        // Load stats
        const { data: allOrders } = await supabase
          .from('purchase_orders')
          .select('total_amount, paid_amount, balance_due');

        if (allOrders) {
          const totalValue = allOrders.reduce((sum, po) => sum + po.total_amount, 0);
          const totalPaid = allOrders.reduce((sum, po) => sum + po.paid_amount, 0);
          const outstanding = allOrders.reduce((sum, po) => sum + (po.balance_due || 0), 0);
          setStats({ totalValue, totalPaid, outstanding });
        }
      } catch (err) {
        console.error('Error loading orders:', err);
        toast({ message: 'Failed to load purchase orders', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [searchTerm, statusFilter, page, pageSize, toast]);

  // Delete order
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
      setOrders(orders.filter(po => po.id !== id));
      toast({ message: 'Purchase order deleted', type: 'success' });
    } catch (err) {
      console.error('Error deleting order:', err);
      toast({ message: 'Failed to delete order', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const data = orders.map(po => ({
      'PO #': po.po_number,
      Date: formatDate(po.order_date),
      Supplier: po.supplier?.name,
      Warehouse: po.warehouse?.name,
      Items: po.items?.length || 0,
      Total: po.total_amount,
      Paid: po.paid_amount,
      Balance: po.balance_due,
      Status: po.status,
    }));

    downloadCSV(data, `purchase-orders-${new Date().toISOString().split('T')[0]}`);
    toast({ message: 'Exported successfully', type: 'success' });
  };

  const statusBadgeVariant = (status: POStatus) => {
    switch (status) {
      case 'received':
        return 'success';
      case 'draft':
        return 'outline';
      case 'sent':
        return 'info';
      case 'partial':
        return 'warning';
      case 'cancelled':
        return 'danger';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Total: {total} orders</p>
        </div>
        <Button onClick={() => navigate('/purchases/new')}>New Purchase Order</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          trend="up"
          trendValue="+10%"
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(stats.totalPaid)}
          trend="up"
          trendValue="+8%"
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(stats.outstanding)}
          trend="down"
          trendValue="-3%"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search PO #, supplier..." />

          <Select
            value={statusFilter}
            onChange={v => {
              setStatusFilter(v as POStatus | 'all');
              setPage(1);
            }}
            options={[
              { label: 'All Status', value: 'all' },
              { label: 'Draft', value: 'draft' },
              { label: 'Sent', value: 'sent' },
              { label: 'Partial', value: 'partial' },
              { label: 'Received', value: 'received' },
              { label: 'Cancelled', value: 'cancelled' },
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
          <SkeletonTable rows={10} cols={9} />
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No purchase orders found</p>
          </div>
        ) : (
          <>
            <Table
              columns={[
                { key: 'po_number', label: 'PO #', width: '12%' },
                { key: 'order_date', label: 'Date', width: '12%', render: (v) => formatDate(v) },
                { key: 'supplier_name', label: 'Supplier', width: '15%', render: (_, row: any) => row.supplier?.name },
                { key: 'warehouse_name', label: 'Warehouse', width: '15%', render: (_, row: any) => row.warehouse?.name },
                { key: 'items_count', label: 'Items', width: '8%', render: (_, row: any) => row.items?.length || 0 },
                { key: 'total_amount', label: 'Total', width: '12%', render: (v) => formatCurrency(v) },
                { key: 'paid_amount', label: 'Paid', width: '12%', render: (v) => formatCurrency(v) },
                { key: 'balance_due', label: 'Balance', width: '12%', render: (v) => formatCurrency(v) },
                {
                  key: 'status',
                  label: 'Status',
                  width: '10%',
                  render: (v) => <Badge variant={statusBadgeVariant(v)}>{v}</Badge>,
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  width: '16%',
                  render: (_, po: any) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/purchases/${po.id}`)}>
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(po.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={orders}
              striped
              rowClickable
              onRowClick={(po) => navigate(`/purchases/${po.id}`)}
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

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        title="Delete Purchase Order"
        message="Are you sure? This action cannot be undone."
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
}
