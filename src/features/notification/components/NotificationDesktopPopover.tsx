import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationCenterController } from '@/features/notification/components/NotificationCenterController';

type NotificationDesktopPopoverProps = {
  isLogin: boolean;
  interactionMode?: 'hover' | 'click';
  renderTrigger: (state: { hasUnread: boolean }) => ReactElement;
};

const CENTERED_POPOVER_COLLISION = {
  side: 'none',
  align: 'none',
  fallbackAxisSide: 'none',
} as const;

function getViewportCenterAnchor() {
  return {
    getBoundingClientRect: () =>
      new DOMRect(window.innerWidth / 2, window.innerHeight / 2, 0, 0),
  };
}

function getCenteredPopoverOffset({
  positioner,
}: {
  positioner: { height: number };
}) {
  return -positioner.height / 2;
}

export function NotificationDesktopPopover({
  isLogin,
  interactionMode = 'hover',
  renderTrigger,
}: NotificationDesktopPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !panelElement) {
      return;
    }

    const handlePanelWheel = (event: WheelEvent) => {
      const target = event.target;
      const viewport =
        target instanceof Element
          ? target.closest('[data-slot="scroll-area-viewport"]')
          : null;

      if (viewport instanceof HTMLElement) {
        const canScrollUp = viewport.scrollTop > 0;
        const canScrollDown =
          viewport.scrollTop + viewport.clientHeight <
          viewport.scrollHeight - 1;
        if (
          (event.deltaY < 0 && canScrollUp) ||
          (event.deltaY > 0 && canScrollDown)
        ) {
          event.stopPropagation();
          return;
        }
      }

      event.preventDefault();
      event.stopPropagation();
    };

    panelElement.addEventListener('wheel', handlePanelWheel, {
      passive: false,
    });
    return () => {
      panelElement.removeEventListener('wheel', handlePanelWheel);
    };
  }, [open, panelElement]);

  const handleOpen = (onOpen: () => void) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    onOpen();
    setOpen(true);
  };

  const handleClose = (onClose: () => void) => {
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      onClose();
    }, 120);
  };

  const handleOpenChange = (
    nextOpen: boolean,
    onOpen: () => void,
    onClose: () => void,
  ) => {
    if (nextOpen) {
      onOpen();
    } else {
      onClose();
    }
    setOpen(nextOpen);
  };

  const handleRequestClose = () => {
    setOpen(false);
  };

  if (!isLogin) {
    return null;
  }

  return (
    <NotificationCenterController
      active={open}
      isLogin={isLogin}
      onRequestClose={handleRequestClose}
    >
      {({ hasUnread, onClose, onOpen, panel }) => (
        <Popover
          open={open}
          onOpenChange={(nextOpen) =>
            handleOpenChange(nextOpen, onOpen, onClose)
          }
        >
          <PopoverTrigger
            render={renderTrigger({ hasUnread })}
            onMouseEnter={
              interactionMode === 'hover' ? () => handleOpen(onOpen) : undefined
            }
            onMouseLeave={
              interactionMode === 'hover'
                ? () => handleClose(onClose)
                : undefined
            }
          />

          <PopoverContent
            ref={setPanelElement}
            align={interactionMode === 'click' ? 'center' : 'end'}
            anchor={
              interactionMode === 'click' ? getViewportCenterAnchor : undefined
            }
            collisionAvoidance={
              interactionMode === 'click'
                ? CENTERED_POPOVER_COLLISION
                : undefined
            }
            positionMethod={interactionMode === 'click' ? 'fixed' : undefined}
            sideOffset={
              interactionMode === 'click' ? getCenteredPopoverOffset : 8
            }
            className="h-[calc(100dvh-88px)] max-h-[680px] w-[calc(100vw-32px)] max-w-[400px] overflow-hidden rounded-[12px] border-[0.5px] p-0 shadow-[3px_4px_6px_rgba(0,0,0,0.08)] md:h-[680px] md:w-[400px]"
            aria-label={t('通知')}
            onMouseEnter={
              interactionMode === 'hover' ? () => handleOpen(onOpen) : undefined
            }
            onMouseLeave={
              interactionMode === 'hover'
                ? () => handleClose(onClose)
                : undefined
            }
          >
            {panel}
          </PopoverContent>
        </Popover>
      )}
    </NotificationCenterController>
  );
}
