# Playback Session Cache Design

## Goal

Preserve a user's place when they leave playback without keeping video players
mounted in the background.

- The recommendation feed restores the active item and playback position while
  the current browser tab remains open.
- Every drama stores its own last episode and playback position in the current
  browser.
- Restored playback is paused and shows the play button unless an existing
  explicit autoplay entry requests playback.
- Existing mobile swipe, continuous play, fullscreen, aspect-ratio letterbox,
  and engagement overlays keep their current behavior.

## Scope

This change is local to the browser. It does not add backend watch-history APIs,
cross-device synchronization, or a keep-alive router layer.

The player instance, HLS instance, and media element are destroyed when their
route unmounts. Only enough state to reconstruct the viewing position is kept.

## Recommendation Feed Cache

### Query cache

The recommendation infinite query remains the source of truth for feed API
responses. It keeps at most 10 pages of 10 items, for a maximum of 100 feed
items in memory.

The feed query must set these behaviors explicitly rather than inherit global
`QueryClient` defaults:

```ts
{
  maxPages: 10,
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: Number.POSITIVE_INFINITY,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
}
```

These options guarantee that leaving and returning to the recommendation route
in the same browser tab does not refetch merely because the view remounted. A
full browser refresh creates a new in-memory query cache and requests the first
page again. No persisted React Query cache is introduced for this feed.

- New pages are appended using the cursor from the last cached page.
- When an eleventh page is added, the oldest page is evicted.
- The active item is identified by `episodeId`; array index is derived after
  every page update or eviction.
- Prefetching remains one page ahead, so the active item cannot be the page
  evicted during normal forward navigation.
- Same-tab route return uses the existing query pages and does not automatically
  refetch on remount.
- A browser refresh never reuses the old recommendation query cache and starts
  a new request from page one.
- Login state, user changes, language changes, explicit refresh, inaccessible
  items, and invalid media data are the events allowed to invalidate or rebuild
  the feed cache.

The complete feed response is not persisted to web storage. This avoids quota
growth and stale signed media URLs.

### Playback session

`sessionStorage` stores only the recommendation playback snapshot:

```ts
type RecommendPlaybackSession = {
  activeKey: {
    contentType: PlayFeedContentType;
    dramaId?: string;
    episodeId: string;
  };
  currentTime: number;
  updatedAt: number;
};
```

The recommendation snapshot applies only to same-tab route return without a
browser refresh. Before the feed performs its first restore attempt, a refresh
guard checks the current navigation entry. When it is a browser refresh, the
guard ignores and clears the saved recommendation snapshot before the new page
one response can be matched. A `pageshow` event restored from bfcache is not a
refresh and keeps the same-tab snapshot behavior.

For a non-refresh route return, the feed searches the current cached pages by
the complete saved identity: `contentType`, `dramaId` when present, and
`episodeId`. If found, the player seeks to `currentTime` after metadata is ready
and remains paused. If the query cache no longer exists, the feed requests page
one. If the identity is absent from a valid cache, the feed clears the stale
snapshot and starts at the first valid item. An old array index must never be
applied directly to a new or changed feed.

## Drama Playback History

`localStorage` stores a versioned map keyed by `dramaId`:

```ts
type DramaPlaybackEntry = {
  episodeNo: number;
  currentTime: number;
  duration?: number;
  updatedAt: number;
};

type DramaPlaybackHistory = {
  version: 2;
  dramas: Record<string, DramaPlaybackEntry>;
};
```

Each drama restores independently. The store keeps the 50 most recently
updated dramas and removes older entries. This is a last-position record
aggregated by drama, not a complete history for every episode. It answers only
which episode of a drama was last active and where that episode stopped; it
does not override an explicit route target.

On the first read of the new history module, it checks the existing
`play-watch-resume-v1` session record. Migration occurs only when `dramaId`,
`episodeNo`, and `currentTime` are all valid. After a successful migration, the
old key is removed immediately so it cannot migrate twice or overwrite newer
history. Invalid data and storage failures silently fall back to a fresh
history.

Entry precedence is:

1. An explicitly selected route target or user-selected episode identity:
   `episodeId` when available, otherwise `episodeNo`.
2. The saved episode for that drama.
3. Episode one.

