/**
 * Bộ giấy lô tô (kiểu Việt Nam, 90 số).
 *
 * Quy tắc một tờ:
 * - 9 hàng × 9 cột, chia 3 khối 3 hàng (mỗi khối là một "vé" 3 × 9).
 * - Cột theo chục: cột 1 là 1–9, cột 2 là 10–19, …, cột 8 là 70–79, cột 9 là 80–90.
 * - Mỗi hàng đúng 5 số (4 ô trống). Mỗi khối có ít nhất 1 số ở mỗi cột, số trong cột tăng dần từ trên xuống.
 * - Hai tờ cùng màu là một cặp: gộp lại đủ 90 số, không số nào lặp.
 * Cả bộ là nhiều cặp màu, sinh cố định theo mã game (máy nào cũng ra đúng bộ đó, ván nào cũng dùng lại như giấy thật).
 */

/** Một tờ: 9 hàng × 9 ô, null = ô trống. */
export type Sheet = (number | null)[][]

export const ROWS = 9
export const COLS = 9
export const PER_ROW = 5

/** Màu các cặp tờ (nền ô trống / viền). */
export const SHEET_COLORS = [
  '#ef476f',
  '#3a86ff',
  '#06d6a0',
  '#ffb703',
  '#9b5de5',
  '#fb8500',
  '#00b4d8',
  '#e76f51',
  '#8ac926',
  '#f15bb5',
  '#2a9d8f',
  '#6d597a',
]
export const COLOR_NAMES = ['Đỏ', 'Xanh dương', 'Xanh lá', 'Vàng', 'Tím', 'Cam', 'Xanh biển', 'Gạch', 'Xanh chuối', 'Hồng', 'Xanh rêu', 'Tím than']

/** Cột của một số: 1–9 → 0, 10–19 → 1, …, 80–90 → 8. */
export const colOf = (n: number) => (n === 90 ? 8 : Math.floor(n / 10))

/** Số ngẫu nhiên có hạt giống (mulberry32) — cùng hạt giống thì cùng dãy. */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Chia 90 số cho 6 vé: mỗi vé 15 số, mỗi cột 1–3 số. */
function splitIntoTickets(rand: () => number): number[][][] | null {
  const byCol: number[][] = Array.from({ length: COLS }, (_, c) =>
    shuffle(
      Array.from({ length: c === 0 ? 9 : c === 8 ? 11 : 10 }, (_, i) => (c === 0 ? i + 1 : c * 10 + i)),
      rand,
    ),
  )
  // tickets[t][c] = các số của vé t ở cột c
  const tickets: number[][][] = Array.from({ length: 6 }, () => Array.from({ length: COLS }, () => [] as number[]))
  // Mỗi vé trước hết 1 số ở mỗi cột
  for (let c = 0; c < COLS; c++) for (let t = 0; t < 6; t++) tickets[t][c].push(byCol[c].pop()!)
  const size = (t: number) => tickets[t].reduce((s, col) => s + col.length, 0)
  // Số còn lại: cột nhiều số trước (dễ kẹt nhất), mỗi số vào vé còn chỗ (< 15 số, cột < 3)
  const rest = byCol.flatMap((col, c) => col.map((n) => ({ n, c }))).sort((x, y) => byCol[y.c].length - byCol[x.c].length || rand() - 0.5)
  for (const { n, c } of rest) {
    const open = shuffle(
      Array.from({ length: 6 }, (_, t) => t).filter((t) => size(t) < 15 && tickets[t][c].length < 3),
      rand,
    ).sort((x, y) => size(x) - size(y))
    if (!open.length) return null
    tickets[open[0]][c].push(n)
  }
  return tickets.every((_, t) => size(t) === 15) ? tickets : null
}

