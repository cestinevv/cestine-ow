import type { SVGProps } from 'react';

/**
 * Figma Bsi3ju39aWCeytk5t2Ieuj — 浅色 6588:2177（白盘深勾）；深色 7039:38559（#111113 盘 + #edeef0 勾）
 * 盘色走 background，勾色走 foreground，随主题自动切换。
 */
export default function IconTopic1011Check(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>Check</title>
      <path
        d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
        className="fill-background stroke-background"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12L11 14L15 10"
        className="stroke-foreground"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
