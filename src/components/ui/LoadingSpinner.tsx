import { cn } from '@/lib/utils';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-3',
  xl: 'h-16 w-16 border-4',
};

export default function LoadingSpinner({ size = 'md', className, color }: Props) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-current border-t-transparent',
        sizes[size],
        color ?? 'text-blue-600',
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
