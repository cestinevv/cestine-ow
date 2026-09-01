import type { SVGProps } from 'react';

import { cn } from '@/utils';

type IconFilterSortProps = SVGProps<SVGSVGElement> & {
  activeOrder?: 'asc' | 'desc';
};

/** fileKey 2E3Hw4eqvHRr7c8gaqY82H — 949:106143 筛选 Filter收起 */
export default function IconFilterSort({
  activeOrder = 'asc',
  className,
  ...props
}: IconFilterSortProps) {
  const isAscActive = activeOrder === 'asc';

  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn('size-3', className)}
      {...props}
    >
      <title>Sort</title>
      <path
        d="M9.337 5H2.668c-.37 0-.668-.256-.668-.576 0-.149.066-.283.172-.385L5.47.229a.667.667 0 0 1 .931 0L9.868 4.08c.219.252.16.615-.134.804A.66.66 0 0 1 9.337 5Z"
        fill="currentColor"
        className={cn(isAscActive ? 'opacity-100' : 'opacity-[0.46]')}
      />
      <path
        d="M2.663 7h6.67c.369 0 .667.256.667.576 0 .149-.066.283-.172.385L6.53 11.771a.667.667 0 0 1-.931 0L2.132 7.92c-.219-.252-.16-.615.134-.804A.66.66 0 0 1 2.663 7Z"
        fill="currentColor"
        className={cn(isAscActive ? 'opacity-[0.46]' : 'opacity-100')}
      />
    </svg>
  );
}
