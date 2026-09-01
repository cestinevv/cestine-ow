# Playback Session Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore recommendation and per-drama playback positions while bounding the recommendation feed to 100 cached items and restoring ordinary entries in a paused state.

**Architecture:** Keep feed responses in a non-persisted TanStack Infinite Query with explicit same-tab cache behavior. Persist only a recommendation identity/time snapshot in `sessionStorage` and a 50-drama last-position map in `localStorage`; both desktop and mobile players consume shared policy and lifecycle helpers.

**Tech Stack:** React 19, TypeScript, TanStack Query 5, TanStack Router, Vidstack, browser Web Storage, Node `assert` tests run through `tsx`.

**Spec:** `docs/superpowers/specs/2026-08-18-playback-session-cache-design.md`

## Global Constraints

- Recommendation query page size is 10 and `maxPages` is 10, so no more than 100 feed records remain cached.
- Same-tab route return must not refetch the feed because of remount; browser refresh must request page one.
- Persist recommendation identity and time only, never feed API payloads or media URLs.
- Match recommendation state by `contentType`, optional `dramaId`, and `episodeId`; never restore by stale array index.
- Store at most 50 drama records, each representing only the last episode and time for that drama.
- Explicit `episodeId`, then explicit `episodeNo`, takes precedence over drama history.
- Ordinary restore is paused and cannot foreground-auto-resume until the user presses play; only an existing explicit autoplay entry may start playback.
- Preserve mobile swipe, continuous play, fullscreen, letterbox, interaction rail, and existing metrics behavior.
- Do not add a player keep-alive layer.

---

## File Map

- Create `src/features/play/playProgressPolicy.ts`: pure validation, normalization, completion, identity, and target precedence rules.
- Create `src/features/play/playProgressPolicy.test.ts`: executable `node:assert` coverage for those rules.
- Create `src/features/play/playRecommendSessionStore.ts`: recommendation session storage and refresh guard.
- Create `src/features/play/playRecommendSessionStore.test.ts`: storage and refresh behavior tests.
- Create `src/features/play/playDramaProgressStore.ts`: versioned per-drama local history, pruning, and legacy migration.
- Create `src/features/play/playDramaProgressStore.test.ts`: history, pruning, corruption, and migration tests.
- Create `src/features/play/hooks/usePlayProgressPersistence.ts`: throttled progress tracking and final lifecycle flush.
- Create `src/features/play/hooks/usePlayProgressPersistence.test.ts`: deterministic throttle and final-flush tests.
- Create `src/features/play/playRecommendFeedCache.ts`: explicit infinite-query constants and active identity lookup.
- Create `src/features/play/playRecommendFeedCache.test.ts`: 10-page and identity lookup tests.
- Modify `src/features/play/components/PlayWatchVideoPlayer.tsx`: support paused source initialization and register a direct pause callback.
- Modify `src/features/play/PlayRecommendView.tsx`: bounded query cache, active identity restore, and snapshot clearing.
- Modify `src/features/play/PlayImmersiveView.tsx`: desktop recommendation/drama progress integration.
- Modify `src/features/play/PlayWatchView.tsx`: mobile recommendation/drama progress integration.
- Modify `src/features/play/playWatchNavigation.ts`: delegate old resume reads/writes to the new drama history and stop owning storage.
- Modify `src/routes/play/$dramaId/index.tsx`: pass explicit autoplay and target identity into desktop playback.
- Modify `src/routes/play/$dramaId/watch.tsx`: preserve explicit target identity for mobile playback.

---

### Task 1: Pure Playback Policy

**Files:**
- Create: `src/features/play/playProgressPolicy.ts`
- Create: `src/features/play/playProgressPolicy.test.ts`

**Interfaces:**
- Produces: `normalizePlaybackTime(currentTime, duration?) => number`
- Produces: `resolveCompletedDramaPosition(episodeNo, totalEpisodes) => { episodeNo; currentTime: 0 }`
- Produces: `RecommendActiveKey` and `matchesRecommendActiveKey(left, right) => boolean`
- Produces: `resolveDramaStartTarget(input) => { episodeId?; episodeNo; currentTime; restored: boolean }`

