import type { SVGProps } from 'react';

export default function IconPlayerPause(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Player Pause</title>
      <rect
        x="7.25"
        y="5.75"
        width="3.5"
        height="12.5"
        rx="1"
        fill="currentColor"
      />
      <rect
        x="13.25"
        y="5.75"
        width="3.5"
        height="12.5"
        rx="1"
        fill="currentColor"
      />
    </svg>
  );
}
