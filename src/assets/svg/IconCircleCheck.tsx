import type { SVGProps } from 'react';

import { cn } from '@/utils';

// Figma Bsi3ju39aWCeytk5t2Ieuj — circle-check 452:747 (outline) / 452:749 (filled)

type IconCircleCheckProps = SVGProps<SVGSVGElement> & {
  selected?: boolean;
  /** 描边圆 + 勾（1011 历史已签到等），与 `selected` 填充态互斥 */
  checked?: boolean;
};

export default function IconCircleCheck({
  selected = false,
  checked = false,
  className,
  ...props
}: IconCircleCheckProps) {
  if (selected) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
        aria-hidden
        className={cn('text-foreground', className)}
        {...props}
      >
        <path
          d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 12L10.5 15L16.5 9"
          className="text-background"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      aria-hidden
      className={cn('text-foreground', className)}
      {...props}
    >
      <path
        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {checked ? (
        <path
          d="M7.5 12L10.5 15L16.5 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}