- [ ] **Step 1: Write failing policy tests**

```ts
import assert from 'node:assert/strict';
import {
  matchesRecommendActiveKey,
  normalizePlaybackTime,
  resolveCompletedDramaPosition,
  resolveDramaStartTarget,
} from './playProgressPolicy';

assert.equal(normalizePlaybackTime(2.9, 100), 0);
assert.equal(normalizePlaybackTime(30, 100), 30);
assert.equal(normalizePlaybackTime(96, 100), 0);
assert.equal(normalizePlaybackTime(Number.NaN, 100), 0);
assert.deepEqual(resolveCompletedDramaPosition(3, 10), {
  episodeNo: 4,
  currentTime: 0,
});
assert.deepEqual(resolveCompletedDramaPosition(10, 10), {
  episodeNo: 10,
  currentTime: 0,
});
assert.equal(
  matchesRecommendActiveKey(
    { contentType: 'drama_episode', dramaId: 'd1', episodeId: 'e1' },
    { contentType: 'drama_episode', dramaId: 'd1', episodeId: 'e1' },
  ),
  true,
);
assert.equal(
  matchesRecommendActiveKey(
    { contentType: 'drama_episode', dramaId: 'd1', episodeId: 'e1' },
    { contentType: 'drama_episode', dramaId: 'd2', episodeId: 'e1' },
  ),
  false,
);
assert.deepEqual(
  resolveDramaStartTarget({
    explicitEpisodeId: 'e3',
    explicitEpisodeNo: 3,
    saved: { episodeNo: 7, currentTime: 42 },
  }),
  { episodeId: 'e3', episodeNo: 3, currentTime: 0, restored: false },
);
assert.deepEqual(
  resolveDramaStartTarget({
    explicitEpisodeNo: 7,
    saved: { episodeNo: 7, currentTime: 42 },
  }),
  { episodeNo: 7, currentTime: 42, restored: true },
);
```

- [ ] **Step 2: Run the test and confirm it fails because the module is absent**

Run: `pnpm exec tsx src/features/play/playProgressPolicy.test.ts`

Expected: module resolution failure for `playProgressPolicy`.

- [ ] **Step 3: Implement the pure policy**

Use constants `MIN_RESUME_SECONDS = 3` and `COMPLETE_REMAINING_SECONDS = 5`. Reject negative/non-finite values, normalize positions below 3 seconds to zero, and treat `duration - currentTime <= 5` as complete. `resolveDramaStartTarget` must only apply saved time when the already-selected episode number equals `saved.episodeNo`.

- [ ] **Step 4: Run the policy test**

Run: `pnpm exec tsx src/features/play/playProgressPolicy.test.ts`

Expected: exit code 0 with no assertion output.

- [ ] **Step 5: Commit the policy unit**

```bash
git add src/features/play/playProgressPolicy.ts src/features/play/playProgressPolicy.test.ts
git commit -m "feat: add playback progress policy"
```

---

### Task 2: Recommendation Session and Drama History Storage

**Files:**
- Create: `src/features/play/playRecommendSessionStore.ts`
- Create: `src/features/play/playRecommendSessionStore.test.ts`
- Create: `src/features/play/playDramaProgressStore.ts`
- Create: `src/features/play/playDramaProgressStore.test.ts`
- Modify: `src/features/play/playWatchNavigation.ts`

**Interfaces:**
- Consumes: `normalizePlaybackTime`, `RecommendActiveKey`, and `resolveDramaStartTarget` from Task 1.
- Produces: `readRecommendPlaybackSession`, `writeRecommendPlaybackSession`, `clearRecommendPlaybackSession`, `readNavigationEntryType`.
- Produces: `readDramaPlaybackHistory`, `readDramaPlaybackEntry`, `writeDramaPlaybackEntry`, `clearDramaPlaybackEntry`.
- Storage functions accept optional `Storage` parameters so tests do not mutate real browser storage.

- [ ] **Step 1: Write failing recommendation storage tests**