/** Xếp 15 số của một vé vào 3 hàng × 9 cột, mỗi hàng đúng 5 số; số trong cột tăng dần. */
function layoutTicket(cols: number[][], rand: () => number): Sheet | null {
  const rows: Sheet = Array.from({ length: 3 }, () => Array<number | null>(COLS).fill(null))
  const count = [0, 0, 0]
  // Cột 3 số trước, rồi 2, rồi 1 — chọn hàng còn ít số nhất
  const order = shuffle(
    Array.from({ length: COLS }, (_, c) => c),
    rand,
  ).sort((a, b) => cols[b].length - cols[a].length)
  for (const c of order) {
    const k = cols[c].length
    const pick = shuffle([0, 1, 2], rand)
      .sort((a, b) => count[a] - count[b])
      .slice(0, k)
      .sort((a, b) => a - b)
    if (pick.some((r) => count[r] >= PER_ROW)) return null
    const nums = [...cols[c]].sort((a, b) => a - b)
    pick.forEach((r, i) => {
      rows[r][c] = nums[i]
      count[r]++
    })
  }
  return count.every((x) => x === PER_ROW) ? rows : null
}

/** Sinh một cặp tờ (2 tờ × 3 vé) phủ đủ 1–90. */
export function generatePair(rand: () => number): [Sheet, Sheet] {
  for (;;) {
    const tickets = splitIntoTickets(rand)
    if (!tickets) continue
    const laid: Sheet[] = []
    for (const t of tickets) {
      let rows: Sheet | null = null
      for (let tries = 0; tries < 50 && !rows; tries++) rows = layoutTicket(t, rand)
      if (!rows) break
      laid.push(rows)
    }
    if (laid.length === 6) return [[...laid[0], ...laid[1], ...laid[2]], [...laid[3], ...laid[4], ...laid[5]]]
  }
}

/** Bộ giấy của game: `pairs` cặp màu (tờ 2k và 2k+1 cùng màu k). Cố định theo mã game. */
export function sheetSet(gameId: string, pairs: number): Sheet[] {
  const out: Sheet[] = []
  for (let k = 0; k < pairs; k++) out.push(...generatePair(seeded(`${gameId}:loto:${k}`)))
  return out
}

/** Bộ giấy đủ cho cả bàn: ít nhất 6 cặp (12 tờ), đông người thì thêm để ai cũng mua đủ tối đa. */
export const pairsFor = (players: number, max: number) => Math.max(6, Math.ceil((players * max) / 2))

/** Màu / tên tờ thứ `index`. */
export const sheetColor = (index: number) => SHEET_COLORS[Math.floor(index / 2) % SHEET_COLORS.length]
export const sheetName = (index: number) => `${COLOR_NAMES[Math.floor(index / 2) % COLOR_NAMES.length]} ${(index % 2) + 1}`

/** Kiểm tra một tờ đúng quy tắc (dùng cho test / phòng hờ). Trả về lỗi đầu tiên, null = đúng. */
export function sheetError(sheet: Sheet): string | null {
  if (sheet.length !== ROWS || sheet.some((r) => r.length !== COLS)) return 'Sai kích thước'
  for (let r = 0; r < ROWS; r++) {
    if (sheet[r].filter((x) => x !== null).length !== PER_ROW) return `Hàng ${r + 1} không đủ 5 số`
    for (let c = 0; c < COLS; c++) {
      const n = sheet[r][c]
      if (n !== null && (n < 1 || n > 90 || colOf(n) !== c)) return `Số ${n} sai cột`
    }
  }
  for (let b = 0; b < 3; b++)
    for (let c = 0; c < COLS; c++) {
      const col = [0, 1, 2].map((i) => sheet[b * 3 + i][c]).filter((x): x is number => x !== null)
      if (!col.length) return `Khối ${b + 1} trống cột ${c + 1}`
      if (col.some((n, i) => i && n <= col[i - 1])) return `Khối ${b + 1} cột ${c + 1} không tăng dần`
    }
  return null
}

/** Cặp tờ phủ đủ 1–90, không lặp. */
export function pairError(a: Sheet, b: Sheet): string | null {
  const nums = [...a.flat(), ...b.flat()].filter((x): x is number => x !== null).sort((x, y) => x - y)
  if (nums.length !== 90 || nums.some((n, i) => n !== i + 1)) return 'Cặp tờ không đủ 1–90'
  return null
}

/** Các số trên một hàng. */
export const rowNumbers = (sheet: Sheet, row: number) => sheet[row].filter((x): x is number => x !== null)
