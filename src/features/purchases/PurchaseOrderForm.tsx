import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, calcLineTotal, calcDocTotals } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Supplier, Warehouse, Product, PurchaseOrder, PurchaseOrderItem } from '../../types';

export function PurchaseOrderForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useUiStore();
  const { user } = useAuthStore();
  const isEditing = !!id;

  // State
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [showGoodsReceiptModal, setShowGoodsReceiptModal] = useState(false);

  const [form, setForm] = useState({
    supplier_id: '',
    warehouse_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
    status: 'draft' as const,
  });

  const [items, setItems] = useState<(PurchaseOrderItem & { product?: Product })[]>([
    {
      id: 'temp-0',
      purchase_order_id: '',
      product_id: '',
      variant_id: null,
      quantity: 1,
      received_quantity: 0,
      unit_cost: 0,
      tax_rate: 0,
      tax_amount: 0,
      discount_amount: 0,
      total_amount: 0,
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
        // Load suppliers
        const { data: suppData } = await supabase
          .from('suppliers')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (suppData) setSuppliers(suppData);

        // Load warehouses
        const { data: whData } = await supabase
          .from('warehouses')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (whData) setWarehouses(whData);

        // Load products
        const { data: prodData } = await supabase
          .from('products')
          .select('*, unit:units(*)')
          .eq('is_active', true)
          .order('name');
        if (prodData) setProducts(prodData);

        // Load PO if editing
        if (isEditing && id) {
          const { data: poData } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('id', id)
            .single();

          if (poData) {
            setPurchaseOrder(poData);
            setForm({
              supplier_id: poData.supplier_id,
              warehouse_id: poData.warehouse_id,
              order_date: poData.order_date,
              expected_date: poData.expected_date || '',
              notes: poData.notes || '',
              terms: poData.terms || '',
              status: poData.status,
            });

            // Load items
            const { data: itemData } = await supabase
              .from('purchase_order_items')
              .select('*, product:products(*, unit:units(*))')
              .eq('purchase_order_id', id)
              .order('id');

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

  // Filter products
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
        unit_cost: product.cost_price,
        tax_rate: product.tax_rate,
      };
      setItems(newItems);
    }
    setSearchProductInput('');
    setFilteredProducts([]);
    setSelectedProductIndex(null);
  };

  // Update item
  const updateItem = (index: number, changes: Partial<PurchaseOrderItem>) => {
    const newItems = [...items];
    const item = newItems[index];

    // Recalculate totals
    const qty = changes.quantity ?? item.quantity;
    const cost = changes.unit_cost ?? item.unit_cost;
    const taxRate = changes.tax_rate ?? item.tax_rate;

    const calc = calcLineTotal(qty, cost, 0, taxRate);

    newItems[index] = {
      ...item,
      ...changes,
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
        purchase_order_id: purchaseOrder?.id || '',
        product_id: '',
        variant_id: null,
        quantity: 1,
        received_quantity: 0,
        unit_cost: 0,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        product: undefined,
      },
    ]);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals with supplier discount
  const selectedSupplier = suppliers.find(s => s.id === form.supplier_id);
  const supplierDiscountPct = selectedSupplier?.discount_percentage || 0;

  const totals = React.useMemo(() => {
    const baseTotals = calcDocTotals(items);
    const supplierDiscount = baseTotals.subtotal * (supplierDiscountPct / 100);
    return {
      ...baseTotals,
      discount_amount: baseTotals.discount_amount + supplierDiscount,
      total_amount: baseTotals.subtotal - baseTotals.discount_amount - supplierDiscount + baseTotals.tax_amount,
    };
  }, [items, supplierDiscountPct]);

  // Save PO
  const handleSave = async (newStatus: string = 'draft') => {
    if (!form.supplier_id) {
      toast({ message: 'Please select a supplier', type: 'error' });
      return;
    }

    if (!form.warehouse_id) {
      toast({ message: 'Please select a warehouse', type: 'error' });
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

      let poId = id;

      if (isEditing && purchaseOrder) {
        // Update existing
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({
            supplier_id: form.supplier_id,
            warehouse_id: form.warehouse_id,
            order_date: form.order_date,
            expected_date: form.expected_date || null,
            notes: form.notes || null,
            terms: form.terms || null,
            subtotal: totals.subtotal,
            tax_amount: totals.tax_amount,
            discount_amount: totals.discount_amount,
            total_amount: totals.total_amount,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', purchaseOrder.id);

        if (updateError) throw updateError;

        // Delete existing items
        await supabase.from('purchase_order_items').delete().eq('purchase_order_id', purchaseOrder.id);
      } else {
        // Create new
        const { count } = await supabase.from('purchase_orders').select('*', { count: 'exact', head: true });
        const poNumber = `PO-${String((count || 0) + 1).padStart(6, '0')}`;

        const { data: newPo, error: createError } = await supabase
          .from('purchase_orders')
          .insert([
            {
              po_number: poNumber,
              supplier_id: form.supplier_id,
              warehouse_id: form.warehouse_id,
              order_date: form.order_date,
              expected_date: form.expected_date || null,
              notes: form.notes || null,
              terms: form.terms || null,
              subtotal: totals.subtotal,
              tax_amount: totals.tax_amount,
              discount_amount: totals.discount_amount,
              total_amount: totals.total_amount,
              paid_amount: 0,
              status: newStatus,
              created_by: user?.id,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;
        poId = newPo.id;
      }

      // Insert items
      const itemsToInsert = items.map((item, idx) => ({
        purchase_order_id: poId,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        received_quantity: 0,
        unit_cost: item.unit_cost,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        discount_amount: item.discount_amount,
        total_amount: item.total_amount,
      }));

      const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      const message = newStatus === 'sent' ? 'PO sent to supplier' : 'PO saved as draft';
      toast({ message, type: 'success' });

      navigate(`/purchases/${poId}`);
    } catch (err) {
      console.error('Error saving PO:', err);
      toast({ message: 'Failed to save purchase order', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Receive goods
  const handleReceiveGoods = async () => {
    if (!purchaseOrder) return;

    try {
      setSaving(true);

      // Create goods receipt
      const { count } = await supabase.from('stock_movements').select('*', { count: 'exact', head: true });

      // Create stock movements for each item
      const movements = items.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        warehouse_id: form.warehouse_id,
        movement_type: 'stock_in' as const,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        reference_type: 'purchase_order',
        reference_id: purchaseOrder.id,
        created_by: user?.id,
      }));

      const { error: movementError } = await supabase.from('stock_movements').insert(movements);
      if (movementError) throw movementError;

      // Update PO status
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'received',
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseOrder.id);

      if (updateError) throw updateError;

      toast({ message: 'Goods received and stock updated', type: 'success' });
      setShowGoodsReceiptModal(false);
      navigate('/purchases');
    } catch (err) {
      console.error('Error receiving goods:', err);
      toast({ message: 'Failed to receive goods', type: 'error' });
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
          {isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}
        </h1>
        <Button variant="outline" onClick={() => navigate('/purchases')}>
          Cancel
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Supplier & Warehouse */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Supplier *</label>
              <Select
                value={form.supplier_id}
                onChange={v => setForm({ ...form, supplier_id: v })}
                options={suppliers.map(s => ({ label: s.name, value: s.id }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Warehouse *</label>
              <Select
                value={form.warehouse_id}
                onChange={v => setForm({ ...form, warehouse_id: v })}
                options={warehouses.map(w => ({ label: w.name, value: w.id }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Order Date</label>
              <Input
                type="date"
                value={form.order_date}
                onChange={e => setForm({ ...form, order_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Expected Delivery</label>
              <Input
                type="date"
                value={form.expected_date}
                onChange={e => setForm({ ...form, expected_date: e.target.value })}
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                            onClick={() => updateItem(idx, { product_id: '', product: undefined, unit_cost: 0 })}
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
                                <p className="text-xs text-gray-600">{prod.sku} • Cost: {formatCurrency(prod.cost_price)}</p>
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

                  {/* Unit Cost */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unit Cost</label>
                    <Input
                      type="number"
                      value={item.unit_cost}
                      onChange={e => updateItem(idx, { unit_cost: parseFloat(e.target.value) || 0 })}
                      step="0.01"
                      className="text-sm"
                    />
                  </div>

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
                </div>

                <div className="flex items-end gap-3">
                  {/* Line Total */}
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Line Total</label>
                    <div className="p-2 bg-gray-50 rounded border border-gray-200 text-sm font-semibold text-gray-900">
                      {formatCurrency(item.total_amount)}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeItem(idx)}
                  >
                    Remove
                  </Button>
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
            {(supplierDiscountPct > 0 || totals.discount_amount > 0) && (
              <div>
                <p className="text-sm text-gray-600">
                  Discount {supplierDiscountPct > 0 && <span className="text-primary-600">({supplierDiscountPct}% supplier)</span>}
                </p>
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
            onClick={() => navigate('/purchases')}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            loading={saving}
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSave('sent')}
            loading={saving}
          >
            {isEditing ? 'Update & Send' : 'Create & Send'}
          </Button>
          {isEditing && purchaseOrder?.status === 'sent' && (
            <Button
              onClick={() => setShowGoodsReceiptModal(true)}
              loading={saving}
            >
              Receive Goods
            </Button>
          )}
        </div>
      </div>

      {/* Goods Receipt Modal */}
      <Modal
        isOpen={showGoodsReceiptModal}
        onClose={() => setShowGoodsReceiptModal(false)}
        title="Receive Goods"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            This will mark the purchase order as received and create stock movements for all items.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-900 font-semibold">Items to receive: {items.length}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGoodsReceiptModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReceiveGoods}
              loading={saving}
            >
              Confirm Receipt
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
