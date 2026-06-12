import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { Table, Column } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { CustomerForm } from './CustomerForm';
import type { Customer } from '../../types';

const customerTypeColors: Record<string, 'primary' | 'success' | 'warning' | 'accent' | 'danger' | 'slate'> = {
  retail: 'slate',
  contractor: 'primary',
  builder: 'warning',
  architect: 'accent',
  interior_designer: 'success',
  corporate: 'primary',
};

const customerTypeLabels: Record<string, string> = {
  retail: 'Retail',
  contractor: 'Contractor',
  builder: 'Builder',
  architect: 'Architect',
  interior_designer: 'Interior Designer',
  corporate: 'Corporate',
};

export function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const toast = useUiStore.getState().toast;

  useEffect(() => {
    loadCustomers();
  }, [page, search, selectedType]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }
      if (selectedType) {
        query = query.eq('type', selectedType);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;
      setCustomers(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      toast.success('Customer deleted successfully');
      setDeleteConfirm({ open: false });
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    }
  };

  const handleCustomerSaved = () => {
    setFormOpen(false);
    setPage(1);
    loadCustomers();
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      label: 'Customer Name',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold">
            {row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-500">{row.code || 'No code'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <Badge variant={customerTypeColors[value as string] || 'default'} dot>
          {customerTypeLabels[value as string] || value}
        </Badge>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value) => <p className="text-sm">{value || '-'}</p>,
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => <p className="text-sm text-slate-600">{value || '-'}</p>,
    },
    {
      key: 'outstanding_balance',
      label: 'Outstanding Balance',
      align: 'right',
      render: (value) => (
        <p className={`font-medium ${value > 0 ? 'text-danger-600' : 'text-success-600'}`}>
          {formatCurrency(value as number)}
        </p>
      ),
    },
    {
      key: 'total_purchases',
      label: 'Total Purchases',
      align: 'right',
      render: (value) => <p className="font-medium">{formatCurrency(value as number)}</p>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'danger'} dot>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'right',
      render: (value) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => navigate(`/customers/${value}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => navigate(`/customers/${value}/edit`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm({ open: true, id: value as string })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <Badge className="mt-2">{total} Customers</Badge>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
          New Customer
        </Button>
      </div>

      {/* Search & Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search customers by name, email, or phone..."
          />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            {Object.entries(customerTypeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <SkeletonTable rows={8} cols={7} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Start by creating your first customer"
            action={{ label: 'New Customer', onClick: () => setFormOpen(true), icon: <Plus size={16} /> }}
            size="lg"
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={customers}
              onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
            />
            <div className="mt-6">
              <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Modals */}
      <CustomerForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={handleCustomerSaved} />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false })}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
