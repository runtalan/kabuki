'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, GripVertical } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';

function barColor(pct: number) {
  if (pct < 75) return 'bg-emerald-500';
  if (pct < 90) return 'bg-amber-500';
  return 'bg-red-500';
}

function money(value: number, decimals = 0) {
  return `$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

interface DraggableBudgetCardProps {
  id: string;
  name: string;
  color: string;
  icon: string;
  spent: number;
  budget: number;
  isEditing: boolean;
  onEdit: () => void;
  onClick: () => void;
}

export function DraggableBudgetCard({
  id,
  name,
  color,
  icon,
  spent,
  budget,
  isEditing,
  onEdit,
  onClick,
}: DraggableBudgetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const pct = budget > 0 ? (spent / budget) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditing && onClick()}
      className={`bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/40 transition-colors ${
        isDragging ? 'shadow-lg ring-2 ring-primary/50' : ''
      }`}
      title={`View ${name} transactions`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
            type="button"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color + '22' }}
          >
            <CategoryIcon icon={icon} color={color} className="w-4 h-4" />
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        </div>
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Edit budget"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-2">
        <span className="text-base font-bold text-foreground">{money(spent)}</span> of{' '}
        {money(budget)}
        {pct > 100 && (
          <span className="ml-2 text-xs font-semibold text-red-500">
            {money(spent - budget)} over
          </span>
        )}
      </p>
      <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor(pct)}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {pct > 100
          ? 'Over budget'
          : `${money(budget - spent)} remaining · ${Math.round(pct)}% used`}
      </p>
    </div>
  );
}
