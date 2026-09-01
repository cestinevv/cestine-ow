import type { SVGProps } from 'react';

/** Figma 31:4445 — message-circle 评论回复 */
export default function IconCommentMessage(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Reply</title>
      <path
        d="M2.25 15L3.225 12.075C1.482 9.49729 2.1555 6.17104 4.8 4.29454C7.4445 2.41879 11.2425 2.57254 13.6838 4.65454C16.125 6.73729 16.455 10.104 14.4555 12.5303C12.456 14.9565 8.74425 15.6915 5.775 14.25L2.25 15Z"
        stroke="currentColor"
        strokeWidth="1.125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
