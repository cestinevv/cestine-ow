import type { SVGProps } from 'react';

/**
 * Help circle icon — Figma 1583:5704 (积分规则 pill).
 * Geometry composed from the three native vector exports of the icon
 * (outer circle / question mark stem / dot) so it matches the稿面 1:1.
 * Stroke uses `currentColor` so caller can drive color via Tailwind text-*.
 */
export default function IconHelpCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth="1.125"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <title>Help</title>
      <g transform="translate(1.6875 1.6875)">
        <path d="M7.3125 14.0625C11.0404 14.0625 14.0625 11.0404 14.0625 7.3125C14.0625 3.58458 11.0404 0.5625 7.3125 0.5625C3.58458 0.5625 0.5625 3.58458 0.5625 7.3125C0.5625 11.0404 3.58458 14.0625 7.3125 14.0625Z" />
      </g>
      <g transform="translate(6.93576 4.66431)">
        <path d="M2.06253 5.45886C2.04872 5.21539 2.1144 4.97403 2.24967 4.77112C2.38494 4.56822 2.58248 4.41476 2.81253 4.33386C3.09444 4.22606 3.34747 4.05429 3.55171 3.83208C3.75595 3.60987 3.90582 3.34328 3.98952 3.05331C4.07323 2.76333 4.08848 2.45788 4.03408 2.16101C3.97968 1.86414 3.85711 1.58395 3.67602 1.3425C3.49493 1.10105 3.26026 0.904928 2.9905 0.769578C2.72074 0.634228 2.42324 0.563345 2.12142 0.562508C1.81961 0.56167 1.52172 0.630903 1.25121 0.764754C0.980704 0.898605 0.744956 1.09342 0.562531 1.33386" />
      </g>
      <g transform="translate(8.4375 12.18375)">
        <path d="M0.5625 0.5625V0.57" />
      </g>
    </svg>
  );
}
