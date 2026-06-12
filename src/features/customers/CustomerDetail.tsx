import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate, formatRelativeTime } from '../../lib/utils';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Table, Column } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { CustomerForm } from './CustomerForm';
import type { Customer, Invoice, Quotation } from '../../types';

interface CustomerNote {
  id: string;
  customer_id: string;
  notes: string;
  created_at: string;
  created_by: string;
}

const customerTypeLabels: Record<string, string> = {
  retail: 'Retail',
  contractor: 'Contractor',
  builder: 'Builder',
  architect: 'Architect',
  interior_designer: 'Interior Designer',
  corporate: 'Corporate',
};

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const toast = useUiStore.getState().toast;

  useEffect(() => {
    if (id) {
      loadCustomer();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'quotations') loadQuotations();
    if (activeTab === 'notes') loadNotes();
  }, [activeTab]);

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
    } catch (error) {
      console.error('Error loading customer:', error);
      toast.error('Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    }
  };

  const loadQuotations = async () => {
    try {
      const { data } = await supabase
        .from('quotations')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      setQuotations(data || []);
    } catch (error) {
      console.error('Error loading quotations:', error);
      toast.error('Failed to load quotations');
    }
  };

  const loadNotes = async () => {
    try {
      const { data } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) {
      toast.error('Note cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('customer_notes')
        .insert([{
          customer_id: id,
          notes: noteInput.trim(),
          created_at: new Date().toISOString(),
          created_by: 'current_user', // Replace with actual user
        }]);

      if (error) throw error;

      toast.success('Note added');
      setNoteInput('');
      loadNotes();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteNoteConfirm.id) return;

    try {
      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', deleteNoteConfirm.id);

      if (error) throw error;

      toast.success('Note deleted');
      setDeleteNoteConfirm({ open: false });
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    }
  };

  const handleCustomerSaved = () => {
    setEditOpen(false);
    loadCustomer();
  };

  if (loading || !customer) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft size={16} /> Back
          </Button>
        </div>
        <SkeletonCard />
        <SkeletonTable rows={5} cols={4} />
      </div>
    );
  }

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      label: 'Invoice #',
      render: (value) => <p className="font-medium">{value}</p>,
    },
    {
      key: 'invoice_date',
      label: 'Date',
      render: (value) => <p className="text-sm">{formatDate(value as string)}</p>,
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      align: 'right',
      render: (value) => <p className="font-medium">{formatCurrency(value as number)}</p>,
    },
    {
      key: 'balance_due',
      label: 'Balance Due',
      align: 'right',
      render: (value) => (
        <p className={`font-medium ${value > 0 ? 'text-danger-600' : 'text-success-600'}`}>
          {formatCurrency(value as number)}
        </p>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as string} />,
    },
  ];

  const quotationColumns: Column<Quotation>[] = [
    {
      key: 'quotation_number',
      label: 'Quotation #',
      render: (value) => <p className="font-medium">{value}</p>,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => <p className="text-sm">{formatDate(value as string)}</p>,
    },
    {
      key: 'total_amount',
      label: 'Amount',
      align: 'right',
      render: (value) => <p className="font-medium">{formatCurrency(value as number)}</p>,
    },
    {
      key: 'valid_until',
      label: 'Valid Until',
      render: (value) => <p className="text-sm">{value ? formatDate(value as string) : '-'}</p>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value as string} />,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{customer.name}</h1>
            <Badge className="mt-2">{customerTypeLabels[customer.type] || customer.type}</Badge>
          </div>
        </div>
        <Button onClick={() => setEditOpen(true)}>Edit Customer</Button>
      </div>

      {/* Customer Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Credit Limit</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(customer.credit_limit)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Outstanding Balance</p>
          <p className="text-2xl font-bold text-danger-600">{formatCurrency(customer.outstanding_balance)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Total Purchases</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(customer.total_purchases)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Discount</p>
          <p className="text-2xl font-bold text-primary-600">{customer.discount_percentage}%</p>
        </Card>
      </div>

      {/* Contact Info */}
      <Card title="Contact Information">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Email</p>
            <p className="text-sm text-slate-900">{customer.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Phone</p>
            <p className="text-sm text-slate-900">{customer.phone || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Address</p>
            <p className="text-sm text-slate-900">{customer.address || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">City</p>
            <p className="text-sm text-slate-900">{customer.city || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Country</p>
            <p className="text-sm text-slate-900">{customer.country || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tax Number</p>
            <p className="text-sm text-slate-900">{customer.tax_number || '-'}</p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'invoices', label: 'Invoices', count: invoices.length },
          { id: 'quotations', label: 'Quotations', count: quotations.length },
          { id: 'notes', label: 'Notes' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <Card>
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices"
              description="Customer invoices will appear here"
              size="lg"
            />
          ) : (
            <Table columns={invoiceColumns} data={invoices} />
          )}
        </Card>
      )}

      {/* Quotations Tab */}
      {activeTab === 'quotations' && (
        <Card>
          {quotations.length === 0 ? (
            <EmptyState
              title="No quotations"
              description="Customer quotations will appear here"
              size="lg"
            />
          ) : (
            <Table columns={quotationColumns} data={quotations} />
          )}
        </Card>
      )}

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <Card>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Add Note</label>
                <div className="flex gap-2">
                  <textarea
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Write a note..."
                    rows={3}
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <Button onClick={handleAddNote} className="self-end">
                    <Plus size={16} /> Add
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {notes.length === 0 ? (
            <EmptyState
              title="No notes yet"
              description="Add your first note about this customer"
              size="lg"
            />
          ) : (
            <div className="space-y-3">
              {notes.map(note => (
                <Card key={note.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{note.notes}</p>
                      <p className="text-xs text-slate-500 mt-2">{formatRelativeTime(note.created_at)}</p>
                    </div>
                    <button
                      onClick={() => setDeleteNoteConfirm({ open: true, id: note.id })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CustomerForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={handleCustomerSaved}
        customerId={id}
        initialData={customer}
      />

      <ConfirmModal
        isOpen={deleteNoteConfirm.open}
        onClose={() => setDeleteNoteConfirm({ open: false })}
        onConfirm={handleDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
