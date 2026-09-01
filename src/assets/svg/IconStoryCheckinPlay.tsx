import { type SVGProps, useId } from 'react';

// Figma Bsi3ju39aWCeytk5t2Ieuj — Subtract — node 7036:59543
export default function IconStoryCheckinPlay(props: SVGProps<SVGSVGElement>) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...props}
    >
      <title>StoryCheckinPlay</title>
      <path
        d="M12 0C18.627 0.000527743 24 5.37291 24 12C24 18.6271 18.627 23.9995 12 24C5.37258 24 4.75044e-06 18.6274 0 12C7.73114e-06 5.37259 5.37259 7.73131e-06 12 0ZM12 1.49023C6.19567 1.49024 1.49024 6.19567 1.49023 12C1.49024 17.8043 6.19567 22.5098 12 22.5098C17.8039 22.5092 22.5098 17.804 22.5098 12C22.5098 6.19599 17.8039 1.49076 12 1.49023ZM19.4346 11.999L8.26758 18.4463V5.55176L19.4346 11.999ZM11.9834 11.4873C11.7092 11.4873 11.4866 11.7093 11.4863 11.9834C11.4863 12.2578 11.709 12.4805 11.9834 12.4805C12.2578 12.4805 12.4805 12.2578 12.4805 11.9834C12.4802 11.7092 12.2576 11.4873 11.9834 11.4873Z"
        fill={`url(#${gradientId})`}
      />
      <defs>
        <linearGradient
          id={gradientId}
          x1="-7.56538e-06"
          y1="24"
          x2="24"
          y2="-3.18841e-05"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#05DF72" />
          <stop offset="0.5" stopColor="#00BBA7" />
          <stop offset="1" stopColor="#00B8DB" />
        </linearGradient>
      </defs>
    </svg>
  );
}
