import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Invoice, InvoiceItem, Payment, PaymentMethod } from '../../types';

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useUiStore();
  const { user } = useAuthStore();

  const [invoice, setInvoice] = useState<Invoice & { customer?: any }| null>(null);
  const [items, setItems] = useState<(InvoiceItem & { product?: any })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: 'cash' as PaymentMethod,
    reference: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Load invoice details
  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);

        const { data: inv, error: invError } = await supabase
          .from('invoices')
          .select('*, customer:customers(*)')
          .eq('id', id)
          .single();

        if (invError) throw invError;
        setInvoice(inv);

        // Load items
        const { data: itemData } = await supabase
          .from('invoice_items')
          .select('*, product:products(*)')
          .eq('invoice_id', id)
          .order('sort_order');

        if (itemData) setItems(itemData);

        // Load payments
        const { data: payData } = await supabase
          .from('payments')
          .select('*')
          .eq('invoice_id', id)
          .eq('type', 'received')
          .order('payment_date', { ascending: false });

        if (payData) setPayments(payData);
      } catch (err) {
        console.error('Error loading invoice:', err);
        toast({ message: 'Failed to load invoice', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (id) loadInvoice();
  }, [id, toast]);

  // Add payment
  const handleAddPayment = async () => {
    if (!invoice) return;
    if (paymentForm.amount <= 0) {
      toast({ message: 'Payment amount must be greater than 0', type: 'error' });
      return;
    }

    if (paymentForm.amount > invoice.balance_due) {
      toast({ message: 'Payment amount exceeds balance due', type: 'error' });
      return;
    }

    try {
      const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true });
      const paymentNumber = `PAY-${String((count || 0) + 1).padStart(6, '0')}`;

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            payment_number: paymentNumber,
            invoice_id: invoice.id,
            type: 'received',
            amount: paymentForm.amount,
            payment_method: paymentForm.method,
            reference_number: paymentForm.reference || null,
            payment_date: paymentForm.date,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;

      const newPaidAmount = invoice.paid_amount + paymentForm.amount;
      const newBalance = invoice.balance_due - paymentForm.amount;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      // Update invoice
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_due: Math.max(0, newBalance),
          status: newStatus,
        })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

      // Update customer outstanding balance
      if (invoice.customer) {
        const balanceChange = paymentForm.amount;
        await supabase
          .from('customers')
          .update({
            outstanding_balance: Math.max(0, invoice.customer.outstanding_balance - balanceChange),
          })
          .eq('id', invoice.customer.id);
      }

      // Refresh invoice
      const { data: updatedInv } = await supabase
        .from('invoices')
        .select('*, customer:customers(*)')
        .eq('id', invoice.id)
        .single();

      if (updatedInv) setInvoice(updatedInv);

      // Refresh payments
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoice.id)
        .eq('type', 'received')
        .order('payment_date', { ascending: false });

      if (payData) setPayments(payData);

      toast({ message: `Payment ${paymentNumber} recorded successfully`, type: 'success' });
      setShowPaymentModal(false);
      setPaymentForm({ amount: 0, method: 'cash', reference: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error('Error adding payment:', err);
      toast({ message: 'Failed to record payment', type: 'error' });
    }
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
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

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Invoice not found</p>
        <Button variant="outline" onClick={() => navigate('/sales/invoices')} className="mt-4">
          Back to Invoices
        </Button>
      </div>
    );
  }

  const statusVariant = (status: string) => {
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
      default:
        return 'outline';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 print:p-0">
      {/* Header Actions - Hide on print */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={() => navigate('/sales/invoices')}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            Print
          </Button>
          <Button onClick={() => setShowPaymentModal(true)} disabled={invoice.status === 'paid'}>
            Add Payment
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <Card className="p-8 print:shadow-none print:rounded-none">
        {/* Company Header */}
        <div className="mb-8 pb-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900">SI Building Solutions</h1>
          <p className="text-gray-600 mt-1">Professional Building Materials & Supplies</p>
        </div>

        {/* Invoice Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm text-gray-600">Invoice Number</p>
            <p className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Status</p>
            <Badge variant={statusVariant(invoice.status)} className="mt-1">
              {invoice.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm text-gray-600">Invoice Date</p>
            <p className="font-semibold text-gray-900">{formatDate(invoice.invoice_date, 'long')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Due Date</p>
            <p className="font-semibold text-gray-900">
              {invoice.due_date ? formatDate(invoice.due_date, 'long') : 'N/A'}
            </p>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 pb-8 border-b">
          <p className="text-sm font-semibold text-gray-600 uppercase">Bill To</p>
          <p className="text-lg font-semibold text-gray-900">{invoice.customer?.name}</p>
          {invoice.customer?.email && <p className="text-gray-600">{invoice.customer.email}</p>}
          {invoice.customer?.phone && <p className="text-gray-600">{invoice.customer.phone}</p>}
          {invoice.customer?.address && <p className="text-gray-600">{invoice.customer.address}</p>}
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-2 font-semibold text-gray-900">Product</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-900">Qty</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-900">Unit Price</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-900">Discount</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-900">Tax</th>
                <th className="text-right py-3 px-2 font-semibold text-gray-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3 px-2">
                    <p className="font-medium text-gray-900">{item.product?.name}</p>
                    {item.description && <p className="text-xs text-gray-600">{item.description}</p>}
                  </td>
                  <td className="py-3 px-2 text-right text-gray-900">{item.quantity}</td>
                  <td className="py-3 px-2 text-right text-gray-900">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 px-2 text-right text-gray-900">{formatCurrency(item.discount_amount)}</td>
                  <td className="py-3 px-2 text-right text-gray-900">{formatCurrency(item.tax_amount)}</td>
                  <td className="py-3 px-2 text-right font-semibold text-gray-900">
                    {formatCurrency(item.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Terms Section */}
          {invoice.notes && (
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase mb-2">Notes</p>
              <p className="text-sm text-gray-700">{invoice.notes}</p>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Discount</span>
                <span className="text-gray-900">-{formatCurrency(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Total Amount</span>
              <span className="text-primary-600">{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-600">Paid Amount</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(invoice.paid_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Balance Due</p>
            <p className="text-lg font-semibold text-orange-600">{formatCurrency(invoice.balance_due)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <Badge variant={invoice.balance_due === 0 ? 'success' : 'warning'} className="mt-1">
              {invoice.balance_due === 0 ? 'Fully Paid' : 'Pending'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Payment History - Hide on print */}
      {payments.length > 0 && (
        <div className="print:hidden">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment History</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table
              columns={[
                { key: 'payment_number', label: 'Payment #', width: '20%' },
                { key: 'amount', label: 'Amount', width: '20%', render: (v) => formatCurrency(v) },
                { key: 'payment_method', label: 'Method', width: '20%' },
                { key: 'reference_number', label: 'Reference', width: '20%' },
                { key: 'payment_date', label: 'Date', width: '20%', render: (v) => formatDate(v) },
              ]}
              data={payments}
              striped
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Add Payment">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Amount</label>
            <Input
              type="number"
              value={paymentForm.amount}
              onChange={e => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              step="0.01"
              max={invoice.balance_due}
            />
            <p className="text-xs text-gray-600 mt-1">Balance Due: {formatCurrency(invoice.balance_due)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Payment Method</label>
            <Select
              value={paymentForm.method}
              onChange={v => setPaymentForm({ ...paymentForm, method: v as PaymentMethod })}
              options={[
                { label: 'Cash', value: 'cash' },
                { label: 'Card', value: 'card' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Cheque', value: 'cheque' },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Reference Number</label>
            <Input
              type="text"
              value={paymentForm.reference}
              onChange={e => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              placeholder="e.g., Cheque #, Bank Ref"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Payment Date</label>
            <Input
              type="date"
              value={paymentForm.date}
              onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment}>Record Payment</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
