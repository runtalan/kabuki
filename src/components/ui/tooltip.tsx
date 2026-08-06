'use client';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function Tooltip({ children, content }: { children: ReactNode; content: ReactNode }) {
  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger
        delay={150}
        render={<span className="inline-flex" />}
      >
        {children}
      </BaseTooltip.Trigger>
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner sideOffset={8}>
          <BaseTooltip.Popup
            className={cn(
              'z-50 max-w-xs rounded-lg border border-border bg-popover text-popover-foreground shadow-md p-3 text-sm'
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
