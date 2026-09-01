import type { SVGProps } from 'react';

import { cn } from '@/utils';

/** fileKey 2E3Hw4eqvHRr7c8gaqY82H — 949:106143 筛选 Filter展开 */
export default function IconFilterChevronDown({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn('size-3', className)}
      {...props}
    >
      <title>Filter</title>
      <path
        d="M2.663 3h6.67c.369 0 .667.256.667.576 0 .149-.066.283-.172.385L6.53 7.771a.667.667 0 0 1-.931 0L2.132 3.92c-.219-.252-.16-.615.134-.804A.66.66 0 0 1 2.663 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
