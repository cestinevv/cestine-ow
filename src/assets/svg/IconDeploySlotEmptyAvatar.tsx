import type { SVGProps } from 'react';

import { cn } from '@/utils';

/**
 * Socrates DS「默认头像」— fileKey Vo8OVQeyLiPnhIm3IvYPIn / node 4043:3933
 * 底圆 + 人物 path；深浅色走 --game-deploy-slot-empty-avatar-*。
 */
export default function IconDeploySlotEmptyAvatar({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
      className={cn('overflow-hidden rounded-full', className)}
    >
      <rect
        width="44"
        height="44"
        rx="22"
        className="fill-game-deploy-slot-empty-avatar-bg"
      />
      <path
        d="M19.2383 23.4389H24.7667C29.9037 23.4389 34.082 27.5534 34.082 32.6119V33.1564C34.082 35.8005 29.9705 35.8005 24.7667 35.8005H19.2383C14.2392 35.8005 9.92195 35.8005 9.92195 33.1564V32.6119C9.92195 27.5544 14.1012 23.4389 19.2383 23.4389ZM22.2791 22.7389C18.2108 22.7389 14.9009 19.4786 14.9009 15.4692C14.9009 11.4598 18.2108 8.19853 22.2791 8.19853C26.3474 8.19853 29.6568 11.4612 29.6568 15.4692C29.6568 19.4771 26.347 22.7389 22.2791 22.7389Z"
        className="fill-game-deploy-slot-empty-avatar-overlay"
      />
    </svg>
  );
}