An explicit route target is never replaced by saved drama history. When only an
`episodeId` is supplied, the target episode is resolved before applying
history. Saved history may provide the initial playback position only when its
saved `episodeNo` matches that already-selected episode. If the explicit target
has no matching saved position, it starts at zero. This rule covers search
results, comment deep links, recommendation-to-detail navigation, and direct
episode selection.

Both `PlayWatchView` on mobile and `PlayImmersiveView` on desktop use the same
history module.

## Progress Policy

Progress stays in memory during normal playback. Storage writes are throttled
to once every two seconds, with an immediate final flush on:

- pause;
- recommendation item change;
- drama episode change;
- route navigation, route parameter switch, or component unmount;
- `visibilitychange` to hidden;
- `pagehide`;
- playback completion.

Before route teardown, the latest media time is captured, the appropriate
snapshot is flushed, and the media element is paused. The normal unmount path
then releases media and HLS resources.

Normalization rules are shared pure functions:

- Positions below three seconds are stored as zero.
- A position within five seconds of duration is treated as completed.
- A non-final completed episode stores the next episode at zero.
- A completed final episode stores the final episode at zero.
- A completed recommendation item remains selected with position zero.
- Negative, non-finite, or out-of-range values become zero.
- All ordinary restores, including recommendation restore, drama history
  restore, and history time applied to an explicit episode, land paused and
  display the center play button.
- Only an existing explicit autoplay entry may play immediately after restore.
- A paused restore remains ineligible for foreground auto-resume until the user
  explicitly presses play. Visibility changes and bfcache restoration cannot
  turn that restored paused state into playback.

Continuous play may move to the next episode as it does today. Once the new
episode is committed, history is updated to that episode at zero.

## Components

### `playRecommendSessionStore.ts`

Owns recommendation playback identity and time. It uses `sessionStorage`,
validates data at the boundary, distinguishes same-tab route return from a full
page refresh, and exposes read, update, flush, and clear operations. It never
stores feed API responses.

### `playDramaProgressStore.ts`

Owns the versioned per-drama history, migration, 50-entry pruning, and local
storage error handling.

### `playProgressPolicy.ts`

Contains storage-independent normalization, completion, and initial-position
resolution functions. This module has no React or browser dependency.

### Existing views

- `PlayRecommendView` configures the 10-page query limit, restores by active
  identity, explicitly opts out of remount refetch, and derives its index from
  the current flattened pages.
- `PlayImmersiveView` reports recommendation and desktop drama progress and
  initializes its seek and paused state from the appropriate store.
- `PlayWatchView` uses the shared drama history for mobile playback and removes
  its dependency on the old single-drama resume behavior.
- `PlayWatchVideoPlayer` exposes the existing playback time, pause, ended, and
  seek lifecycle through callbacks needed by the views. Its foreground resume
  input must remain false for a restored paused session until an explicit user
  play action. It does not own web storage.
- `playWatchNavigation` keeps navigation decisions and delegates progress to
  the shared drama history module.

Storage hydration must complete before a saved position is selected. The UI
may retain its existing loading state during this short client-only step so it
does not request episode one and then visibly jump to the saved episode.

## Failure Handling

Storage access is best-effort. Private mode, quota errors, malformed JSON, and
schema mismatches fall back to a fresh state without preventing playback.

If a stored position exceeds newly loaded media duration, playback starts at
zero. If a media URL expires, the existing media refetch path refreshes that
item; drama history remains intact. A missing recommendation item clears only
the recommendation snapshot.

## Verification

Pure tests cover:

- progress normalization and completion thresholds;
- final and non-final episode completion;
- explicit episode precedence;
- per-drama isolation and 50-entry pruning;
- old resume migration;
- malformed storage fallback;
- recommendation full-identity lookup after page eviction;
- refresh detection clearing recommendation snapshots before restore;
- restored pause state blocking foreground auto-resume.

Integration and manual checks cover:

- leave recommendation at a nonzero time, return to the same item paused;
- load more than 100 feed items without an active-item jump;
- refresh recommendation and receive a fresh first page;
- independently restore two dramas on mobile and desktop;
- explicitly select an older episode without history overriding it;
- flush on navigation, route parameter changes, backgrounding, refresh, and
  unmount;
- preserve swipe, continuous play, fullscreen, letterbox, and overlay layout.

The final verification runs focused tests, TypeScript checking, a production
build, and desktop/mobile browser checks.
