import type { AgentStatus } from '@/types/ai-orbit';

const STATUS_STYLES: Record<AgentStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-[#00C805]/10 text-[#00C805]' },
  PAUSED: { label: 'Paused', className: 'bg-[#8E8E93]/15 text-[#8E8E93]' },
  ERROR: { label: 'Error', className: 'bg-[#FF5000]/10 text-[#FF5000]' },
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
