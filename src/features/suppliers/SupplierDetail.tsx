import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Tabs } from '../../components/ui/Tabs';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatCard } from '../../components/ui/StatCard';
import type { Supplier, PurchaseOrder, Payment } from '../../types';

export function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useUiStore();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [orders, setOrders] = useState<(PurchaseOrder & { items?: any[] })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    payment_terms: 0,
    credit_limit: 0,
    notes: '',
  });

  // Load supplier details
  useEffect(() => {
    const loadSupplier = async () => {
      try {
        setLoading(true);

        const { data: suppData, error: suppError } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', id)
          .single();

        if (suppError) throw suppError;

        setSupplier(suppData);
        setFormData(suppData);

        // Load purchase orders
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('*, items:purchase_order_items(*)')
          .eq('supplier_id', id)
          .order('order_date', { ascending: false });

        if (poData) setOrders(poData);

        // Load payments
        const { data: payData } = await supabase
          .from('payments')
          .select('*')
          .eq('supplier_id', id)
          .eq('type', 'paid')
          .order('payment_date', { ascending: false });

        if (payData) setPayments(payData);
      } catch (err) {
        console.error('Error loading supplier:', err);
        toast({ message: 'Failed to load supplier', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (id) loadSupplier();
  }, [id, toast]);

  // Save supplier
  const handleSave = async () => {
    if (!supplier) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('suppliers')
        .update(formData)
        .eq('id', supplier.id);

      if (error) throw error;

      const updated = { ...supplier, ...formData } as Supplier;
      setSupplier(updated);
      setEditing(false);
      toast({ message: 'Supplier updated', type: 'success' });
    } catch (err) {
      console.error('Error saving supplier:', err);
      toast({ message: 'Failed to save supplier', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Supplier not found</p>
        <Button variant="outline" onClick={() => navigate('/suppliers')} className="mt-4">
          Back to Suppliers
        </Button>
      </div>
    );
  }

  // Calculate stats
  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, po) => sum + po.total_amount, 0);
  const lastOrder = orders[0]?.order_date;

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/suppliers')}>
          Back
        </Button>
        {!editing && (
          <Button onClick={() => setEditing(true)}>Edit Supplier</Button>
        )}
      </div>

      {/* Profile Header */}
      {!editing ? (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{supplier.name}</h1>
              {supplier.code && <p className="text-gray-600">Code: {supplier.code}</p>}
              {supplier.contact_person && (
                <p className="text-gray-600 mt-2">Contact: {supplier.contact_person}</p>
              )}
              {supplier.email && <p className="text-gray-600">{supplier.email}</p>}
              {supplier.phone && <p className="text-gray-600">{supplier.phone}</p>}
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-600">Outstanding Balance</p>
              <p className="text-3xl font-bold text-orange-600">
                {formatCurrency(supplier.outstanding_balance)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Status: <span className={supplier.is_active ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                  {supplier.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Supplier</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Name *</label>
              <Input
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Code</label>
              <Input
                value={formData.code || ''}
                onChange={e => setFormData({ ...formData, code: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Contact Person</label>
              <Input
                value={formData.contact_person || ''}
                onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
              <Input
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Payment Terms (days)</label>
              <Input
                type="number"
                value={formData.payment_terms || 0}
                onChange={e => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Credit Limit</label>
              <Input
                type="number"
                value={formData.credit_limit || 0}
                onChange={e => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Address</label>
              <Input
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">City</label>
              <Input
                value={formData.city || ''}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Country</label>
              <Input
                value={formData.country || ''}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-1">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-2 border border-gray-200 rounded text-sm"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button variant="outline" onClick={() => {
              setFormData(supplier);
              setEditing(false);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      {!editing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Orders"
            value={totalOrders.toString()}
          />
          <StatCard
            title="Total Value"
            value={formatCurrency(totalValue)}
          />
          <StatCard
            title="Last Order"
            value={lastOrder ? formatDate(lastOrder) : 'No orders'}
          />
        </div>
      )}

      {/* Tabs */}
      {!editing && (
        <>
          <Tabs
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'orders', label: 'Purchase Orders' },
              { id: 'payments', label: 'Payments' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === 'overview' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Supplier Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Contact Person</p>
                  <p className="font-semibold text-gray-900">{supplier.contact_person || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{supplier.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-900">{supplier.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Terms</p>
                  <p className="font-semibold text-gray-900">{supplier.payment_terms} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Credit Limit</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(supplier.credit_limit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding Balance</p>
                  <p className="font-semibold text-orange-600">{formatCurrency(supplier.outstanding_balance)}</p>
                </div>
              </div>

              {supplier.address && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-2">Address</p>
                  <p className="text-gray-900">{supplier.address}</p>
                  {supplier.city && <p className="text-gray-900">{supplier.city}</p>}
                  {supplier.country && <p className="text-gray-900">{supplier.country}</p>}
                </div>
              )}

              {supplier.notes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-gray-600 mb-2">Notes</p>
                  <p className="text-gray-900">{supplier.notes}</p>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'orders' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Purchase Orders</h2>
                <Button size="sm" onClick={() => navigate('/purchases/new')}>
                  New PO
                </Button>
              </div>

              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No purchase orders</p>
              ) : (
                <Table
                  columns={[
                    { key: 'po_number', label: 'PO #', width: '12%' },
                    { key: 'order_date', label: 'Date', width: '12%', render: (v) => formatDate(v) },
                    { key: 'status', label: 'Status', width: '10%' },
                    { key: 'items_count', label: 'Items', width: '10%', render: (_, row: any) => row.items?.length || 0 },
                    { key: 'subtotal', label: 'Subtotal', width: '12%', render: (v) => formatCurrency(v) },
                    { key: 'tax_amount', label: 'Tax', width: '12%', render: (v) => formatCurrency(v) },
                    { key: 'total_amount', label: 'Total', width: '12%', render: (v) => formatCurrency(v) },
                    {
                      key: 'actions',
                      label: 'Actions',
                      width: '16%',
                      render: (_, po: any) => (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/purchases/${po.id}`)}>
                          View
                        </Button>
                      ),
                    },
                  ]}
                  data={orders}
                  striped
                />
              )}
            </Card>
          )}

          {activeTab === 'payments' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>

              {payments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payments recorded</p>
              ) : (
                <Table
                  columns={[
                    { key: 'payment_number', label: 'Payment #', width: '15%' },
                    { key: 'amount', label: 'Amount', width: '15%', render: (v) => formatCurrency(v) },
                    { key: 'payment_method', label: 'Method', width: '15%' },
                    { key: 'reference_number', label: 'Reference', width: '15%' },
                    { key: 'payment_date', label: 'Date', width: '15%', render: (v) => formatDate(v) },
                    { key: 'notes', label: 'Notes', width: '25%' },
                  ]}
                  data={payments}
                  striped
                />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
