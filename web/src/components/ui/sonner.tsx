import * as React from 'react';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl font-sans',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-medium',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success: 'group-[.toast]:border-emerald-500/20 group-[.toast]:bg-emerald-500/10 group-[.toast]:text-emerald-700 dark:group-[.toast]:text-emerald-400',
          error: 'group-[.toast]:border-destructive/20 group-[.toast]:bg-destructive/10 group-[.toast]:text-destructive dark:group-[.toast]:text-red-400',
          warning: 'group-[.toast]:border-amber-500/20 group-[.toast]:bg-amber-500/10 group-[.toast]:text-amber-700 dark:group-[.toast]:text-amber-400',
          info: 'group-[.toast]:border-blue-500/20 group-[.toast]:bg-blue-500/10 group-[.toast]:text-blue-700 dark:group-[.toast]:text-blue-400',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
