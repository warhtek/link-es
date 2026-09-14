import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

export interface FieldLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
  requiredIndicator?: React.ReactNode;
}

export const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FieldLabelProps
>(
  (
    { className, required = false, requiredIndicator = '*', children, ...props },
    ref
  ) => (
    <Label
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="text-sm font-normal text-destructive">
            {requiredIndicator}
          </span>
          <span className="sr-only">(required)</span>
        </>
      ) : null}
    </Label>
  )
);
FieldLabel.displayName = 'FieldLabel';