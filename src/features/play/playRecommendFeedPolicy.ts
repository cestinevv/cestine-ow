export function getRecommendReplacementAfterRemoval<T>(
  items: readonly T[],
  removedIndex: number,
): T | undefined {
  return items[removedIndex + 1] ?? items[removedIndex - 1];
}
