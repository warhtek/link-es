import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from './input';

export interface SearchInputProps extends Omit<InputProps, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value: controlledValue, onChange, onClear, debounceMs = 0, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(controlledValue || '');

    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
      }
    }, [controlledValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextVal = e.target.value;
      setInternalValue(nextVal);
      if (onChange) {
        onChange(nextVal);
      }
    };

    const handleClear = () => {
      setInternalValue('');
      if (onChange) {
        onChange('');
      }
      if (onClear) {
        onClear();
      }
    };

    return (
      <div className="relative flex items-center w-full">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground shrink-0 pointer-events-none" />
        <Input
          ref={ref}
          type="search"
          value={internalValue}
          onChange={handleChange}
          className={cn('pl-9 pr-9', className)}
          {...props}
        />
        {internalValue.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';
