import type { SVGProps } from 'react';

/** Figma 665:66658 — copy icon 24×24 (stroke; color via `currentColor`) */
export default function IconCopy(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Copy"
      {...props}
    >
      <rect
        x="8.75"
        y="8.75"
        width="12.5"
        height="12.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16.25 8.75V5.5C16.25 4.90326 16.0129 4.33097 15.591 3.90901C15.169 3.48705 14.5967 3.25 14 3.25H5.5C4.90326 3.25 4.33097 3.48705 3.90901 3.90901C3.48705 4.33097 3.25 4.90326 3.25 5.5V14C3.25 14.5967 3.48705 15.169 3.90901 15.591C4.33097 16.0129 4.90326 16.25 5.5 16.25H8.75"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
