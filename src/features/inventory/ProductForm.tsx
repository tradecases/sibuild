import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import type { Product, Category, Brand, Unit } from '../../types';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  productId?: string;
  initialData?: Product;
}

interface FormData {
  name: string;
  description: string;
  category_id: string;
  brand_id: string;
  unit_id: string;
  sku: string;
  barcode: string;
  cost_price: number;
  selling_price: number;
  min_selling_price: number;
  tax_rate: number;
  reorder_level: number;
  max_stock_level: number;
  is_featured: boolean;
  is_active: boolean;
  tags: string[];
  specifications: Record<string, string>;
}

const defaultForm: FormData = {
  name: '',
  description: '',
  category_id: '',
  brand_id: '',
  unit_id: '',
  sku: '',
  barcode: '',
  cost_price: 0,
  selling_price: 0,
  min_selling_price: 0,
  tax_rate: 0,
  reorder_level: 10,
  max_stock_level: 100,
  is_featured: false,
  is_active: true,
  tags: [],
  specifications: {},
};

export function ProductForm({ isOpen, onClose, onSaved, productId, initialData }: ProductFormProps) {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const toast = useUiStore.getState().toast;

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (initialData) {
        setForm(initialData as FormData);
      } else {
        setForm(defaultForm);
      }
    }
  }, [isOpen, initialData]);

  const loadOptions = async () => {
    try {
      const [catRes, brandRes, unitRes] = await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true),
        supabase.from('brands').select('*').eq('is_active', true),
        supabase.from('units').select('*').eq('is_active', true),
      ]);

      setCategories(catRes.data || []);
      setBrands(brandRes.data || []);
      setUnits(unitRes.data || []);
    } catch (error) {
      console.error('Error loading options:', error);
      toast.error('Failed to load form options');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      setForm(prev => ({ ...prev, [name]: Number(value) || 0 }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const addSpecification = () => {
    if (specKey.trim() && specValue.trim()) {
      setForm(prev => ({
        ...prev,
        specifications: { ...prev.specifications, [specKey.trim()]: specValue.trim() },
      }));
      setSpecKey('');
      setSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    setForm(prev => ({
      ...prev,
      specifications: Object.fromEntries(Object.entries(prev.specifications).filter(([k]) => k !== key)),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (form.selling_price <= 0) {
      toast.error('Selling price must be greater than 0');
      return;
    }
    if (form.cost_price < 0) {
      toast.error('Cost price cannot be negative');
      return;
    }

    setLoading(true);
    try {
      if (productId) {
        const { error } = await supabase
          .from('products')
          .update(form)
          .eq('id', productId);
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([form]);
        if (error) throw error;
        toast.success('Product created successfully');
      }
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productId ? 'Edit Product' : 'New Product'}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>
            {productId ? 'Update' : 'Create'} Product
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <Input
              label="Product Name *"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter product name"
            />
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter product description"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Category</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Brand</label>
                <select
                  name="brand_id"
                  value={form.brand_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* SKU & Identifiers */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Identifiers</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              name="sku"
              value={form.sku}
              onChange={handleChange}
              placeholder="Enter SKU"
            />
            <Input
              label="Barcode"
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              placeholder="Enter barcode"
            />
          </div>
        </div>

        {/* Pricing */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost Price *"
              name="cost_price"
              type="number"
              value={form.cost_price}
              onChange={handleChange}
              step="0.01"
            />
            <Input
              label="Selling Price *"
              name="selling_price"
              type="number"
              value={form.selling_price}
              onChange={handleChange}
              step="0.01"
            />
            <Input
              label="Min Selling Price"
              name="min_selling_price"
              type="number"
              value={form.min_selling_price}
              onChange={handleChange}
              step="0.01"
            />
            <Input
              label="Tax Rate (%)"
              name="tax_rate"
              type="number"
              value={form.tax_rate}
              onChange={handleChange}
              step="0.01"
            />
          </div>
        </div>

        {/* Stock Levels */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Stock Levels</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Reorder Level"
              name="reorder_level"
              type="number"
              value={form.reorder_level}
              onChange={handleChange}
              min="0"
            />
            <Input
              label="Max Stock Level"
              name="max_stock_level"
              type="number"
              value={form.max_stock_level}
              onChange={handleChange}
              min="0"
            />
          </div>
        </div>

        {/* Unit */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Unit</label>
          <select
            name="unit_id"
            value={form.unit_id}
            onChange={handleChange}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select Unit</option>
            {units.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Tags</h3>
          <div className="flex gap-2 mb-3">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag()}
              placeholder="Add a tag and press Enter"
              className="flex-1"
            />
            <Button onClick={addTag} variant="secondary" size="sm">Add</Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map(tag => (
                <div key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-primary-500 hover:text-primary-700">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Specifications */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Specifications</h3>
          <div className="flex gap-2 mb-3">
            <Input
              value={specKey}
              onChange={(e) => setSpecKey(e.target.value)}
              placeholder="Specification name"
              className="flex-1"
            />
            <Input
              value={specValue}
              onChange={(e) => setSpecValue(e.target.value)}
              placeholder="Specification value"
              className="flex-1"
            />
            <Button onClick={addSpecification} variant="secondary" size="sm">Add</Button>
          </div>
          {Object.entries(form.specifications).length > 0 && (
            <div className="space-y-2">
              {Object.entries(form.specifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{key}</p>
                    <p className="text-xs text-slate-500">{value}</p>
                  </div>
                  <button
                    onClick={() => removeSpecification(key)}
                    className="text-slate-400 hover:text-danger-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
              className="rounded border-slate-200"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_featured"
              checked={form.is_featured}
              onChange={handleChange}
              className="rounded border-slate-200"
            />
            <span className="text-sm font-medium text-slate-700">Featured</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