Build a `MemoryStorage implements Storage` in the test. Assert that valid snapshots round-trip, malformed JSON returns `undefined`, full identity is preserved, and `readRecommendPlaybackSession({ navigationType: 'reload' })` removes the key and returns `undefined`. Assert that navigation type `'navigate'` keeps the snapshot.

- [ ] **Step 2: Run the recommendation storage test and confirm failure**

Run: `pnpm exec tsx src/features/play/playRecommendSessionStore.test.ts`

Expected: module resolution failure for `playRecommendSessionStore`.

- [ ] **Step 3: Implement recommendation storage**

Use key `play-recommend-session-v1`. Validate `contentType`, `episodeId`, optional `dramaId`, finite non-negative `currentTime`, and finite positive `updatedAt`. Read `PerformanceNavigationTiming.type` through a small boundary function. On `'reload'`, remove the key before returning any snapshot; treat `'back_forward'` as same-tab restoration.

- [ ] **Step 4: Run recommendation storage tests**

Run: `pnpm exec tsx src/features/play/playRecommendSessionStore.test.ts`

Expected: exit code 0.

- [ ] **Step 5: Write failing drama history tests**

Cover these exact cases:

```ts
assert.deepEqual(readDramaPlaybackEntry('drama-a', storage), {
  episodeNo: 7,
  currentTime: 42,
  duration: 100,
  updatedAt: 1000,
});
assert.equal(readDramaPlaybackEntry('drama-b', storage)?.episodeNo, 3);
assert.equal(Object.keys(readDramaPlaybackHistory(storage).dramas).length, 50);
assert.equal(readDramaPlaybackEntry('oldest-drama', storage), undefined);
```

Also assert that a valid `play-watch-resume-v1` value in injected session storage migrates once to `play-drama-progress-v2` and deletes the old key. Invalid legacy data must leave a fresh history and must not throw.

- [ ] **Step 6: Run the drama history test and confirm failure**

Run: `pnpm exec tsx src/features/play/playDramaProgressStore.test.ts`

Expected: module resolution failure for `playDramaProgressStore`.

- [ ] **Step 7: Implement drama history and migration**

Use local key `play-drama-progress-v2`, schema version `2`, and limit `50`. Sort entries by descending `updatedAt` after writes and retain the newest 50. Validate snowflake IDs as non-empty strings and episode numbers as positive integers. Migration reads the legacy key from session storage only when the new module is first read; remove the old key immediately after a successful new-history write.

- [ ] **Step 8: Delegate navigation helpers to the new history**

Keep `resolvePlayEntryPath`, `navigateToPlayEntryPage`, and `navigateToPlayWatchPage`. Remove direct ownership of `play-watch-resume-v1`; when navigation needs an existing time for an explicit episode, call `readDramaPlaybackEntry` and reuse time only if the saved `episodeNo` matches.

- [ ] **Step 9: Run all storage and policy tests**

```bash
pnpm exec tsx src/features/play/playProgressPolicy.test.ts
pnpm exec tsx src/features/play/playRecommendSessionStore.test.ts
pnpm exec tsx src/features/play/playDramaProgressStore.test.ts
```

Expected: all commands exit 0.

- [ ] **Step 10: Commit storage modules**

```bash
git add src/features/play/playRecommendSessionStore.ts src/features/play/playRecommendSessionStore.test.ts src/features/play/playDramaProgressStore.ts src/features/play/playDramaProgressStore.test.ts src/features/play/playWatchNavigation.ts
git commit -m "feat: persist playback session history"
```

---

### Task 3: Player Pause-Restore and Lifecycle Flush

**Files:**
- Create: `src/features/play/hooks/usePlayProgressPersistence.ts`
- Create: `src/features/play/hooks/usePlayProgressPersistence.test.ts`
- Modify: `src/features/play/components/PlayWatchVideoPlayer.tsx`

**Interfaces:**
- Produces hook: `usePlayProgressPersistence({ identityKey, enabled, persist, pause })` returning `{ recordProgress, flush }`.
- Adds player prop: `autoplayOnSourceChange?: boolean`, defaulting to `true` to preserve existing callers.
- Adds player prop: `onRegisterDirectPause?: (pause: (() => void) | null) => void`.

