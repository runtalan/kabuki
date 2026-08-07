'use client';

export function WatchlistSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
        />
      ))}
    </div>
  );
}

export function HeatMapSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />

      <div className="space-y-2">
        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`call-${i}`}
              className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={`put-${i}`}
              className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderFormSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
