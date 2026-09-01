import type { SVGProps } from 'react';

/**
 * 默认头像占位图标（来自 Figma 2212:7502 / 2212:7503，矢量内联）。
 */
export function IconAvatarDefault(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.909091"
        y="0.909091"
        width="158.182"
        height="158.182"
        rx="79.0909"
        className="fill-muted"
      />
      <rect
        x="0.909091"
        y="0.909091"
        width="158.182"
        height="158.182"
        rx="79.0909"
        className="fill-none stroke-border"
        strokeWidth="1.81818"
      />
      <path
        d="M79.2137 82.5862C90.7678 82.5862 100.169 73.3258 100.169 61.9387C100.169 50.5522 90.7679 41.291 79.2138 41.291C67.6598 41.291 58.259 50.5554 58.259 61.9387C58.259 73.3224 67.6598 82.5862 79.2137 82.5862ZM87.8492 84.5745H72.1481C57.5575 84.5745 45.6899 96.2597 45.6899 110.627V112.173C45.6899 119.684 57.3675 119.684 72.1481 119.684H87.8492C102.048 119.684 114.31 119.684 114.31 112.173V110.627C114.31 96.2629 102.44 84.5745 87.8492 84.5745Z"
        className="fill-muted-foreground/35"
      />
    </svg>
  );
}
