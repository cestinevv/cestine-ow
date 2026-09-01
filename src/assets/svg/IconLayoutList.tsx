import type { SVGProps } from 'react';

// Figma Bsi3ju39aWCeytk5t2Ieuj — 剧场列表视图 — node 4970:23171 / 4970:23192

const LIST_BAR_PATH =
  'M12.2917 0.625H2.29167C1.37119 0.625 0.625 1.37119 0.625 2.29167V3.95833C0.625 4.87881 1.37119 5.625 2.29167 5.625H12.2917C13.2121 5.625 13.9583 4.87881 13.9583 3.95833V2.29167C13.9583 1.37119 13.2121 0.625 12.2917 0.625Z';

export default function IconLayoutList(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g transform="translate(2.708 3.333)">
        <path
          d={LIST_BAR_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
      <g transform="translate(2.708 11.667)">
        <path
          d={LIST_BAR_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
    </svg>
  );
}
