import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmModal } from '../../components/ui/Modal';
import type { Supplier } from '../../types';

export function SuppliersPage() {
  const navigate = useNavigate();
  const { toast } = useUiStore();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load suppliers
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from('suppliers')
          .select('*', { count: 'exact' });

        if (searchTerm) {
          query = query.or(
            `name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
          );
        }

        const { data, count, error } = await query
          .order('name')
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) throw error;

        setSuppliers(data || []);
        setTotal(count || 0);
      } catch (err) {
        console.error('Error loading suppliers:', err);
        toast({ message: 'Failed to load suppliers', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadSuppliers();
  }, [searchTerm, page, pageSize, toast]);

  // Delete supplier
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setSuppliers(suppliers.filter(s => s.id !== id));
      toast({ message: 'Supplier deleted', type: 'success' });
    } catch (err) {
      console.error('Error deleting supplier:', err);
      toast({ message: 'Failed to delete supplier', type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">Total: {total} suppliers</p>
        </div>
        <Button onClick={() => navigate('/suppliers/new')}>New Supplier</Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search supplier name, code, email, phone..." />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <SkeletonTable rows={10} cols={8} />
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No suppliers found</p>
          </div>
        ) : (
          <>
            <Table
              columns={[
                { key: 'code', label: 'Code', width: '10%' },
                { key: 'name', label: 'Name', width: '18%' },
                { key: 'contact_person', label: 'Contact Person', width: '15%' },
                { key: 'phone', label: 'Phone', width: '15%' },
                { key: 'email', label: 'Email', width: '18%' },
                { key: 'payment_terms', label: 'Terms (days)', width: '10%' },
                {
                  key: 'outstanding_balance',
                  label: 'Outstanding',
                  width: '12%',
                  render: (v) => formatCurrency(v),
                },
                {
                  key: 'is_active',
                  label: 'Status',
                  width: '8%',
                  render: (v) => <span className={v ? 'text-green-600 font-semibold' : 'text-gray-500'}>{v ? 'Active' : 'Inactive'}</span>,
                },
                {
                  key: 'discount_percentage',
                  label: 'Discount',
                  width: '8%',
                  render: (v) => <span className="text-sm font-medium">{v ? `${v}%` : '-'}</span>,
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  width: '18%',
                  render: (_, supplier: any) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteConfirm(supplier.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={suppliers}
              striped
              rowClickable
              onRowClick={(supplier) => navigate(`/suppliers/${supplier.id}`)}
            />

            {/* Pagination */}
            <div className="p-4 border-t flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
              </span>
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
        title="Delete Supplier"
        message="Are you sure? This action cannot be undone."
        confirmText="Delete"
        isDangerous
      />
    </div>
  );
}
