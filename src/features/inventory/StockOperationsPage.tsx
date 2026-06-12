import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { Table, Column } from '../../components/ui/Table';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Product, Warehouse, StockMovement } from '../../types';

export function StockOperationsPage() {
  const [activeTab, setActiveTab] = useState('stock-in');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useUiStore.getState().toast;

  // Form states
  const [stockInForm, setStockInForm] = useState({
    product_id: '',
    variant_id: '',
    warehouse_id: '',
    quantity: 0,
    unit_cost: 0,
    notes: '',
    reference: '',
  });

  const [stockOutForm, setStockOutForm] = useState({
    product_id: '',
    variant_id: '',
    warehouse_id: '',
    quantity: 0,
    notes: '',
  });

  const [transferForm, setTransferForm] = useState({
    product_id: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    quantity: 0,
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    product_id: '',
    warehouse_id: '',
    new_quantity: 0,
    reason: '',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadMovements();
    }
  }, [activeTab]);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const [productsRes, warehousesRes] = await Promise.all([
        supabase.from('products').select('*').eq('is_active', true),
        supabase.from('warehouses').select('*').eq('is_active', true),
      ]);

      setProducts(productsRes.data || []);
      setWarehouses(warehousesRes.data || []);
    } catch (error) {
      console.error('Error loading options:', error);
      toast.error('Failed to load form options');
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('stock_movements')
        .select('*, product:products(name), warehouse:warehouses(name), created_by_profile:profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      setMovements(data || []);
    } catch (error) {
      console.error('Error loading movements:', error);
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const handleStockIn = async () => {
    if (!stockInForm.product_id || !stockInForm.warehouse_id || stockInForm.quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: stockInForm.product_id,
          variant_id: stockInForm.variant_id || null,
          warehouse_id: stockInForm.warehouse_id,
          movement_type: 'stock_in',
          quantity: stockInForm.quantity,
          unit_cost: stockInForm.unit_cost || null,
          reference_type: 'manual',
          reference_id: stockInForm.reference || null,
          notes: stockInForm.notes,
          created_at: new Date().toISOString(),
        }]);

      if (movementError) throw movementError;

      // Update stock level
      const { data: existingStock } = await supabase
        .from('stock_levels')
        .select('*')
        .eq('product_id', stockInForm.product_id)
        .eq('warehouse_id', stockInForm.warehouse_id)
        .eq('variant_id', stockInForm.variant_id || null)
        .single();

      if (existingStock) {
        await supabase
          .from('stock_levels')
          .update({ quantity: existingStock.quantity + stockInForm.quantity })
          .eq('id', existingStock.id);
      } else {
        await supabase
          .from('stock_levels')
          .insert([{
            product_id: stockInForm.product_id,
            variant_id: stockInForm.variant_id || null,
            warehouse_id: stockInForm.warehouse_id,
            quantity: stockInForm.quantity,
            reserved_quantity: 0,
          }]);
      }

      toast.success('Stock added successfully');
      setStockInForm({ product_id: '', variant_id: '', warehouse_id: '', quantity: 0, unit_cost: 0, notes: '', reference: '' });
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Failed to add stock');
    }
  };

  const handleStockOut = async () => {
    if (!stockOutForm.product_id || !stockOutForm.warehouse_id || stockOutForm.quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      // Check available quantity
      const { data: stock } = await supabase
        .from('stock_levels')
        .select('*')
        .eq('product_id', stockOutForm.product_id)
        .eq('warehouse_id', stockOutForm.warehouse_id)
        .eq('variant_id', stockOutForm.variant_id || null)
        .single();

      if (!stock || stock.quantity < stockOutForm.quantity) {
        toast.error('Insufficient stock available');
        return;
      }

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: stockOutForm.product_id,
          variant_id: stockOutForm.variant_id || null,
          warehouse_id: stockOutForm.warehouse_id,
          movement_type: 'stock_out',
          quantity: stockOutForm.quantity,
          notes: stockOutForm.notes,
          created_at: new Date().toISOString(),
        }]);

      if (movementError) throw movementError;

      // Update stock level
      await supabase
        .from('stock_levels')
        .update({ quantity: stock.quantity - stockOutForm.quantity })
        .eq('id', stock.id);

      toast.success('Stock removed successfully');
      setStockOutForm({ product_id: '', variant_id: '', warehouse_id: '', quantity: 0, notes: '' });
    } catch (error) {
      console.error('Error removing stock:', error);
      toast.error('Failed to remove stock');
    }
  };

  const handleTransfer = async () => {
    if (!transferForm.product_id || !transferForm.from_warehouse_id || !transferForm.to_warehouse_id || transferForm.quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    if (transferForm.from_warehouse_id === transferForm.to_warehouse_id) {
      toast.error('Source and destination warehouses must be different');
      return;
    }

    try {
      // Check source stock
      const { data: sourceStock } = await supabase
        .from('stock_levels')
        .select('*')
        .eq('product_id', transferForm.product_id)
        .eq('warehouse_id', transferForm.from_warehouse_id)
        .single();

      if (!sourceStock || sourceStock.quantity < transferForm.quantity) {
        toast.error('Insufficient stock in source warehouse');
        return;
      }

      // Create transfer movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: transferForm.product_id,
          warehouse_id: transferForm.from_warehouse_id,
          destination_warehouse_id: transferForm.to_warehouse_id,
          movement_type: 'transfer',
          quantity: transferForm.quantity,
          created_at: new Date().toISOString(),
        }]);

      if (movementError) throw movementError;

      // Update source stock
      await supabase
        .from('stock_levels')
        .update({ quantity: sourceStock.quantity - transferForm.quantity })
        .eq('id', sourceStock.id);

      // Update or create destination stock
      const { data: destStock } = await supabase
        .from('stock_levels')
        .select('*')
        .eq('product_id', transferForm.product_id)
        .eq('warehouse_id', transferForm.to_warehouse_id)
        .single();

      if (destStock) {
        await supabase
          .from('stock_levels')
          .update({ quantity: destStock.quantity + transferForm.quantity })
          .eq('id', destStock.id);
      } else {
        await supabase
          .from('stock_levels')
          .insert([{
            product_id: transferForm.product_id,
            warehouse_id: transferForm.to_warehouse_id,
            quantity: transferForm.quantity,
            reserved_quantity: 0,
          }]);
      }

      toast.success('Stock transferred successfully');
      setTransferForm({ product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: 0 });
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast.error('Failed to transfer stock');
    }
  };

  const handleAdjustment = async () => {
    if (!adjustmentForm.product_id || !adjustmentForm.warehouse_id) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const { data: stock } = await supabase
        .from('stock_levels')
        .select('*')
        .eq('product_id', adjustmentForm.product_id)
        .eq('warehouse_id', adjustmentForm.warehouse_id)
        .single();

      const difference = adjustmentForm.new_quantity - (stock?.quantity || 0);

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: adjustmentForm.product_id,
          warehouse_id: adjustmentForm.warehouse_id,
          movement_type: 'adjustment',
          quantity: Math.abs(difference),
          notes: adjustmentForm.reason,
          created_at: new Date().toISOString(),
        }]);

      if (movementError) throw movementError;

      // Update stock level
      if (stock) {
        await supabase
          .from('stock_levels')
          .update({ quantity: adjustmentForm.new_quantity })
          .eq('id', stock.id);
      } else {
        await supabase
          .from('stock_levels')
          .insert([{
            product_id: adjustmentForm.product_id,
            warehouse_id: adjustmentForm.warehouse_id,
            quantity: adjustmentForm.new_quantity,
            reserved_quantity: 0,
          }]);
      }

      toast.success('Stock adjusted successfully');
      setAdjustmentForm({ product_id: '', warehouse_id: '', new_quantity: 0, reason: '' });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    }
  };

  const columns: Column<StockMovement>[] = [
    {
      key: 'product',
      label: 'Product',
      render: (_, row) => <p className="font-medium">{(row.product as any)?.name}</p>,
    },
    {
      key: 'movement_type',
      label: 'Type',
      render: (value) => {
        const types: Record<string, string> = {
          stock_in: 'Stock In',
          stock_out: 'Stock Out',
          transfer: 'Transfer',
          adjustment: 'Adjustment',
          damage: 'Damage',
          return: 'Return',
          opening: 'Opening',
        };
        return <span className="font-medium text-slate-700">{types[value as string] || value}</span>;
      },
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (_, row) => <p>{(row.warehouse as any)?.name}</p>,
    },
    {
      key: 'quantity',
      label: 'Quantity',
      align: 'right',
      render: (value) => <p className="font-medium">{value}</p>,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => <p className="text-sm text-slate-600">{formatDate(value as string)}</p>,
    },
    {
      key: 'created_by_profile',
      label: 'Created By',
      render: (_, row) => <p className="text-sm">{(row.created_by_profile as any)?.full_name || 'System'}</p>,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Stock Operations</h1>
        <p className="text-sm text-slate-500 mt-1">Manage inventory movements and adjustments</p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'stock-in', label: 'Stock In' },
          { id: 'stock-out', label: 'Stock Out' },
          { id: 'transfers', label: 'Transfers' },
          { id: 'adjustments', label: 'Adjustments' },
          { id: 'history', label: 'History' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Stock In */}
      {activeTab === 'stock-in' && (
        <Card title="Add Stock">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Product *</label>
              <select
                value={stockInForm.product_id}
                onChange={(e) => setStockInForm(prev => ({ ...prev, product_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Warehouse *</label>
              <select
                value={stockInForm.warehouse_id}
                onChange={(e) => setStockInForm(prev => ({ ...prev, warehouse_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Quantity *"
              type="number"
              value={stockInForm.quantity}
              onChange={(e) => setStockInForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              min="1"
            />
            <Input
              label="Unit Cost"
              type="number"
              value={stockInForm.unit_cost}
              onChange={(e) => setStockInForm(prev => ({ ...prev, unit_cost: Number(e.target.value) }))}
              step="0.01"
            />
            <Input
              label="Reference"
              value={stockInForm.reference}
              onChange={(e) => setStockInForm(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="PO Number, Invoice, etc."
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Notes</label>
              <textarea
                value={stockInForm.notes}
                onChange={(e) => setStockInForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
            <Button onClick={handleStockIn}>Add Stock</Button>
          </div>
        </Card>
      )}

      {/* Stock Out */}
      {activeTab === 'stock-out' && (
        <Card title="Remove Stock">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Product *</label>
              <select
                value={stockOutForm.product_id}
                onChange={(e) => setStockOutForm(prev => ({ ...prev, product_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Warehouse *</label>
              <select
                value={stockOutForm.warehouse_id}
                onChange={(e) => setStockOutForm(prev => ({ ...prev, warehouse_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Quantity *"
              type="number"
              value={stockOutForm.quantity}
              onChange={(e) => setStockOutForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
              min="1"
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Notes</label>
              <textarea
                value={stockOutForm.notes}
                onChange={(e) => setStockOutForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Reason for removal"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
            <Button onClick={handleStockOut}>Remove Stock</Button>
          </div>
        </Card>
      )}

      {/* Transfers */}
      {activeTab === 'transfers' && (
        <Card title="Transfer Stock">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Product *</label>
              <select
                value={transferForm.product_id}
                onChange={(e) => setTransferForm(prev => ({ ...prev, product_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Quantity *</label>
              <Input
                type="number"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                min="1"
                placeholder="Quantity"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">From Warehouse *</label>
              <select
                value={transferForm.from_warehouse_id}
                onChange={(e) => setTransferForm(prev => ({ ...prev, from_warehouse_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Source Warehouse</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">To Warehouse *</label>
              <select
                value={transferForm.to_warehouse_id}
                onChange={(e) => setTransferForm(prev => ({ ...prev, to_warehouse_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Destination Warehouse</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
            <Button onClick={handleTransfer}>Transfer Stock</Button>
          </div>
        </Card>
      )}

      {/* Adjustments */}
      {activeTab === 'adjustments' && (
        <Card title="Adjust Stock">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Product *</label>
              <select
                value={adjustmentForm.product_id}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, product_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku || 'N/A'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Warehouse *</label>
              <select
                value={adjustmentForm.warehouse_id}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, warehouse_id: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="New Quantity *"
              type="number"
              value={adjustmentForm.new_quantity}
              onChange={(e) => setAdjustmentForm(prev => ({ ...prev, new_quantity: Number(e.target.value) }))}
              min="0"
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Reason</label>
              <Input
                value={adjustmentForm.reason}
                onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Reason for adjustment"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
            <Button onClick={handleAdjustment}>Adjust Stock</Button>
          </div>
        </Card>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <Card title="Stock Movement History">
          {loading ? (
            <SkeletonTable rows={8} cols={6} />
          ) : movements.length === 0 ? (
            <EmptyState
              title="No movements yet"
              description="Stock movements will appear here"
              size="lg"
            />
          ) : (
            <Table columns={columns} data={movements} />
          )}
        </Card>
      )}
    </div>
  );
}
