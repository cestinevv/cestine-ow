import type { SVGProps } from 'react';

import { cn } from '@/utils';

type IconPlayRatingStarProps = SVGProps<SVGSVGElement> & {
  filled?: boolean;
};

// Figma: Bsi3ju39aWCeytk5t2Ieuj node 2254:11796 / 2254:11800 (评分弹窗星标)
export default function IconPlayRatingStar({
  filled = false,
  className,
  ...props
}: IconPlayRatingStarProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn('text-[var(--play-rating-star)]', className)}
      {...props}
    >
      <title>{filled ? 'Star filled' : 'Star outline'}</title>
      <path
        d="M16.0017 23.6666L7.7724 27.9933L9.3444 18.8293L2.67773 12.34L11.8777 11.0066L15.9924 2.66931L20.1071 11.0066L29.3071 12.34L22.6404 18.8293L24.2124 27.9933L16.0017 23.6666Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
