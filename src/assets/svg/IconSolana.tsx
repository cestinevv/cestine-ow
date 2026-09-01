import type { SVGProps } from 'react';

// Figma Bsi3ju39aWCeytk5t2Ieuj — 下拉 Solana 链标 — node 7689:111989
export default function IconSolana(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Solana"
      {...props}
    >
      <path
        d="M10 0C15.522 0 20 4.478 20 10C20 15.522 15.522 20 10 20C4.478 20 0 15.522 0 10C0 4.478 4.478 0 10 0Z"
        fill="#000000"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.62442 9.04752H13.8784C13.9944 9.04752 14.1044 9.09352 14.1844 9.17552L15.6484 10.6495C15.9184 10.9215 15.7264 11.3855 15.3424 11.3855H6.08842C5.97242 11.3855 5.86242 11.3395 5.78242 11.2575L4.31842 9.78352C4.04642 9.51152 4.24042 9.04752 4.62442 9.04752ZM4.31842 7.09352L5.78242 5.61952C5.86442 5.53752 5.97442 5.49152 6.08842 5.49152H15.3404C15.7244 5.49152 15.9184 5.95552 15.6464 6.22752L14.1844 7.70152C14.1024 7.78352 13.9924 7.82952 13.8784 7.82952H4.62442C4.24042 7.82952 4.04642 7.36552 4.31842 7.09352ZM15.6464 13.3395L14.1824 14.8135C14.1004 14.8955 13.9904 14.9415 13.8764 14.9415H4.62442C4.24042 14.9415 4.04642 14.4775 4.31842 14.2055L5.78242 12.7315C5.86442 12.6495 5.97442 12.6035 6.08842 12.6035H15.3404C15.7244 12.6035 15.9184 13.0675 15.6464 13.3395Z"
        fill="url(#icon-solana-logo-gradient)"
      />
      <defs>
        <linearGradient
          id="icon-solana-logo-gradient"
          x1="4.85082"
          y1="15.3481"
          x2="15.114"
          y2="5.08491"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#CB4EE8" />
          <stop offset="1" stopColor="#10F4B1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
