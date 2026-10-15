'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/utils';
import {
  subscribeRegistrations,
  getPendingRegistrations,
  getServerPendingRegistrations
} from '@/lib/store/registrationStore';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        unstyled: '',
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        'outline-solid':
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, disabled, ...props }, ref) => {
    const inFlight = React.useRef(false);
    const [running, setRunning] = React.useState(false);
    const registrations = React.useSyncExternalStore(
      subscribeRegistrations,
      getPendingRegistrations,
      getServerPendingRegistrations
    );
    const blocked =
      disabled ||
      running ||
      (!asChild && props.type !== 'button' && props.type !== 'reset' && registrations > 0);
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = event => {
      if (blocked || inFlight.current) {
        event.preventDefault();
        return;
      }
      inFlight.current = true;
      try {
        const result = onClick?.(event) as unknown;
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          setRunning(true);
          void Promise.resolve(result).then(
            () => {
              inFlight.current = false;
              setRunning(false);
            },
            error => {
              inFlight.current = false;
              setRunning(false);
              globalThis.reportError?.(error);
            }
          );
        } else {
          inFlight.current = false;
        }
      } catch (error) {
        inFlight.current = false;
        throw error;
      }
    };
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        data-ui-button=''
        disabled={blocked}
        aria-busy={running || undefined}
        onClick={handleClick}
        className={
          variant === 'unstyled'
            ? cn(
                'cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                className
              )
            : cn(buttonVariants({ variant, size, className }))
        }
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
