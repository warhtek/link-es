import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  FieldDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-muted-foreground', className)}
    {...props}
  />
));
FieldDescription.displayName = 'FieldDescription';