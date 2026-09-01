import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/utils/index';

const buttonVariants = cva(
  [
    // Layout & Positioning
    'group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap',
    // Box Model & Visual
    'rounded-lg border border-transparent bg-clip-padding',
    // Typography
    'text-sm font-medium',
    // Interactions & States
    'transition-all outline-none select-none cursor-pointer',
    'focus-visible:ring-0 focus-visible:outline-none',
    'active:not-aria-[haspopup]:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-100',
    'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
    // Child Elements
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // Figma 7390:98041 — 填充主按钮禁用：unavailable 底 + on-surface 字
        // hover 用 opacity，避免 className 覆盖成 bg-foreground 后仍被 hover:bg-primary/80 拉回品牌红
        default: [
          'bg-primary text-primary-foreground hover:opacity-90',
          'disabled:border-transparent disabled:bg-button-disabled-surface',
          'disabled:text-button-disabled-on-surface',
          'disabled:hover:bg-button-disabled-surface',
        ],
        outline: [
          'border-border bg-background',
          'hover:bg-muted hover:text-foreground',
          'aria-expanded:bg-muted aria-expanded:text-foreground',
          'disabled:text-button-disabled-foreground',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
          'aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
          'disabled:border-transparent disabled:bg-button-disabled-surface',
          'disabled:text-button-disabled-on-surface',
          'disabled:hover:bg-button-disabled-surface',
        ],
        ghost: [
          'hover:text-foreground',
          'aria-expanded:text-foreground',
          'disabled:text-button-disabled-foreground',
        ],
        destructive: [
          'bg-destructive/10 text-destructive',
          'hover:bg-destructive/20',
          'disabled:text-button-disabled-foreground',
        ],
        link: [
          'text-primary underline-offset-4 hover:underline',
          'disabled:text-button-disabled-foreground',
        ],
      },
      size: {
        default: [
          'h-10 gap-1.5 px-2.5',
          'has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        ],
        xs: [
          'h-6 gap-1 px-2 text-xs',
          'rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg',
          'has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
          "[&_svg:not([class*='size-'])]:size-3",
        ],
        sm: [
          'h-7 gap-1 px-2.5 text-[0.8rem]',
          'rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
          'has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
          "[&_svg:not([class*='size-'])]:size-3.5",
        ],
        lg: [
          'h-11 gap-1.5 px-2.5',
          'has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        ],
        icon: 'size-8',
        'icon-xs': [
          'size-6',
          'rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg',
          "[&_svg:not([class*='size-'])]:size-3",
        ],
        'icon-sm': [
          'size-7',
          'rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        ],
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
