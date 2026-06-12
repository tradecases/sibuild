import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUiStore } from '../../stores/uiStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, Column } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import type { Category } from '../../types';

const DEFAULT_CATEGORIES = [
  'Sanitary & Ceramics',
  'Bath Fittings',
  'Electrical & Cables',
  'Switches & Sockets',
  'Circuit Breakers & Protection',
  'Lighting',
  'Tiles & Flooring',
  'Pipes & Fittings',
  'Plywood & Boards',
  'Paints & Finishes',
  'Hardware & Tools',
  'Doors & Locks',
  'Kitchen Appliances',
  'AC & Cooling',
  'Generators & Power Solutions',
  'Solar Panels & Inverters',
  'CCTV & Security Systems',
  'Elevators & Lifts',
];

interface CategoryForm {
  name: string;
  description: string;
  parent_id: string;
  is_active: boolean;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<(Category & { product_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>({
    name: '',
    description: '',
    parent_id: '',
    is_active: true,
  });
  const toast = useUiStore.getState().toast;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Fetch product counts for each category
      const enrichedData = await Promise.all(
        (data || []).map(async (cat) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact' })
            .eq('category_id', cat.id);
          return { ...cat, product_count: count || 0 };
        })
      );

      setCategories(enrichedData);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeDefaults = async () => {
    try {
      const { data: existingCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact' });

      if (existingCount && existingCount > 0) {
        toast.warning('Categories already exist');
        return;
      }

      const newCategories = DEFAULT_CATEGORIES.map((name, index) => ({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `${name} products and materials`,
        parent_id: null,
        sort_order: index + 1,
        is_active: true,
        icon: null,
        image_url: null,
      }));

      const { error } = await supabase
        .from('categories')
        .insert(newCategories);

      if (error) throw error;
      toast.success('Default categories created');
      loadCategories();
    } catch (error) {
      console.error('Error initializing defaults:', error);
      toast.error('Failed to initialize default categories');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update(form)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([{
            ...form,
            slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            sort_order: categories.length + 1,
          }]);
        if (error) throw error;
        toast.success('Category created');
      }

      setFormOpen(false);
      setEditingId(null);
      setForm({ name: '', description: '', parent_id: '', is_active: true });
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      description: category.description || '',
      parent_id: category.parent_id || '',
      is_active: category.is_active,
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;
      toast.success('Category deleted');
      setDeleteConfirm({ open: false });
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const columns: Column<Category & { product_count?: number }>[] = [
    {
      key: 'name',
      label: 'Category Name',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
            📁
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            {row.description && (
              <p className="text-xs text-slate-500 mt-0.5">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'product_count',
      label: 'Products',
      render: (value) => (
        <p className="font-medium text-slate-900">{value || 0} products</p>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (value) => (
        <Badge variant={value ? 'success' : 'danger'} dot>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'right',
      render: (value, row) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => handleEdit(row as Category)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => setDeleteConfirm({ open: true, id: value as string })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500 mt-1">{categories.length} categories configured</p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <Button variant="secondary" onClick={handleInitializeDefaults}>
              Use Default Categories
            </Button>
          )}
          <Button leftIcon={<Plus size={16} />} onClick={() => {
            setEditingId(null);
            setForm({ name: '', description: '', parent_id: '', is_active: true });
            setFormOpen(true);
          }}>
            New Category
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <SkeletonTable rows={8} cols={4} />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Create your first category or use the default set"
            action={{
              label: 'New Category',
              onClick: () => {
                setEditingId(null);
                setForm({ name: '', description: '', parent_id: '', is_active: true });
                setFormOpen(true);
              },
              icon: <Plus size={16} />,
            }}
            size="lg"
          />
        ) : (
          <Table columns={columns} data={categories} />
        )}
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingId(null);
          setForm({ name: '', description: '', parent_id: '', is_active: true });
        }}
        title={editingId ? 'Edit Category' : 'New Category'}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
                setForm({ name: '', description: '', parent_id: '', is_active: true });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Update' : 'Create'} Category
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name *"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter category name"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter category description"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Parent Category</label>
            <select
              value={form.parent_id}
              onChange={(e) => setForm(prev => ({ ...prev, parent_id: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">No Parent</option>
              {categories.filter(c => c.id !== editingId).map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-slate-200"
            />
            <span className="text-sm font-medium text-slate-700">Active</span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false })}
        onConfirm={handleDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? Products in this category will not be affected."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