- [ ] **Step 1: Add an executable pure throttle test seam**

Keep timer scheduling in a small exported `createProgressFlusher` used by the hook. Its test uses injected `setTimer` and `clearTimer` callbacks to assert that repeated updates schedule one write per two-second window and `flush()` writes the latest time immediately.

- [ ] **Step 2: Run the persistence test and confirm failure**

Run: `pnpm exec tsx src/features/play/hooks/usePlayProgressPersistence.test.ts`

Expected: module resolution failure for `usePlayProgressPersistence`.

- [ ] **Step 3: Implement the flusher and hook**

The hook keeps the latest progress and callbacks in refs. It flushes before `identityKey` changes and on cleanup, `visibilitychange` to hidden, and `pagehide`. The cleanup calls `pause` before the final persist. Timers use 2000 ms and are cleared after a final flush.

- [ ] **Step 4: Add paused source initialization to the player**

Pass `autoplayOnSourceChange` into `PlayWatchPlaybackSync`. On a new source:

```ts
pendingAutoplayRef.current = autoplayOnSourceChange;
if (!autoplayOnSourceChange) {
  remote.pause();
  return;
}
```

Still apply `initialTime` after `canPlay`, but never invoke `remote.play()` for a paused restore. Replay signals and explicit user play keep current behavior.

- [ ] **Step 5: Register a direct pause callback**

Extend the existing Vidstack remote registrar to call `onRegisterDirectPause(() => remote.pause())`, and clear it on unmount. This gives the persistence hook a reliable pause operation without document-wide video queries.

- [ ] **Step 6: Run persistence test and typecheck**

```bash
pnpm exec tsx src/features/play/hooks/usePlayProgressPersistence.test.ts
pnpm run typecheck
```

Expected: test exits 0 and typecheck reports no non-generated TypeScript errors.

- [ ] **Step 7: Commit player lifecycle support**

```bash
git add src/features/play/hooks/usePlayProgressPersistence.ts src/features/play/hooks/usePlayProgressPersistence.test.ts src/features/play/components/PlayWatchVideoPlayer.tsx
git commit -m "feat: support paused playback restoration"
```

---

### Task 4: Bounded Feed Cache and Recommendation Restore

**Files:**
- Create: `src/features/play/playRecommendFeedCache.ts`
- Create: `src/features/play/playRecommendFeedCache.test.ts`
- Modify: `src/features/play/PlayRecommendView.tsx`
- Modify: `src/features/play/types/playImmersive.ts`
- Modify: `src/features/play/PlayImmersiveView.tsx`
- Modify: `src/features/play/PlayWatchView.tsx`

**Interfaces:**
- Consumes: recommendation session store, policy identity matcher, persistence hook, and paused-player props.
- Produces: `RECOMMEND_FEED_PAGE_SIZE = 10`, `RECOMMEND_FEED_MAX_PAGES = 10`, and explicit query policy options.
- Adds optional recommendation restore/progress callbacks to shared playback props without changing drama defaults.

- [ ] **Step 1: Write failing feed cache tests**

Assert constants are 10, query policy values are explicit, and `findRecommendItemIndex` matches all identity fields:

```ts
assert.equal(RECOMMEND_FEED_PAGE_SIZE, 10);
assert.equal(RECOMMEND_FEED_MAX_PAGES, 10);
assert.equal(RECOMMEND_FEED_QUERY_POLICY.maxPages, 10);
assert.equal(RECOMMEND_FEED_QUERY_POLICY.refetchOnMount, false);
assert.equal(RECOMMEND_FEED_QUERY_POLICY.refetchOnWindowFocus, false);
assert.equal(RECOMMEND_FEED_QUERY_POLICY.refetchOnReconnect, false);
assert.equal(findRecommendItemIndex(items, activeKey), 1);
```

- [ ] **Step 2: Run feed cache test and confirm failure**

Run: `pnpm exec tsx src/features/play/playRecommendFeedCache.test.ts`

Expected: module resolution failure for `playRecommendFeedCache`.

- [ ] **Step 3: Implement feed cache helpers**

