import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, role = 'alert', ...props }, ref) => (
    <p
      ref={ref}
      role={role}
      className={cn('text-xs font-medium text-destructive', className)}
      {...props}
    />
  )
);
FieldError.displayName = 'FieldError';