import type { SVGProps } from 'react';

import { cn } from '@/utils';

/** Figma 452:943 / circle-check incomplete — ring path from design export. */
export default function IconPointsMilestonePending(
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
      className={cn('text-muted-foreground', className)}
      {...rest}
    >
      <g transform="translate(4 4) scale(0.9230769230769231)">
        <path
          d="M13 25C19.6274 25 25 19.6274 25 13C25 6.37258 19.6274 1 13 1C6.37258 1 1 6.37258 1 13C1 19.6274 6.37258 25 13 25Z"
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
