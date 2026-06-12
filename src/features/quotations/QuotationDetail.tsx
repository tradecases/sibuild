import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Quotation, QuotationItem } from '../../types';

export function QuotationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useUiStore();
  const { user } = useAuthStore();

  const [quotation, setQuotation] = useState<Quotation & { customer?: any } | null>(null);
  const [items, setItems] = useState<(QuotationItem & { product?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Load quotation
  useEffect(() => {
    const loadQuotation = async () => {
      try {
        setLoading(true);

        const { data: quotData, error: quotError } = await supabase
          .from('quotations')
          .select('*, customer:customers(*)')
          .eq('id', id)
          .single();

        if (quotError) throw quotError;
        setQuotation(quotData);

        // Load items
        const { data: itemData } = await supabase
          .from('quotation_items')
          .select('*, product:products(*)')
          .eq('quotation_id', id)
          .order('sort_order');

        if (itemData) setItems(itemData);
      } catch (err) {
        console.error('Error loading quotation:', err);
        toast({ message: 'Failed to load quotation', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (id) loadQuotation();
  }, [id, toast]);

  // Convert to invoice
  const handleConvertToInvoice = async () => {
    if (!quotation) return;

    try {
      setConverting(true);

      // Get invoice count for numbering
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(6, '0')}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            invoice_number: invoiceNumber,
            customer_id: quotation.customer_id,
            quotation_id: quotation.id,
            status: 'issued',
            invoice_date: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            subtotal: quotation.subtotal,
            tax_amount: quotation.tax_amount,
            discount_amount: quotation.discount_amount,
            total_amount: quotation.total_amount,
            paid_amount: 0,
            balance_due: quotation.total_amount,
            payment_method: 'cash',
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsToInsert = items.map((item, idx) => ({
        invoice_id: invoice.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        warehouse_id: null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        total_amount: item.total_amount,
        sort_order: idx,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // Update quotation status
      await supabase.from('quotations').update({ status: 'converted' }).eq('id', quotation.id);

      toast({ message: `Invoice ${invoiceNumber} created from quotation`, type: 'success' });
      navigate(`/sales/invoices/${invoice.id}`);
    } catch (err) {
      console.error('Error converting to invoice:', err);
      toast({ message: 'Failed to convert to invoice', type: 'error' });
    } finally {
      setConverting(false);
      setShowConvertModal(false);
    }
  };

  // Update status
  const updateStatus = async (newStatus: string) => {
    if (!quotation) return;

    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', quotation.id);

      if (error) throw error;

      setQuotation({ ...quotation, status: newStatus as any });
      toast({ message: `Quotation marked as ${newStatus}`, type: 'success' });
    } catch (err) {
      console.error('Error updating status:', err);
      toast({ message: 'Failed to update status', type: 'error' });
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Share WhatsApp
  const handleWhatsAppShare = () => {
    if (!quotation) return;
    const message = `Hi ${quotation.customer?.name}, Please check the quotation: Quote #${quotation.quotation_number}. Valid until ${formatDate(quotation.valid_until, 'long')}. Total: ${formatCurrency(quotation.total_amount)}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Share Email
  const handleEmailShare = () => {
    if (!quotation) return;
    const subject = `Quotation ${quotation.quotation_number} - SI Building Solutions`;
    const body = `Dear ${quotation.customer?.name},\n\nPlease find the quotation details:\n\nQuote #: ${quotation.quotation_number}\nValid Until: ${formatDate(quotation.valid_until, 'long')}\nTotal: ${formatCurrency(quotation.total_amount)}\n\nBest regards,\nSI Building Solutions`;
    window.location.href = `mailto:${quotation.customer?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  if (!quotation) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Quotation not found</p>
        <Button variant="outline" onClick={() => navigate('/quotations')} className="mt-4">
          Back to Quotations
        </Button>
      </div>
    );
  }

  const statusVariant = (status: string) => {
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
    <div className="max-w-4xl mx-auto space-y-6 p-6 print:p-0">
      {/* Header Actions - Hide on print */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          Back
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/quotations/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            Print
          </Button>
          <Button variant="outline" onClick={handleWhatsAppShare}>
            WhatsApp
          </Button>
          <Button variant="outline" onClick={handleEmailShare}>
            Email
          </Button>
          {quotation.status !== 'converted' && (
            <Button onClick={() => setShowConvertModal(true)}>
              Convert to Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Quotation Document */}
      <Card className="p-8 print:shadow-none print:rounded-none">
        {/* Company Header */}
        <div className="mb-8 pb-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900">SI Building Solutions</h1>
          <p className="text-gray-600 mt-1">Professional Building Materials & Supplies</p>
        </div>

        {/* Quotation Info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm text-gray-600">Quotation Number</p>
            <p className="text-lg font-semibold text-gray-900">{quotation.quotation_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Status</p>
            <Badge variant={statusVariant(quotation.status)} className="mt-1">
              {quotation.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm text-gray-600">Quotation Date</p>
            <p className="font-semibold text-gray-900">{formatDate(quotation.created_at, 'long')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Valid Until</p>
            <p className="font-semibold text-gray-900">
              {quotation.valid_until ? formatDate(quotation.valid_until, 'long') : 'N/A'}
            </p>
          </div>
        </div>

        {/* To */}
        <div className="mb-8 pb-8 border-b">
          <p className="text-sm font-semibold text-gray-600 uppercase">To</p>
          <p className="text-lg font-semibold text-gray-900">{quotation.customer?.name}</p>
          {quotation.customer?.email && <p className="text-gray-600">{quotation.customer.email}</p>}
          {quotation.customer?.phone && <p className="text-gray-600">{quotation.customer.phone}</p>}
          {quotation.customer?.address && <p className="text-gray-600">{quotation.customer.address}</p>}
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
          {/* Terms & Notes */}
          {(quotation.notes || quotation.terms) && (
            <div>
              {quotation.notes && (
                <>
                  <p className="text-sm font-semibold text-gray-600 uppercase mb-2">Notes</p>
                  <p className="text-sm text-gray-700">{quotation.notes}</p>
                </>
              )}
              {quotation.terms && (
                <>
                  <p className="text-sm font-semibold text-gray-600 uppercase mb-2 mt-4">Terms & Conditions</p>
                  <p className="text-sm text-gray-700">{quotation.terms}</p>
                </>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(quotation.subtotal)}</span>
            </div>
            {quotation.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Discount</span>
                <span className="text-gray-900">-{formatCurrency(quotation.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="text-gray-900">{formatCurrency(quotation.tax_amount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
              <span>Grand Total</span>
              <span className="text-primary-600">{formatCurrency(quotation.total_amount)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Status Actions - Hide on print */}
      {quotation.status !== 'accepted' && quotation.status !== 'rejected' && quotation.status !== 'converted' && (
        <div className="print:hidden flex gap-2">
          {quotation.status !== 'accepted' && (
            <Button variant="outline" onClick={() => updateStatus('accepted')}>
              Mark as Accepted
            </Button>
          )}
          {quotation.status !== 'rejected' && (
            <Button variant="outline" onClick={() => updateStatus('rejected')}>
              Mark as Rejected
            </Button>
          )}
        </div>
      )}

      {/* Convert Modal */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        title="Convert to Invoice"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            This will create an invoice from the quotation. The quotation will be marked as converted.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Amount:</span> {formatCurrency(quotation.total_amount)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConvertModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConvertToInvoice}
              loading={converting}
            >
              Convert to Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
