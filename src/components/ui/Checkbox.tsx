import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, ...props }, ref) => (
    <label className={cn('relative inline-flex h-4 w-4 cursor-pointer items-center justify-center', className)}>
      <input ref={ref} type="checkbox" checked={checked} className="peer sr-only" {...props} />
      <span
        className={cn(
          'h-4 w-4 rounded border border-primary shadow transition-colors',
          'peer-checked:bg-primary peer-checked:text-primary-foreground',
          'peer-focus-visible:outline-none peer-focus-visible:ring-1 peer-focus-visible:ring-ring'
        )}
      />
      {checked && <Check className="pointer-events-none absolute h-3 w-3 text-primary-foreground" strokeWidth={3} />}
    </label>
  )
);
Checkbox.displayName = 'Checkbox';
