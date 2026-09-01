import type { SVGProps } from 'react';

// Figma 2E3Hw4eqvHRr7c8gaqY82H — node 637:68148 (Point / 片酬与奖池)
export default function IconPointStar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7.5L13.545 10.955L17.314 11.345L14.657 13.795L15.416 17.53L12 15.75L8.584 17.53L9.343 13.795L6.686 11.345L10.455 10.955L12 7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
