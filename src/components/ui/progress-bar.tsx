'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  minimum: number;
  target: number;
  maximum: number;
  showLabels?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  minimum,
  target,
  maximum,
  showLabels = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / maximum) * 100, 100);
  const minimumPercent = (minimum / maximum) * 100;
  const targetPercent = (target / maximum) * 100;

  const getBarColor = () => {
    if (value >= maximum) return 'bg-blue-500';
    if (value >= target) return 'bg-green-500';
    if (value >= minimum) return 'bg-yellow-500';
    return 'bg-red-400';
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
        {/* Marcadores de mínimo e meta */}
        <div
          className="absolute top-0 bottom-0 w-px bg-yellow-500/50 z-10"
          style={{ left: `${minimumPercent}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-green-500/50 z-10"
          style={{ left: `${targetPercent}%` }}
        />
        
        {/* Barra de progresso */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            getBarColor()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {showLabels && (
        <div className="flex justify-between mt-1 text-xs text-zinc-500">
          <span>0</span>
          <span className="text-yellow-500">{minimum}</span>
          <span className="text-green-500">{target}</span>
          <span className="text-blue-500">{maximum}</span>
        </div>
      )}
    </div>
  );
}
