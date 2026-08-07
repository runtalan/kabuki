import type { ExecutionLog, ExecutionLogLevel } from '@/types/ai-orbit';

const LEVEL_STYLES: Record<ExecutionLogLevel, string> = {
  ACCEPTED: 'bg-sky-500/10 text-sky-600',
  FILL: 'bg-[#00C805]/10 text-[#00C805]',
  REJECTED: 'bg-[#FF5000]/10 text-[#FF5000]',
  CRON_POLL: 'bg-[#8E8E93]/15 text-[#8E8E93]',
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function FlightLogFeed({ logs }: { logs: ExecutionLog[] }) {
  return (
    <div className="rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[13px] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center gap-2">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5000]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF9500]/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#00C805]/70" />
        </div>
        <span className="text-neutral-500 text-xs ml-2">orbit-control // live feed</span>
      </div>
      <div className="max-h-[560px] overflow-y-auto p-4 space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 leading-relaxed">
            <span className="text-neutral-600 shrink-0 whitespace-nowrap">{formatTimestamp(log.timestamp)}</span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap ${LEVEL_STYLES[log.level]}`}>
              [{log.level}]
            </span>
            <span className="text-neutral-500 shrink-0">{log.ticker}</span>
            <span className="text-neutral-300 break-words">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
