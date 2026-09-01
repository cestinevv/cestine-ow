import type { SVGProps } from 'react';

export default function IconCreatorsReasonMovie(
  props: SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="3.75"
        y="5.25"
        width="16.5"
        height="13.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 5.25V18.75M16 5.25V18.75M3.75 9.75H20.25M3.75 14.25H20.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
