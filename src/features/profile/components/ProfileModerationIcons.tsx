import type { SVGProps } from 'react';

export function ProfileBlockIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M8.17188 8.164C8.3615 8.78478 8.69899 9.35025 9.15535 9.81183C9.61171 10.2734 10.1733 10.6173 10.7919 10.814M14.2739 10.291C14.7555 9.95823 15.1582 9.52379 15.4536 9.01835C15.749 8.51292 15.9298 7.9488 15.9834 7.36584C16.0369 6.78287 15.9618 6.19526 15.7634 5.64448C15.565 5.09371 15.2481 4.5932 14.8352 4.17828C14.4222 3.76336 13.9231 3.44415 13.3733 3.24318C12.8235 3.04221 12.2362 2.96438 11.653 3.01518C11.0698 3.06599 10.5048 3.24419 9.99802 3.53721C9.49121 3.83023 9.0549 4.23092 8.71988 4.711L14.2739 10.291Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 21V19C6 17.9391 6.42143 16.9217 7.17157 16.1716C7.92172 15.4214 8.93913 15 10 15H14C14.3884 14.9997 14.7748 15.0559 15.147 15.167M17.832 17.848C17.9439 18.2218 18.0005 18.6099 18 19V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfileUnblockIcon(props: SVGProps<SVGSVGElement>) {
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
        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 21V19C6 17.9391 6.42143 16.9217 7.17157 16.1716C7.92172 15.4214 8.93913 15 10 15H14C15.0609 15 16.0783 15.4214 16.8284 16.1716C17.5786 16.9217 18 17.9391 18 19V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
