import type { SVGProps } from 'react';

function IconPublishDrama(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <title>Publish drama</title>
      <path
        d="M11.9974 21.5362C17.2642 21.5362 21.5338 17.2666 21.5338 11.9998C21.5338 6.73298 17.2642 2.46338 11.9974 2.46338C6.73054 2.46338 2.46094 6.73298 2.46094 11.9998C2.46094 17.2666 6.73054 21.5362 11.9974 21.5362Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.7434 11.2787C16.2984 11.5991 16.2984 12.4002 15.7434 12.7207L10.7481 15.6047C10.1931 15.9251 9.49928 15.5246 9.49928 14.8837L9.49928 9.11564C9.49928 8.47475 10.1931 8.07419 10.7481 8.39464L15.7434 11.2787Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function IconPublishVideo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <title>Publish video</title>
      <path
        d="M10 9V15L15 12L10 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="2"
        y="4.5"
        width="20"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPublishActor(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <title>Publish actor IP</title>
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2.66667"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.0849 12.3463H12.9154C14.6165 12.3463 16 13.7087 16 15.3837V15.564C16 16.4395 14.6386 16.4395 12.9154 16.4395H11.0849C9.42954 16.4395 8 16.4395 8 15.564V15.3837C8 13.709 9.38386 12.3463 11.0849 12.3463ZM12.0918 12.1145C10.7446 12.1145 9.64867 11.0349 9.64867 9.7073C9.64867 8.37968 10.7446 7.2998 12.0918 7.2998C13.4389 7.2998 14.5347 8.38017 14.5347 9.7073C14.5347 11.0344 13.4387 12.1145 12.0918 12.1145Z"
        stroke="currentColor"
        strokeWidth="1.41176"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const SITE_PUBLISH_ITEMS = [
  {
    labelKey: '发布短剧',
    mobileLabelKey: '发布短剧',
    to: '/create',
    Icon: IconPublishDrama,
    requireLogin: true,
  },
  {
    labelKey: '发布视频',
    mobileLabelKey: '发布视频',
    to: '/create-short-video',
    Icon: IconPublishVideo,
    requireLogin: true,
  },
  {
    labelKey: '发行IP',
    mobileLabelKey: '发行IP',
    to: '/narrator/create-actor',
    Icon: IconPublishActor,
    requireLogin: true,
  },
] as const;