Export the constants, explicit policy object with infinite `staleTime/gcTime`, and an identity-based lookup that normalizes Snowflake IDs as strings.

- [ ] **Step 4: Apply explicit Infinite Query policy**

In `PlayRecommendView`, use page size 10 and spread the policy into `useInfiniteQuery`, including `maxPages: 10`. Keep `getNextPageParam`; pages evicted by TanStack Query must not be copied into another persistent store.

- [ ] **Step 5: Replace authoritative `feedIndex` restoration with active identity**

On first client restoration, call `readRecommendPlaybackSession` with the navigation entry type. For non-refresh return, find the active item by complete identity after pages are available. Keep a derived current index for rendering and navigation. If no match exists in a valid cache, clear the snapshot and select index zero. Pending next-page navigation may still use a temporary requested index, but that index must never be persisted.

- [ ] **Step 6: Wire recommendation progress on desktop and mobile**

Pass `initialTime` and `restorePaused` for the restored active identity into `PlayImmersiveView` and `PlayWatchView`. Both views use `usePlayProgressPersistence` to write `{ activeKey, currentTime, updatedAt }`, flush before feed item changes, and register the player's direct pause callback.

Set these player values for a restored recommendation:

```tsx
autoplayOnSourceChange={!restorePaused}
showCenterPlayButton={restorePaused || userPaused || autoplayBlocked}
shouldAutoResumeOnForeground={
  !restorePaused && hasActivatedPlayback && !userPaused
}
```

The first explicit play action clears `restorePaused`; later background/foreground behavior then follows existing user playback intent.

- [ ] **Step 7: Normalize recommendation completion**

Before existing auto-next logic runs, persist the completed active item with `currentTime: 0`. If auto-next selects another item, the identity change flushes the new item at zero without overwriting the completed item with the next identity.

- [ ] **Step 8: Run focused tests and typecheck**

```bash
pnpm exec tsx src/features/play/playRecommendFeedCache.test.ts
pnpm exec tsx src/features/play/playRecommendSessionStore.test.ts
pnpm run typecheck
```

Expected: tests exit 0 and typecheck reports no non-generated errors.

- [ ] **Step 9: Commit recommendation caching**

```bash
git add src/features/play/playRecommendFeedCache.ts src/features/play/playRecommendFeedCache.test.ts src/features/play/PlayRecommendView.tsx src/features/play/types/playImmersive.ts src/features/play/PlayImmersiveView.tsx src/features/play/PlayWatchView.tsx
git commit -m "feat: cache recommendation playback session"
```

---

### Task 5: Per-Drama Resume on Desktop and Mobile

**Files:**
- Modify: `src/features/play/PlayImmersiveView.tsx`
- Modify: `src/features/play/PlayWatchView.tsx`
- Modify: `src/features/play/playWatchNavigation.ts`
- Modify: `src/routes/play/$dramaId/index.tsx`
- Modify: `src/routes/play/$dramaId/watch.tsx`

**Interfaces:**
- Consumes: drama history, target precedence policy, persistence hook, and paused-player support.
- Produces: route-to-player props that retain explicit `episodeId`, `episodeNo`, and explicit autoplay intent.

- [ ] **Step 1: Resolve explicit route target before history**

In both routes, preserve whether `episodeId` or `episode` was actually supplied instead of eagerly replacing absence with episode one. Pass explicit autoplay intent to desktop playback. When only `episodeId` exists, resolve its `episodeNo` from the loaded episode list before selecting history time.

- [ ] **Step 2: Initialize both drama views from shared history**

For a route without an explicit target, read `dramaId` history and start from its saved episode/time. For an explicit target, keep that target; apply saved time only when its resolved episode number equals the saved entry. Otherwise start at zero. Set restored entries to paused and pass `autoplayOnSourceChange={false}` unless the explicit autoplay route is active.

- [ ] **Step 3: Persist normal drama playback**

Use `usePlayProgressPersistence` in drama mode with identity key `${dramaId}:${currentEpisode}`. `recordProgress` writes the latest normalized time and duration. Flush before episode changes, `dramaId` route parameter changes, navigation, hidden/pagehide, and unmount.

