import * as React from 'react';
import { cn } from '@/lib/utils';
import { FieldDescription } from './field-description';
import { FieldError } from './field-error';
import { FieldLabel } from './field-label';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  required?: boolean;
  description?: React.ReactNode;
  error?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, label, required, description, error, children, ...props }, ref) => {
    const controlId = React.useId();
    const descriptionId = `${controlId}-description`;
    const errorId = `${controlId}-error`;
    const invalid = Boolean(error);

    const describedBy = [description ? descriptionId : '', error ? errorId : '']
      .filter(Boolean)
      .join(' ') || undefined;

    const controlWithAria = React.isValidElement(children)
      ? React.cloneElement(
          children as React.ReactElement<Record<string, unknown>>,
          {
            id: controlId,
            'aria-invalid': invalid,
            'aria-describedby': describedBy,
          }
        )
      : children;

    return (
      <div
        ref={ref}
        data-invalid={invalid || undefined}
        className={cn('flex flex-col gap-2', className)}
        {...props}
      >
        {label ? (
          <FieldLabel htmlFor={controlId} required={required}>
            {label}
          </FieldLabel>
        ) : null}
        {controlWithAria}
        {description ? (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        ) : null}
        {error ? <FieldError id={errorId}>{error}</FieldError> : null}
      </div>
    );
  }
);
Field.displayName = 'Field';