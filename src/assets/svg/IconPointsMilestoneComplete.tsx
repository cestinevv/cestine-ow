import type { SVGProps } from 'react';

import { cn } from '@/utils';

/** Figma 452:925 / circle-check — circle + check paths from design export. */
export default function IconPointsMilestoneComplete(
  props: SVGProps<SVGSVGElement>,
) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      aria-hidden
      className={cn(className)}
      {...rest}
    >
      <g
        className="text-foreground"
        transform="translate(4 4) scale(0.9230769230769231)"
      >
        <path
          d="M13 25C19.6274 25 25 19.6274 25 13C25 6.37258 19.6274 1 13 1C6.37258 1 1 6.37258 1 13C1 19.6274 6.37258 25 13 25Z"
          fill="currentColor"
        />
      </g>
      <g className="text-primary-foreground" transform="translate(11.67 12.33)">
        <path
          d="M1 3.66667L3.66667 6.33333L9 1"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
