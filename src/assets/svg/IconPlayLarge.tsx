import type { SVGProps } from 'react';

// fileKey: 2E3Hw4eqvHRr7c8gaqY82H
// 浅色 521:72902 白三角；暗色 521:72677 红三角
export default function IconPlayLarge({
  triangleClassName,
  ...props
}: SVGProps<SVGSVGElement> & { triangleClassName?: string }) {
  return (
    <svg
      viewBox="0 0 54 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <rect
        x="0.5"
        y="0.5"
        width="53"
        height="53"
        rx="26.5"
        fill="var(--color-black)"
        fillOpacity="0.15"
      />
      <rect
        x="0.5"
        y="0.5"
        width="53"
        height="53"
        rx="26.5"
        stroke="currentColor"
      />
      <path
        className={triangleClassName}
        d="M38.9686 27.0536C39.6261 27.4505 39.6093 28.4096 38.9384 28.7833L20.4866 39.0609C19.8201 39.4321 19 38.9502 19 38.1872L19 16.7717C19 15.9932 19.8503 15.5133 20.5168 15.9156L38.9686 27.0536Z"
        fill="currentColor"
      />
    </svg>
  );
}
