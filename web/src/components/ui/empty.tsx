import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const emptyVariants = cva(
  'flex flex-col items-center justify-center text-center p-8 rounded-2xl',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        dashed: 'border-2 border-dashed border-border/80 bg-muted/20',
        card: 'border border-border bg-card shadow-xs',
      },
      size: {
        sm: 'p-4 gap-2',
        default: 'p-8 gap-3',
        lg: 'p-12 gap-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface EmptyProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyVariants> {}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, variant, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(emptyVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Empty.displayName = 'Empty';

const EmptyMedia = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-xs mb-1 [&>svg]:h-6 [&>svg]:w-6',
      className
    )}
    {...props}
  />
));
EmptyMedia.displayName = 'EmptyMedia';

const EmptyTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-base font-semibold tracking-tight text-foreground', className)}
    {...props}
  />
));
EmptyTitle.displayName = 'EmptyTitle';

const EmptyDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground max-w-sm', className)}
    {...props}
  />
));
EmptyDescription.displayName = 'EmptyDescription';

const EmptyActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-2 mt-2', className)}
    {...props}
  />
));
EmptyActions.displayName = 'EmptyActions';

export interface EmptyStateProps extends Omit<EmptyProps, 'title'> {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, children, ...props }, ref) => {
    return (
      <Empty ref={ref} {...props}>
        {icon && <EmptyMedia>{icon}</EmptyMedia>}
        {title && <EmptyTitle>{title}</EmptyTitle>}
        {description && <EmptyDescription>{description}</EmptyDescription>}
        {action && <EmptyActions>{action}</EmptyActions>}
        {children}
      </Empty>
    );
  }
);
EmptyState.displayName = 'EmptyState';

export {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyActions,
  EmptyState,
  emptyVariants,
};
