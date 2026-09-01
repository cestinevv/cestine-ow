export function isRequestedMediaSourceReady(args: {
  requestedUrl?: string;
  currentSourceUrl?: string;
  canPlay: boolean;
}): boolean {
  const requestedUrl = args.requestedUrl?.trim();
  const currentSourceUrl = args.currentSourceUrl?.trim();

  return Boolean(
    args.canPlay &&
      requestedUrl &&
      currentSourceUrl &&
      requestedUrl === currentSourceUrl,
  );
}
