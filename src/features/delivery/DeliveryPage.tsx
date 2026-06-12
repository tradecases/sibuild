import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Truck, Eye, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import type { DeliveryOrder, Invoice, Customer } from '../../types';

interface DeliveryForm {
  invoice_id: string;
  customer_id: string;
  scheduled_date: string;
  delivery_address: string;
  driver_name: string;
  driver_phone: string;
  vehicle: string;
  notes: string;
  assigned_to: string;
}

interface DeliveryWithDetails extends DeliveryOrder {
  invoice?: Invoice & { customer?: Customer };
  customer?: Customer;
}

export function DeliveryPage() {
  const [deliveries, setDeliveries] = useState<DeliveryWithDetails[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryWithDetails[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryWithDetails | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useUiStore((state) => state.showToast);

  const [form, setForm] = useState<DeliveryForm>({
    invoice_id: '',
    customer_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    delivery_address: '',
    driver_name: '',
    driver_phone: '',
    vehicle: '',
    notes: '',
    assigned_to: '',
  });

  const [statusForm, setStatusForm] = useState<'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'returned'>('pending');

  const statuses: Array<'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed' | 'returned'> = [
    'pending',
    'assigned',
    'in_transit',
    'delivered',
    'failed',
    'returned',
  ];

  useEffect(() => {
    loadDeliveries();
    loadInvoices();
    loadCustomers();
    loadProfiles();
  }, []);

  useEffect(() => {
    filterDeliveries();
  }, [search, statusFilter, deliveries]);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('delivery_orders')
        .select('*, invoice:invoices(*, customer:customers(*)), customer:customers(*)')
        .order('created_at', { ascending: false });
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
      showToast('Error loading deliveries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*, customer:customers(name)')
        .eq('status', 'issued')
        .order('created_at', { ascending: false });
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('is_active', true);
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('is_active', true);
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const filterDeliveries = () => {
    let filtered = deliveries;

    if (search) {
      filtered = filtered.filter(d =>
        d.delivery_number?.toLowerCase().includes(search.toLowerCase()) ||
        d.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.driver_name?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    setFilteredDeliveries(filtered);
  };

  const handleSave = async () => {
    if (!form.customer_id || !form.scheduled_date || !form.delivery_address || !form.driver_name) {
      showToast('Please fill all required fields', 'warning');
      return;
    }

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      if (editingId) {
        const { error } = await supabase
          .from('delivery_orders')
          .update(form)
          .eq('id', editingId);
        if (error) throw error;
        showToast('Delivery updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('delivery_orders')
          .insert([
            {
              ...form,
              delivery_number: `DEL-${Date.now()}`,
              status: 'pending',
              created_by: userId,
            },
          ]);
        if (error) throw error;
        showToast('Delivery created successfully', 'success');
      }

      setShowModal(false);
      resetForm();
      loadDeliveries();
    } catch (error) {
      console.error('Error saving delivery:', error);
      showToast('Error saving delivery', 'error');
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedDelivery) return;

    try {
      const updateData: any = { status: statusForm };
      if (statusForm === 'delivered') {
        updateData.delivered_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('delivery_orders')
        .update(updateData)
        .eq('id', selectedDelivery.id);

      if (error) throw error;

      showToast('Status updated successfully', 'success');
      setShowStatusModal(false);
      setSelectedDelivery(null);
      loadDeliveries();
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Error updating status', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      invoice_id: '',
      customer_id: '',
      scheduled_date: new Date().toISOString().split('T')[0],
      delivery_address: '',
      driver_name: '',
      driver_phone: '',
      vehicle: '',
      notes: '',
      assigned_to: '',
    });
    setEditingId(null);
  };

  const handleEdit = (delivery: DeliveryWithDetails) => {
    setForm({
      invoice_id: delivery.invoice_id || '',
      customer_id: delivery.customer_id,
      scheduled_date: delivery.scheduled_date || '',
      delivery_address: delivery.delivery_address || '',
      driver_name: delivery.driver_name || '',
      driver_phone: delivery.driver_phone || '',
      vehicle: delivery.vehicle || '',
      notes: delivery.notes || '',
      assigned_to: delivery.assigned_to || '',
    });
    setEditingId(delivery.id);
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-slate-100 text-slate-700',
      assigned: 'bg-blue-100 text-blue-700',
      in_transit: 'bg-amber-100 text-amber-700',
      delivered: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      returned: 'bg-purple-100 text-purple-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Deliveries</h1>
          <p className="text-sm text-slate-500 mt-1">{filteredDeliveries.length} active deliveries</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => { resetForm(); setShowModal(true); }}>New Delivery</Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <Input
              leftIcon={<Search size={16} />}
              placeholder="Search deliveries, customers, drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            placeholder="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'in_transit', label: 'In Transit' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'failed', label: 'Failed' },
              { value: 'returned', label: 'Returned' },
            ]}
          />
          <Button variant="secondary" leftIcon={<Filter size={16} />}>More Filters</Button>
        </div>
      </Card>

      {/* Table View */}
      {viewMode === 'table' && (
        <Card>
          {loading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : filteredDeliveries.length > 0 ? (
            <Table
              columns={[
                { key: 'delivery_number', label: 'Delivery#' },
                {
                  key: 'invoice_id',
                  label: 'Invoice#',
                  render: (v, row) => (row as any).invoice?.invoice_number || '-',
                },
                {
                  key: 'customer_id',
                  label: 'Customer',
                  render: (v, row) => (row as any).customer?.name || '-',
                },
                { key: 'scheduled_date', label: 'Scheduled Date', render: (v) => formatDate(v) },
                { key: 'delivery_address', label: 'Address' },
                { key: 'driver_name', label: 'Driver' },
                { key: 'vehicle', label: 'Vehicle' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (v) => <StatusBadge status={v} />,
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, row) => (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setSelectedDelivery(row); setStatusForm(row.status); setShowStatusModal(true); }}
                      >
                        Update Status
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={filteredDeliveries}
            />
          ) : (
            <EmptyState
              title="No deliveries found"
              description="Create a new delivery order to get started"
              size="sm"
            />
          )}
        </Card>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {statuses.map(status => (
            <div key={status} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4 capitalize">
                {status.replace('_', ' ')} ({filteredDeliveries.filter(d => d.status === status).length})
              </h3>
              <div className="space-y-3">
                {filteredDeliveries
                  .filter(d => d.status === status)
                  .map(delivery => (
                    <div
                      key={delivery.id}
                      className="bg-white p-3 rounded-lg border border-slate-200 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => { setSelectedDelivery(delivery); setStatusForm(delivery.status); setShowStatusModal(true); }}
                    >
                      <p className="text-sm font-medium text-slate-900">{delivery.delivery_number}</p>
                      <p className="text-xs text-slate-600 mt-1">{delivery.customer?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">Driver: {delivery.driver_name}</p>
                      {delivery.scheduled_date && (
                        <p className="text-xs text-slate-500">{formatDate(delivery.scheduled_date)}</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Delivery Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Edit Delivery' : 'New Delivery'}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Invoice"
            value={form.invoice_id}
            onChange={(e) => {
              const inv = invoices.find(i => i.id === e.target.value);
              setForm({
                ...form,
                invoice_id: e.target.value,
                customer_id: inv?.customer_id || '',
                delivery_address: inv?.customer?.address || '',
              });
            }}
            options={invoices.map(i => ({
              value: i.id,
              label: `${i.invoice_number} - ${(i.customer as any)?.name}`,
            }))}
          />
          <Select
            label="Customer"
            value={form.customer_id}
            onChange={(e) => {
              const cust = customers.find(c => c.id === e.target.value);
              setForm({
                ...form,
                customer_id: e.target.value,
                delivery_address: cust?.address || '',
              });
            }}
            options={customers.map(c => ({ value: c.id, label: c.name }))}
          />
          <Input
            label="Delivery Address"
            value={form.delivery_address}
            onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
            placeholder="Full delivery address"
          />
          <Input
            label="Scheduled Date"
            type="date"
            value={form.scheduled_date}
            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
          />
          <Input
            label="Driver Name"
            value={form.driver_name}
            onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
            placeholder="Driver full name"
          />
          <Input
            label="Driver Phone"
            type="tel"
            value={form.driver_phone}
            onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
            placeholder="+971..."
          />
          <Input
            label="Vehicle"
            value={form.vehicle}
            onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
            placeholder="Plate number / vehicle identifier"
          />
          <Select
            label="Assign To Staff"
            value={form.assigned_to}
            onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
            options={[
              { value: '', label: 'Unassigned' },
              ...profiles.map(p => ({ value: p.id, label: p.full_name })),
            ]}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes"
            multiline
            rows={3}
          />
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'} Delivery</Button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => { setShowStatusModal(false); setSelectedDelivery(null); }}
        title="Update Delivery Status"
        size="sm"
      >
        <div className="space-y-4">
          {selectedDelivery && (
            <>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">Delivery: <span className="font-medium">{selectedDelivery.delivery_number}</span></p>
                <p className="text-sm text-slate-600 mt-1">Current Status: <span className="font-medium capitalize">{selectedDelivery.status.replace('_', ' ')}</span></p>
              </div>
              <Select
                label="New Status"
                value={statusForm}
                onChange={(e) => setStatusForm(e.target.value as any)}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'in_transit', label: 'In Transit' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'failed', label: 'Failed' },
                  { value: 'returned', label: 'Returned' },
                ]}
              />
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                <Button variant="secondary" onClick={() => { setShowStatusModal(false); setSelectedDelivery(null); }}>Cancel</Button>
                <Button onClick={handleStatusUpdate} leftIcon={<Check size={16} />}>Confirm Status</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
