import type { ReactNode } from 'react';
import type { Category } from '../types';

const CATEGORY_STYLE: Record<Category, string> = {
  Safety: 'bg-red-50 text-red-700 ring-red-200',
  Policy: 'bg-blue-50 text-blue-700 ring-blue-200',
  General: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function Chip({ className = '', children }: { className?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>{children}</span>;
}

export function CategoryChip({ category }: { category: Category }) {
  return <Chip className={CATEGORY_STYLE[category]}>{category}</Chip>;
}
