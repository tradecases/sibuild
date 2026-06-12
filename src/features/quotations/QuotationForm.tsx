import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, calcLineTotal, calcDocTotals } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Customer, Product, Quotation, QuotationItem, Project } from '../../types';

export function QuotationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useUiStore();
  const { user } = useAuthStore();
  const isEditing = !!id;

  // State
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer_id: '',
    project_id: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
  });

  const [items, setItems] = useState<(QuotationItem & { product?: Product })[]>([
    {
      id: 'temp-0',
      quotation_id: '',
      product_id: '',
      variant_id: null,
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      discount_amount: 0,
      tax_rate: 0,
      tax_amount: 0,
      total_amount: 0,
      sort_order: 0,
      product: undefined,
    },
  ]);

  const [searchProductInput, setSearchProductInput] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load customers
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (custData) setCustomers(custData);

        // Load projects
        const { data: projData } = await supabase
          .from('projects')
          .select('*')
          .order('name');
        if (projData) setProjects(projData);

        // Load products
        const { data: prodData } = await supabase
          .from('products')
          .select('*, unit:units(*)')
          .eq('is_active', true)
          .order('name');
        if (prodData) setProducts(prodData);

        // Load quotation if editing
        if (isEditing && id) {
          const { data: quotData } = await supabase
            .from('quotations')
            .select('*')
            .eq('id', id)
            .single();

          if (quotData) {
            setQuotation(quotData);
            setForm({
              customer_id: quotData.customer_id,
              project_id: quotData.project_id || '',
              valid_until: quotData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: quotData.notes || '',
              terms: quotData.terms || '',
            });

            // Load items
            const { data: itemData } = await supabase
              .from('quotation_items')
              .select('*, product:products(*, unit:units(*))')
              .eq('quotation_id', id)
              .order('sort_order');

            if (itemData) {
              setItems(itemData);
            }
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        toast({ message: 'Failed to load data', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isEditing, id, toast]);

  // Filter products on search
  useEffect(() => {
    if (!searchProductInput.trim()) {
      setFilteredProducts([]);
      return;
    }

    const search = searchProductInput.toLowerCase();
    setFilteredProducts(
      products.filter(
        p =>
          p.name.toLowerCase().includes(search) ||
          p.sku?.toLowerCase().includes(search) ||
          p.barcode?.includes(search)
      )
    );
  }, [searchProductInput, products]);

  // Handle product selection
  const handleSelectProduct = (product: Product) => {
    if (selectedProductIndex !== null) {
      const newItems = [...items];
      newItems[selectedProductIndex] = {
        ...newItems[selectedProductIndex],
        product_id: product.id,
        product,
        unit_price: product.selling_price,
        tax_rate: product.tax_rate,
      };
      setItems(newItems);
    }
    setSearchProductInput('');
    setFilteredProducts([]);
    setSelectedProductIndex(null);
  };

  // Update item
  const updateItem = (index: number, changes: Partial<QuotationItem>) => {
    const newItems = [...items];
    const item = newItems[index];

    // Recalculate totals
    const qty = changes.quantity ?? item.quantity;
    const price = changes.unit_price ?? item.unit_price;
    const discPct = changes.discount_percentage ?? item.discount_percentage;
    const taxRate = changes.tax_rate ?? item.tax_rate;

    const calc = calcLineTotal(qty, price, discPct, taxRate);

    newItems[index] = {
      ...item,
      ...changes,
      discount_amount: calc.discount,
      tax_amount: calc.tax,
      total_amount: calc.total,
    };

    setItems(newItems);
  };

  // Add item
  const addItem = () => {
    setItems([
      ...items,
      {
        id: `temp-${Date.now()}`,
        quotation_id: quotation?.id || '',
        product_id: '',
        variant_id: null,
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_percentage: 0,
        discount_amount: 0,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 0,
        sort_order: items.length,
        product: undefined,
      },
    ]);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totals = calcDocTotals(items);

  // Save quotation
  const handleSave = async (sendNow: boolean = false) => {
    if (!form.customer_id) {
      toast({ message: 'Please select a customer', type: 'error' });
      return;
    }

    if (items.some(item => !item.product_id)) {
      toast({ message: 'All items must have a product selected', type: 'error' });
      return;
    }

    if (items.some(item => item.quantity <= 0)) {
      toast({ message: 'Item quantities must be greater than 0', type: 'error' });
      return;
    }

    try {
      setSaving(true);

      let quotationId = id;

      if (isEditing && quotation) {
        // Update existing
        const { error: updateError } = await supabase
          .from('quotations')
          .update({
            customer_id: form.customer_id,
            project_id: form.project_id || null,
            valid_until: form.valid_until,
            notes: form.notes || null,
            terms: form.terms || null,
            subtotal: totals.subtotal,
            tax_amount: totals.tax_amount,
            discount_amount: totals.discount_amount,
            total_amount: totals.total_amount,
            status: sendNow ? 'sent' : 'draft',
            updated_at: new Date().toISOString(),
          })
          .eq('id', quotation.id);

        if (updateError) throw updateError;

        // Delete existing items
        await supabase.from('quotation_items').delete().eq('quotation_id', quotation.id);
      } else {
        // Create new
        const { count } = await supabase.from('quotations').select('*', { count: 'exact', head: true });
        const quotationNumber = `QT-${String((count || 0) + 1).padStart(6, '0')}`;

        const { data: newQuot, error: createError } = await supabase
          .from('quotations')
          .insert([
            {
              quotation_number: quotationNumber,
              customer_id: form.customer_id,
              project_id: form.project_id || null,
              valid_until: form.valid_until,
              notes: form.notes || null,
              terms: form.terms || null,
              subtotal: totals.subtotal,
              tax_amount: totals.tax_amount,
              discount_amount: totals.discount_amount,
              total_amount: totals.total_amount,
              status: sendNow ? 'sent' : 'draft',
              created_by: user?.id,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        quotationId = newQuot.id;
      }

      // Insert items
      const itemsToInsert = items.map((item, idx) => ({
        quotation_id: quotationId,
        product_id: item.product_id,
        variant_id: item.variant_id,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        total_amount: item.total_amount,
        sort_order: idx,
      }));

      const { error: itemsError } = await supabase.from('quotation_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      const message = sendNow ? 'Quotation sent successfully' : 'Quotation saved as draft';
      toast({ message, type: 'success' });

      navigate(`/quotations/${quotationId}`);
    } catch (err) {
      console.error('Error saving quotation:', err);
      toast({ message: 'Failed to save quotation', type: 'error' });
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Quotation' : 'New Quotation'}
        </h1>
        <Button variant="outline" onClick={() => navigate('/quotations')}>
          Cancel
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Customer & Project */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Customer *</label>
              <Select
                value={form.customer_id}
                onChange={v => setForm({ ...form, customer_id: v })}
                options={customers.map(c => ({ label: c.name, value: c.id }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Project (Optional)</label>
              <Select
                value={form.project_id}
                onChange={v => setForm({ ...form, project_id: v })}
                options={[{ label: 'None', value: '' }, ...projects.map(p => ({ label: p.name, value: p.id }))]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Valid Until</label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={e => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h2>

          <div className="space-y-3 mb-4">
            {items.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Product Selection */}
                  <div className="md:col-span-2 relative">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Product *</label>
                    {item.product ? (
                      <div className="p-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-900">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{item.product.name}</p>
                            <p className="text-xs text-gray-600">{item.product.sku}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateItem(idx, { product_id: '', product: undefined, unit_price: 0 })}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Input
                          type="text"
                          placeholder="Search product..."
                          value={selectedProductIndex === idx ? searchProductInput : ''}
                          onFocus={() => setSelectedProductIndex(idx)}
                          onChange={e => setSearchProductInput(e.target.value)}
                          className="text-sm"
                        />
                        {selectedProductIndex === idx && filteredProducts.length > 0 && (
                          <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-10 max-h-48 overflow-y-auto">
                            {filteredProducts.map(prod => (
                              <button
                                key={prod.id}
                                onClick={() => handleSelectProduct(prod)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100"
                              >
                                <p className="font-medium">{prod.name}</p>
                                <p className="text-xs text-gray-600">{prod.sku} • {formatCurrency(prod.selling_price)}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })}
                      min="1"
                      className="text-sm"
                    />
                  </div>

                  {/* Unit Price */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price</label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      className="text-sm"
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
                    <Input
                      type="number"
                      value={item.discount_percentage}
                      onChange={e => updateItem(idx, { discount_percentage: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Tax Rate */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tax %</label>
                    <Input
                      type="number"
                      value={item.tax_rate}
                      onChange={e => updateItem(idx, { tax_rate: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      className="text-sm"
                    />
                  </div>

                  {/* Line Total */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Line Total</label>
                    <div className="p-2 bg-gray-50 rounded border border-gray-200 text-sm font-semibold text-gray-900">
                      {formatCurrency(item.total_amount)}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <Input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(idx, { description: e.target.value })}
                      placeholder="Optional"
                      className="text-sm"
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeItem(idx)}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addItem} className="w-full">
            + Add Line Item
          </Button>
        </Card>

        {/* Notes & Terms */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes & Terms</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional notes..."
                className="w-full p-2 border border-gray-200 rounded text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Terms & Conditions</label>
              <textarea
                value={form.terms}
                onChange={e => setForm({ ...form, terms: e.target.value })}
                placeholder="Terms & conditions..."
                className="w-full p-2 border border-gray-200 rounded text-sm"
                rows={3}
              />
            </div>
          </div>
        </Card>

        {/* Totals */}
        <Card className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Subtotal</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.subtotal)}</p>
            </div>
            {totals.discount_amount > 0 && (
              <div>
                <p className="text-sm text-gray-600">Total Discount</p>
                <p className="text-2xl font-bold text-orange-600">-{formatCurrency(totals.discount_amount)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Total Tax</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.tax_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Grand Total</p>
              <p className="text-2xl font-bold text-primary-600">{formatCurrency(totals.total_amount)}</p>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate('/quotations')}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            loading={saving}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            loading={saving}
          >
            {isEditing ? 'Update & Send' : 'Create & Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
