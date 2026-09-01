import type { SVGProps } from 'react';

/** 24×24 左向 chevron（描边）；颜色由外层 `className` 的 `text-*` / `currentColor` 控制，与 IconChevronDown 线宽一致 */
export default function IconChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Chevron left</title>
      <path
        d="M15 6l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
