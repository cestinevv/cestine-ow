import type { SVGProps } from 'react';

/** Figma chevron-up 24×24（stroke；颜色走 currentColor） */
export default function IconChevronUp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Chevron up</title>
      <path
        d="M7 14l5-5 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
