import type { SVGProps } from 'react';

export default function IconArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Arrow right</title>
      <path
        d="M4.167 10h11.666m0 0L12.5 6.667M15.833 10 12.5 13.333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
