import type { WheelPhase } from '@/types/ai-orbit';

const PHASE_STYLES: Record<WheelPhase, { label: string; className: string }> = {
  PUT: { label: 'Selling Put', className: 'bg-[#AF52DE]/10 text-[#AF52DE]' },
  CALL: { label: 'Selling Call', className: 'bg-[#FF9500]/10 text-[#FF9500]' },
};

export function PhaseBadge({ phase }: { phase: WheelPhase }) {
  const { label, className } = PHASE_STYLES[phase];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
