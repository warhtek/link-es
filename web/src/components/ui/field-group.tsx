import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, role = 'group', ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      className={cn('flex flex-col gap-6', className)}
      {...props}
    />
  )
);
FieldGroup.displayName = 'FieldGroup';