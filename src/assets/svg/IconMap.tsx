import type { SVGProps } from 'react';

export default function IconMap(props: SVGProps<SVGSVGElement>) {
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
      <path
        d="M3.69231 6.78571L9.23077 4L14.7692 6.78571L20.3077 4V16.0714L14.7692 18.8571L9.23077 16.0714L3.69231 18.8571V6.78571Z"
        stroke="currentColor"
        strokeWidth="1.38462"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.23071 4V16.0714"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.7693 6.78571V18.8571"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
