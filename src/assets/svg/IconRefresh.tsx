import type { SVGProps } from 'react';

// Figma Bsi3ju39aWCeytk5t2Ieuj — refresh — node 4660:18817 / instance 4660:19546
// 与 IconTrash 同为 24×24；内容区约 16px（与稿面 inset 16.67% 及删除图标横向跨度一致）
const REFRESH_CONTENT_SIZE = 16;
const REFRESH_SCALE = REFRESH_CONTENT_SIZE / 17.5002;
const REFRESH_OFFSET = (24 - 17.5002 * REFRESH_SCALE) / 2;

export default function IconRefresh(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <g
        transform={`translate(${REFRESH_OFFSET} ${REFRESH_OFFSET}) scale(${REFRESH_SCALE})`}
      >
        <path
          d="M16.7501 7.73506C16.5055 5.97528 15.6892 4.34472 14.4267 3.09455C13.1643 1.84439 11.5258 1.04398 9.76376 0.816611C8.00168 0.589246 6.21371 0.947541 4.67529 1.8363C3.13687 2.72507 1.93334 4.09499 1.25009 5.73506M0.750092 1.73506V5.73506H4.75009M0.750092 9.73511C0.994651 11.4949 1.81102 13.1254 3.07345 14.3756C4.33588 15.6258 5.97434 16.4262 7.73642 16.6536C9.49851 16.8809 11.2865 16.5226 12.8249 15.6339C14.3633 14.7451 15.5668 13.3752 16.2501 11.7351M16.7501 15.7351V11.7351H12.7501"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
