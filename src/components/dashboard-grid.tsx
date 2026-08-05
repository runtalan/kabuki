'use client';

import { useState, useEffect, useRef } from 'react';
import { GripHorizontal, MoreVertical, Maximize2, Minimize2 } from 'lucide-react';

interface DashboardItem {
  id: string;
  type: 'stats' | 'chart' | 'accounts' | 'transactions' | 'calendar';
  title: string;
  children: React.ReactNode;
  span?: 'full' | 'half' | 'third';
}

interface DashboardGridProps {
  items: DashboardItem[];
}

const SPAN_STORAGE_KEY = 'dashboard-widget-spans';
const EDGE_SCROLL_ZONE = 120; // px from top/bottom of viewport that triggers auto-scroll
const EDGE_SCROLL_MAX_SPEED = 22; // px per animation frame at the very edge

export function DashboardGrid({ items: initialItems }: DashboardGridProps) {
  const [items, setItems] = useState<DashboardItem[]>(initialItems);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [spans, setSpans] = useState<Record<string, 'half' | 'full'>>({});
  const scrollSpeedRef = useRef(0);

  // Load saved layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashboard-layout');
    if (saved) {
      try {
        const savedOrder: string[] = JSON.parse(saved);
        const reordered = savedOrder
          .map((id: string) => items.find((item) => item.id === id))
          .filter((item): item is DashboardItem => item !== undefined);
        // Any item not in the saved order (e.g. newly added widgets) still
        // needs to render — append rather than silently drop it.
        const newItems = items.filter((item) => !savedOrder.includes(item.id));
        setItems([...reordered, ...newItems]);
      } catch (error) {
        console.error('Failed to load saved layout:', error);
      }
    }

    const savedSpans = localStorage.getItem(SPAN_STORAGE_KEY);
    if (savedSpans) {
      try {
        setSpans(JSON.parse(savedSpans));
      } catch (error) {
        console.error('Failed to load saved widget sizes:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll the page while dragging near the top/bottom edge — native
  // HTML5 drag doesn't do this on its own, which is what made dragging from
  // the bottom of a tall dashboard up to the top feel stuck.
  useEffect(() => {
    if (!draggedId) {
      scrollSpeedRef.current = 0;
      return;
    }

    const handlePointerMove = (e: DragEvent) => {
      const y = e.clientY;
      const vh = window.innerHeight;
      if (y < EDGE_SCROLL_ZONE) {
        scrollSpeedRef.current = -EDGE_SCROLL_MAX_SPEED * (1 - y / EDGE_SCROLL_ZONE);
      } else if (y > vh - EDGE_SCROLL_ZONE) {
        scrollSpeedRef.current = EDGE_SCROLL_MAX_SPEED * (1 - (vh - y) / EDGE_SCROLL_ZONE);
      } else {
        scrollSpeedRef.current = 0;
      }
    };

    let rafId: number;
    const tick = () => {
      if (scrollSpeedRef.current !== 0) {
        window.scrollBy(0, scrollSpeedRef.current);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    window.addEventListener('dragover', handlePointerMove);
    return () => {
      window.removeEventListener('dragover', handlePointerMove);
      cancelAnimationFrame(rafId);
    };
  }, [draggedId]);

  const saveLayout = (newItems: DashboardItem[]) => {
    const order = newItems.map((item) => item.id);
    localStorage.setItem('dashboard-layout', JSON.stringify(order));
  };

  const getSpan = (item: DashboardItem): 'half' | 'full' =>
    spans[item.id] ?? (item.span === 'half' ? 'half' : 'full');

  const toggleSpan = (item: DashboardItem) => {
    const next: 'half' | 'full' = getSpan(item) === 'half' ? 'full' : 'half';
    const nextSpans: Record<string, 'half' | 'full'> = { ...spans, [item.id]: next };
    setSpans(nextSpans);
    localStorage.setItem(SPAN_STORAGE_KEY, JSON.stringify(nextSpans));
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isEditMode) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires data to be set for drag to initiate at all.
    e.dataTransfer.setData('text/plain', id);
  };

  // Reorder live as the dragged card enters another card's space — this is
  // what makes two half-width widgets land side by side, and gives instant
  // visual feedback instead of only snapping into place on drop.
  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    if (!isEditMode || !draggedId || draggedId === targetId) return;
    e.preventDefault();
    setItems((prev) => {
      const draggedIndex = prev.findIndex((item) => item.id === draggedId);
      const targetIndex = prev.findIndex((item) => item.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return prev;
      }
      const next = [...prev];
      const [draggedItem] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, draggedItem);
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isEditMode) return;
    e.preventDefault();
    saveLayout(items);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    saveLayout(items);
    setDraggedId(null);
  };

  return (
    <>
      {/* Edit Mode Toggle */}
      <div className="mb-6 flex items-center justify-end gap-2">
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            isEditMode
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-foreground hover:bg-muted/80'
          }`}
        >
          {isEditMode ? '✓ Done Editing' : '✏️ Customize Layout'}
        </button>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {items.map((item) => {
          const span = getSpan(item);
          return (
            <div
              key={item.id}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragEnter={(e) => handleDragEnter(e, item.id)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`transition-all ${span === 'half' ? '' : 'md:col-span-2'} ${
                draggedId === item.id ? 'opacity-40 scale-[0.98]' : ''
              } ${isEditMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              <div className={`bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow ${
                isEditMode ? 'ring-2 ring-primary/20' : ''
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {isEditMode && (
                      <div className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-grab">
                        <GripHorizontal className="w-5 h-5" />
                      </div>
                    )}
                    <h2 className="text-lg font-semibold text-foreground">
                      {item.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleSpan(item)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                      title={span === 'half' ? 'Expand to full width' : 'Shrink to half width'}
                    >
                      {span === 'half' ? (
                        <Maximize2 className="w-4 h-4" />
                      ) : (
                        <Minimize2 className="w-4 h-4" />
                      )}
                    </button>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div>
                  {item.children}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