- [ ] **Step 4: Persist completion transitions**

On episode end, call `resolveCompletedDramaPosition(currentEpisode, totalEpisodes)`. Write the next episode at zero for non-final completion and the final episode at zero for final completion before existing continuous-play logic decides whether to transition.

- [ ] **Step 5: Preserve paused restore against foreground resume**

Keep `shouldAutoResumeOnForeground` false while `restorePaused` is true. Clear that flag only in an explicit player `onUserPlay` path. A visibility or bfcache event may show the play button but cannot initiate playback first.

- [ ] **Step 6: Remove obsolete direct resume ownership**

Delete `readPlayWatchResume` and `writePlayWatchResume` imports from views. Keep compatibility exports only if another current call site still needs them; `rg -n "readPlayWatchResume|writePlayWatchResume" src` must show no view-level legacy storage usage.

- [ ] **Step 7: Run focused tests and typecheck**

```bash
pnpm exec tsx src/features/play/playProgressPolicy.test.ts
pnpm exec tsx src/features/play/playDramaProgressStore.test.ts
pnpm exec tsx src/features/play/hooks/usePlayProgressPersistence.test.ts
pnpm run typecheck
```

Expected: tests exit 0 and typecheck reports no non-generated errors.

- [ ] **Step 8: Commit drama resume integration**

```bash
git add src/features/play/PlayImmersiveView.tsx src/features/play/PlayWatchView.tsx src/features/play/playWatchNavigation.ts 'src/routes/play/$dramaId/index.tsx' 'src/routes/play/$dramaId/watch.tsx'
git commit -m "feat: resume each drama from local history"
```

---

### Task 6: Regression Verification

**Files:**
- Modify only files required by defects discovered during verification.

**Interfaces:**
- Consumes all prior tasks.
- Produces a verified desktop and mobile playback flow.

- [ ] **Step 1: Run every focused executable test**

```bash
pnpm exec tsx src/features/play/playProgressPolicy.test.ts
pnpm exec tsx src/features/play/playRecommendSessionStore.test.ts
pnpm exec tsx src/features/play/playDramaProgressStore.test.ts
pnpm exec tsx src/features/play/hooks/usePlayProgressPersistence.test.ts
pnpm exec tsx src/features/play/playRecommendFeedCache.test.ts
```

Expected: every command exits 0.

- [ ] **Step 2: Run static and production verification**

```bash
pnpm run typecheck
pnpm run build:test
```

Expected: no non-generated TypeScript errors and a successful test-environment production bundle.

- [ ] **Step 3: Verify recommendation same-tab return**

Run the local app, watch a recommendation beyond 3 seconds, navigate to another route, and return. Confirm the same complete identity is active, the player is at the saved time, it is paused, and the center play button is visible. Switch the tab to background and back before pressing play; confirm it remains paused.

- [ ] **Step 4: Verify feed bounds and refresh**

Load 11 or more feed pages. Inspect React Query state and confirm no more than 10 pages remain. Confirm the active video does not jump when page one is evicted. Refresh the browser and confirm page one is requested and the old recommendation snapshot is cleared before restoration.

- [ ] **Step 5: Verify per-drama behavior**

Watch drama A episode 7 and drama B episode 3 at nonzero times on both desktop and mobile widths. Re-enter each drama without an explicit target and confirm independent paused restoration. Open an explicit episode through episode selection, a search result, and a comment deep link; confirm the route target wins and unrelated saved history cannot replace it.

- [ ] **Step 6: Verify completion and layout regressions**

Complete a non-final episode and confirm the next episode is stored at zero. Complete a final episode and confirm the final episode is stored at zero. Exercise mobile swipe, continuous play, fullscreen, portrait/landscape letterbox, right interaction rail, side panel, and browser foreground recovery.

- [ ] **Step 7: Inspect final diff and commit verification fixes**

```bash
git diff --check
git status --short
git diff --stat
```

If verification required code corrections, stage only those scoped files and commit them with `fix: stabilize playback session restore`. If no corrections were required, do not create an empty commit.
