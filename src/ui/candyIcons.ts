const CANDIES = Object.entries(
  import.meta.glob<string>('../assets/candies/candy-*.webp', { eager: true, import: 'default' }),
)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => url)

/** Số giả ngẫu nhiên ổn định theo chuỗi (FNV-1a). */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** Một icon kẹo "ngẫu nhiên" nhưng cố định theo seed (vd id người chơi). */
export function candyFor(seed: string): string {
  return CANDIES[hash(`${seed}:one`) % CANDIES.length]
}
