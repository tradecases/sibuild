import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCurrency, formatDate, cn, calcLineTotal, calcDocTotals } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Product, Customer, Category, InvoiceItem, PaymentMethod } from '../../types';

export function POSPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useUiStore();

  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cartItems, setCartItems] = useState<(InvoiceItem & { product?: Product })[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingProducts(true);

        // Load categories
        const { data: catData } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (catData) setCategories(catData);

        // Load customers
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('is_active', true)
          .order('name');
        if (custData) setCustomers(custData);

        // Load all products
        const { data: prodData } = await supabase
          .from('products')
          .select('*, category:categories(*), unit:units(*)')
          .eq('is_active', true)
          .order('name');
        if (prodData) setProducts(prodData);
      } catch (err) {
        console.error('Error loading data:', err);
        toast({ message: 'Failed to load data', type: 'error' });
      } finally {
        setLoadingProducts(false);
      }
    };

    loadData();
  }, [toast]);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch =
      !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.includes(searchTerm) || p.barcode?.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  // Handle barcode scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const product = products.find(p => p.barcode === barcodeInput || p.sku === barcodeInput);
    if (product) {
      addToCart(product, 1);
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    } else {
      toast({ message: 'Product not found', type: 'error' });
    }
  };

  // Add to cart
  const addToCart = (product: Product, quantity: number = 1) => {
    const existing = cartItems.find(item => item.product_id === product.id);

    if (existing) {
      setCartItems(
        cartItems.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        )
      );
    } else {
      const { tax } = calcLineTotal(quantity, product.selling_price, 0, product.tax_rate);
      const newItem: InvoiceItem & { product?: Product } = {
        id: `temp-${Date.now()}`,
        invoice_id: '',
        product_id: product.id,
        variant_id: null,
        warehouse_id: null,
        description: product.description || null,
        quantity,
        unit_price: product.selling_price,
        discount_percentage: 0,
        discount_amount: 0,
        tax_rate: product.tax_rate,
        tax_amount: tax,
        total_amount: quantity * product.selling_price + tax,
        sort_order: cartItems.length,
        product,
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  // Update cart item
  const updateCartItem = (index: number, changes: Partial<InvoiceItem>) => {
    setCartItems(
      cartItems.map((item, i) => {
        if (i !== index) return item;
        return { ...item, ...changes };
      })
    );
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totals = calcDocTotals(cartItems);
  const discountedSubtotal = totals.subtotal - totals.discount_amount;
  const finalTotal = totals.total_amount;
  const change = amountReceived - finalTotal;

  // Create invoice
  const handleCreateInvoice = async () => {
    if (!selectedCustomer) {
      toast({ message: 'Please select a customer', type: 'error' });
      return;
    }

    if (cartItems.length === 0) {
      toast({ message: 'Cart is empty', type: 'error' });
      return;
    }

    if (amountReceived < finalTotal && paymentMethod !== 'credit') {
      toast({ message: 'Insufficient amount received', type: 'error' });
      return;
    }

    try {
      setLoadingCheckout(true);

      // Get invoice count for numbering
      const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
      const invoiceNumber = `INV-${String((count || 0) + 1).padStart(6, '0')}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            invoice_number: invoiceNumber,
            customer_id: selectedCustomer.id,
            status: 'issued',
            invoice_date: new Date().toISOString(),
            due_date: selectedCustomer.credit_limit > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
            subtotal: totals.subtotal,
            tax_amount: totals.tax_amount,
            discount_amount: totals.discount_amount,
            total_amount: finalTotal,
            paid_amount: paymentMethod === 'credit' ? 0 : Math.min(amountReceived, finalTotal),
            balance_due: paymentMethod === 'credit' ? finalTotal : Math.max(0, finalTotal - amountReceived),
            payment_method: paymentMethod,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const itemsToInsert = cartItems.map((item, idx) => ({
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

      // Create stock movements
      const movementsToInsert = cartItems.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id,
        warehouse_id: null,
        movement_type: 'stock_out' as const,
        quantity: item.quantity,
        unit_cost: item.unit_price,
        reference_type: 'invoice',
        reference_id: invoice.id,
        created_by: user?.id,
      }));

      const { error: movementError } = await supabase.from('stock_movements').insert(movementsToInsert);
      if (movementError) throw movementError;

      // Update customer outstanding balance
      const newBalance = selectedCustomer.outstanding_balance + (paymentMethod === 'credit' ? finalTotal : Math.max(0, finalTotal - amountReceived));
      await supabase.from('customers').update({ outstanding_balance: newBalance }).eq('id', selectedCustomer.id);

      toast({ message: `Invoice ${invoiceNumber} created successfully`, type: 'success' });
      navigate(`/sales/invoices/${invoice.id}`);
    } catch (err) {
      console.error('Error creating invoice:', err);
      toast({ message: 'Failed to create invoice', type: 'error' });
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <div className="flex h-full gap-4 p-4 bg-gray-50">
      {/* Left Panel - Product Search */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-gray-600">Scan products or search to add to cart</p>
        </div>

        {/* Barcode Input */}
        <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
          <Input
            ref={barcodeInputRef}
            type="text"
            placeholder="Scan barcode or SKU..."
            value={barcodeInput}
            onChange={e => setBarcodeInput(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" variant="outline">
            Scan
          </Button>
        </form>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            size="sm"
            variant={selectedCategory === null ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Product Search */}
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => (
                <Card
                  key={product.id}
                  className="p-3 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => addToCart(product, 1)}
                >
                  <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-600 mb-2">{product.sku}</p>
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-primary-600">{formatCurrency(product.selling_price)}</p>
                    <Badge variant="outline">{product.unit?.abbreviation || 'pcs'}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-96 flex flex-col gap-4 bg-white rounded-lg shadow p-4">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Customer</label>
          <Select
            value={selectedCustomer?.id || ''}
            onChange={id => {
              const cust = customers.find(c => c.id === id);
              setSelectedCustomer(cust || null);
            }}
            options={[
              { label: 'Walk-in Customer', value: 'walk-in' },
              ...customers.map(c => ({ label: c.name, value: c.id })),
            ]}
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto border rounded p-3 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
          {cartItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item, idx) => {
                const lineCalc = calcLineTotal(item.quantity, item.unit_price, item.discount_percentage, item.tax_rate);
                return (
                  <div key={idx} className="bg-white p-2 rounded border border-gray-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{item.product?.name}</p>
                        <p className="text-xs text-gray-600">{formatCurrency(item.unit_price)}/unit</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromCart(idx)}
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex gap-2 items-center mb-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartItem(idx, { quantity: Math.max(1, item.quantity - 1) })}
                        className="h-6 w-6 p-0"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateCartItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                        className="h-6 w-12 text-center text-xs"
                        min="1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateCartItem(idx, { quantity: item.quantity + 1 })}
                        className="h-6 w-6 p-0"
                      >
                        +
                      </Button>
                      <span className="text-xs text-gray-600 flex-1">{item.quantity} qty</span>
                    </div>

                    {/* Discount */}
                    <div className="flex gap-2 items-center mb-2">
                      <label className="text-xs text-gray-600">Discount %:</label>
                      <Input
                        type="number"
                        value={item.discount_percentage}
                        onChange={e => updateCartItem(idx, { discount_percentage: parseFloat(e.target.value) || 0 })}
                        className="h-6 w-16 text-xs"
                        min="0"
                        max="100"
                      />
                    </div>

                    {/* Line total */}
                    <div className="text-right text-xs font-semibold text-gray-900">
                      {formatCurrency(lineCalc.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Discount:</span>
              <span>-{formatCurrency(totals.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span>Tax:</span>
            <span>{formatCurrency(totals.tax_amount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span className="text-primary-600">{formatCurrency(finalTotal)}</span>
          </div>
        </div>

        {/* Payment Section */}
        <div className="space-y-3 border-t pt-3">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Payment Method</label>
            <Select
              value={paymentMethod}
              onChange={v => setPaymentMethod(v as PaymentMethod)}
              options={[
                { label: 'Cash', value: 'cash' },
                { label: 'Card', value: 'card' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Cheque', value: 'cheque' },
                { label: 'Credit', value: 'credit' },
              ]}
            />
          </div>

          {paymentMethod !== 'credit' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Amount Received</label>
              <Input
                type="number"
                value={amountReceived}
                onChange={e => setAmountReceived(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
              />
              {amountReceived > 0 && (
                <p className={cn('text-sm mt-1', change >= 0 ? 'text-green-600' : 'text-red-600')}>
                  Change: {formatCurrency(Math.max(0, change))}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Checkout Button */}
        <Button
          onClick={() => setShowPaymentModal(true)}
          disabled={cartItems.length === 0 || !selectedCustomer || loadingCheckout}
          size="lg"
          className="w-full"
        >
          {loadingCheckout ? 'Creating Invoice...' : 'Create Invoice'}
        </Button>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Confirm Invoice"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Customer: <span className="font-semibold">{selectedCustomer?.name}</span></p>
            <p className="text-sm text-gray-600">Items: <span className="font-semibold">{cartItems.length}</span></p>
            <p className="text-sm text-gray-600">Total: <span className="font-bold text-lg text-primary-600">{formatCurrency(finalTotal)}</span></p>
            {paymentMethod !== 'credit' && (
              <p className="text-sm text-gray-600">Paid: <span className="font-semibold">{formatCurrency(Math.min(amountReceived, finalTotal))}</span></p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateInvoice}
              loading={loadingCheckout}
            >
              Confirm & Create Invoice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
