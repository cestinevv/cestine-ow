import type { SVGProps } from 'react';

/** Figma 1003:132572 — 移动端底部导航发布按钮 */
export default function IconBottomNavPublish(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <title>Publish</title>
      <rect
        x="1.909"
        y="1.909"
        width="38.182"
        height="38.182"
        rx="10"
        fill="currentColor"
      />
      <path
        d="M21.001 16.001V26.001"
        className="text-white"
        stroke="currentColor"
        strokeWidth="2.08333"
        strokeLinecap="round"
      />
      <path
        d="M16.008 21H26.008"
        className="text-white"
        stroke="currentColor"
        strokeWidth="2.08333"
        strokeLinecap="round"
      />
    </svg>
  );
}
