import type { SVGProps } from 'react';

/** Figma 80:81000 — 评论发送箭头（圆底由 Button 提供） */
export default function IconCommentSendArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Send</title>
      <path
        d="M12 16.6666V7.33325"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.00024 11.1997L12.0001 7.33325L16.0002 11.1997"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
