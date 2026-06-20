'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import {
  SELECT_CONTENT_CLASS,
  SELECT_ITEM_CLASS,
  SELECT_ITEM_INDICATOR_CLASS,
  SELECT_TRIGGER_CLASS,
  SELECT_VIEWPORT_CLASS
} from '@/components/shared/selectStyles';
import { cn } from '@/lib/utils/utils';

const Select = (props: any) => <SelectPrimitive.Root {...props} />;
Select.displayName = 'Select';

const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef((props: any, ref: any) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(SELECT_TRIGGER_CLASS, props.className)}
    {...props}
  >
    {props.children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className='h-4 w-4 shrink-0 text-gray-400' />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = (props: any) => (
  <SelectPrimitive.ScrollUpButton
    className={cn('flex cursor-default items-center justify-center py-1', props.className)}
    {...props}
  >
    <ChevronUp className='h-4 w-4' />
  </SelectPrimitive.ScrollUpButton>
);

const SelectScrollDownButton = (props: any) => (
  <SelectPrimitive.ScrollDownButton
    className={cn('flex cursor-default items-center justify-center py-1', props.className)}
    {...props}
  >
    <ChevronDown className='h-4 w-4' />
  </SelectPrimitive.ScrollDownButton>
);

const SelectContent = React.forwardRef((props: any, ref: any) => {
  const { className, children, position = 'popper', ...rest } = props;
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          SELECT_CONTENT_CLASS,
          'relative data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        position={position}
        {...rest}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(position === 'popper' ? SELECT_VIEWPORT_CLASS : 'p-1')}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef((props: any, ref: any) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', props.className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef((props: any, ref: any) => {
  const { className, children, ...rest } = props;
  return (
    <SelectPrimitive.Item ref={ref} className={cn(SELECT_ITEM_CLASS, className)} {...rest}>
      <span className={SELECT_ITEM_INDICATOR_CLASS}>
        <SelectPrimitive.ItemIndicator>
          <Check className='h-4 w-4' />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef((props: any, ref: any) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-muted', props.className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton
};
