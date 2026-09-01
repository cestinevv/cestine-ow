import type { SVGProps } from 'react';

/** 关注成功勾：稿面 9:695 仅有 +；勾态对齐同档 12px / 1.5 描边 */
export default function IconWatchFollowCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Followed</title>
      <path
        d="M2.5 6.25L5 8.5L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
