import type { SVGProps } from 'react';

import { cn } from '@/utils';

type IconChevronUpDownProps = SVGProps<SVGSVGElement> & {
  activeOrder?: 'asc' | 'desc';
};

/** Figma 4995:60574 — 价格排序双箭头（强/弱用透明度，继承父级文字色） */
export default function IconChevronUpDown({
  activeOrder = 'asc',
  className,
  ...props
}: IconChevronUpDownProps) {
  const isAscActive = activeOrder === 'asc';

  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn('size-4', className)}
      {...props}
    >
      <title>Sort</title>
      <path
        d="M4 6.5L8 2.5L12 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(isAscActive ? 'opacity-100' : 'opacity-40')}
      />
      <path
        d="M4 9.5L8 13.5L12 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(isAscActive ? 'opacity-40' : 'opacity-100')}
      />
    </svg>
  );
}
