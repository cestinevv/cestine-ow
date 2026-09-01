import type { SVGProps } from 'react';

// Figma Bsi3ju39aWCeytk5t2Ieuj — 剧场宫格视图 — node 4970:23175 / 4970:23194

const GRID_CELL_PATH =
  'M4.79167 0.625H1.45833C0.998096 0.625 0.625 0.998096 0.625 1.45833V4.79167C0.625 5.2519 0.998096 5.625 1.45833 5.625H4.79167C5.2519 5.625 5.625 5.2519 5.625 4.79167V1.45833C5.625 0.998096 5.2519 0.625 4.79167 0.625Z';

export default function IconLayoutGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g transform="translate(3.333 3.333)">
        <path
          d={GRID_CELL_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
      <g transform="translate(11.667 3.333)">
        <path
          d={GRID_CELL_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
      <g transform="translate(3.333 11.667)">
        <path
          d={GRID_CELL_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
      <g transform="translate(11.667 11.667)">
        <path
          d={GRID_CELL_PATH}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.25"
        />
      </g>
    </svg>
  );
}
