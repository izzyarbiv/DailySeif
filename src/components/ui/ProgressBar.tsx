import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'gold' | 'purple';
  showLabel?: boolean;
  className?: string;
}

const sizeMap = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };
const colorMap = {
  blue: 'bg-blue-600',
  green: 'bg-green-500',
  gold: 'bg-amber-500',
  purple: 'bg-purple-600',
};

export default function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showLabel = false,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{Math.round(pct)}% complete</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeMap[size])}>
        <div
          className={cn('rounded-full transition-all duration-500 ease-out', colorMap[color], sizeMap[size])}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
