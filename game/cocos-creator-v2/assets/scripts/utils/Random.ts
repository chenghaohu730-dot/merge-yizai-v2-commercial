export function weightedPick<T extends { weight: number }>(items: readonly T[], randomValue = Math.random()): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomValue * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
