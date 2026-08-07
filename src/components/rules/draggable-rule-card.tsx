'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ToggleLeft, Pencil, ChevronUp } from 'lucide-react';
import { CategoryIcon } from '@/components/category-icon';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface DraggableRuleCardProps {
  id: string;
  merchantName: string;
  matchType: 'exact' | 'contains' | 'startsWith';
  category?: Category;
  priority: number;
  enabled: boolean;
  totalRules: number;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
}

export function DraggableRuleCard({
  id,
  merchantName,
  matchType,
  category,
  priority,
  enabled,
  totalRules,
  onToggle,
  onEdit,
  onDelete,
}: DraggableRuleCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-lg p-4 flex items-center justify-between group transition-all ${
        isDragging ? 'shadow-lg ring-2 ring-primary/50' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          {...attributes}
          {...listeners}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
          type="button"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <button
          onClick={() => onToggle(id, enabled)}
          title={enabled ? 'Disable rule' : 'Enable rule'}
          className={`p-2 rounded transition-colors flex-shrink-0 ${
            enabled
              ? 'text-primary bg-primary/10'
              : 'text-muted-foreground bg-muted'
          }`}
        >
          <ToggleLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-sm font-medium text-muted-foreground">
              Priority {priority}
            </p>
          </div>
          <p className="font-medium text-foreground truncate">
            {matchType === 'contains' && `Contains "${merchantName}"`}
            {matchType === 'exact' && `Exact: "${merchantName}"`}
            {matchType === 'startsWith' && `Starts with "${merchantName}"`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
              style={{
                backgroundColor: category?.color + '20',
                color: category?.color || '#6b7280',
              }}
            >
              <CategoryIcon icon={category?.icon} className="w-3.5 h-3.5" />
              {category?.name || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
        <button
          onClick={onEdit}
          title="Edit rule"
          className="p-2 rounded hover:bg-muted transition-colors"
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => onDelete(id)}
          title="Delete rule"
          className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
}
