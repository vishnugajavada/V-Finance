import { database } from '../db/database';
import type { Category } from '../domain/models';

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

export interface CategoryInput {
  name: string;
  parentId?: string;
  color: string;
  icon: string;
}

function validate(input: CategoryInput): void {
  if (!input.name.trim()) throw new Error('Category name is required');
  if (!/^#[0-9a-f]{6}$/i.test(input.color)) throw new Error('Category color must be a hex color');
  if (input.parentId && input.parentId.length === 0) throw new Error('Parent category is invalid');
}

export const categoryService = {
  async list(includeInactive = false): Promise<Category[]> {
    const categories = await database.categories.toArray();
    return includeInactive ? categories : categories.filter((category) => category.active);
  },

  async create(input: CategoryInput): Promise<Category> {
    validate(input);
    if (input.parentId) {
      const parent = await database.categories.get(input.parentId);
      if (!parent || !parent.active) throw new Error('Parent category not found');
    }
    const category: Category = { ...input, id: newId(), active: true };
    await database.categories.add(category);
    return category;
  },

  async update(id: string, changes: Partial<CategoryInput>): Promise<Category> {
    const existing = await database.categories.get(id);
    if (!existing) throw new Error('Category not found');
    const next = { ...existing, ...changes };
    validate(next);
    if (next.parentId === id) throw new Error('A category cannot be its own parent');
    if (next.parentId) {
      const parent = await database.categories.get(next.parentId);
      if (!parent || !parent.active) throw new Error('Parent category not found');
    }
    await database.categories.put(next);
    return next;
  },

  async deactivate(id: string): Promise<void> {
    const category = await database.categories.get(id);
    if (!category) throw new Error('Category not found');
    await database.categories.put({ ...category, active: false });
  },

  async remove(id: string): Promise<void> {
    const category = await database.categories.get(id);
    if (!category) throw new Error('Category not found');
    const transactionCount = await database.transactions.where('categoryId').equals(id).count();
    const childCount = await database.categories.where('parentId').equals(id).count();
    if (transactionCount > 0 || childCount > 0) throw new Error('Category is referenced; deactivate it or reassign its dependencies');
    await database.categories.delete(id);
  }
};
