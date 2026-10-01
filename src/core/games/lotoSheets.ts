/**
 * Bộ giấy lô tô (kiểu Việt Nam, 90 số).
 *
 * Quy tắc một tờ:
 * - 9 hàng × 9 cột, chia 3 khối 3 hàng (mỗi khối là một "vé" 3 × 9).
 * - Cột theo chục: cột 1 là 1–9, cột 2 là 10–19, …, cột 8 là 70–79, cột 9 là 80–90.
 * - Mỗi hàng đúng 5 số (4 ô trống). Mỗi khối có ít nhất 1 số ở mỗi cột, số trong cột tăng dần từ trên xuống.
 * - Hai tờ cùng màu là một cặp: gộp lại đủ 90 số, không số nào lặp.
 * - Các tờ khác cặp không na ná nhau: không hai hàng nào chung quá 2 số, hạn chế số trùng đúng ô.
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
export const COLOR_NAMES = [
  'Đỏ',
  'Xanh dương',
  'Xanh lá',
  'Vàng',
  'Tím',
  'Cam',
  'Xanh biển',
  'Gạch',
  'Xanh chuối',
  'Hồng',
  'Xanh rêu',
  'Tím than',
]

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

/**
 * Khung một vé: với mỗi cột, các hàng (0–2) có số — `counts[c]` số ở cột c, mỗi hàng đúng 5 số.
 * Cột 3 số trước, rồi 2, rồi 1 — chọn hàng còn ít số nhất.
 */
function ticketPattern(counts: number[], rand: () => number): number[][] | null {
  const pattern: number[][] = Array.from({ length: COLS }, () => [])
  const count = [0, 0, 0]
  const order = shuffle(
    Array.from({ length: COLS }, (_, c) => c),
    rand,
  ).sort((a, b) => counts[b] - counts[a])
  for (const c of order) {
    const pick = shuffle([0, 1, 2], rand)
      .sort((a, b) => count[a] - count[b])
      .slice(0, counts[c])
      .sort((a, b) => a - b)
    if (pick.some((r) => count[r] >= PER_ROW)) return null
    pick.forEach((r) => count[r]++)
    pattern[c] = pick
  }
  return count.every((x) => x === PER_ROW) ? pattern : null
}

function patternFor(cols: number[][], rand: () => number): number[][] {
  const counts = cols.map((c) => c.length)
  for (;;) {
    const p = ticketPattern(counts, rand)
    if (p) return p
  }
}

/** Vé (số theo cột + khung) → 3 hàng; số trong cột xếp tăng dần từ trên xuống. */
function layout(cols: number[][], pattern: number[][]): Sheet {
  const rows: Sheet = Array.from({ length: 3 }, () => Array<number | null>(COLS).fill(null))
  cols.forEach((list, c) => {
    const nums = [...list].sort((x, y) => x - y)
    pattern[c].forEach((r, i) => (rows[r][c] = nums[i]))
  })
  return rows
}

const toPair = (cols: number[][][], patterns: number[][][]): [Sheet, Sheet] => {
  const laid = cols.map((t, i) => layout(t, patterns[i]))
  return [
    [...laid[0], ...laid[1], ...laid[2]],
    [...laid[3], ...laid[4], ...laid[5]],
  ]
}

/** Các tờ đã có trong bộ — cặp mới phải tránh giống chúng. */
interface Taken {
  /** Số → các hàng (của tờ đã có) chứa số đó. */
  rowsWith: number[][]
  /** Số hàng đã có. */
  rows: number
  /** Ô (hàng × 9 + cột) → số → bao nhiêu tờ đã có số đó ở đúng ô đó. */
  cells: Map<number, number>[]
}

/** Hai hàng ở hai tờ khác nhau chung nhiều nhất chừng này số (chung 3–4 số thì tờ nhìn na ná, dễ cùng kinh một lúc). */
export const MAX_SHARED = 2

/**
 * Độ "giống" của một vé (khối `block` của tờ) so với các tờ đã có: mỗi cặp hàng chung quá `MAX_SHARED` số bị phạt nặng
 * (càng chung nhiều càng nặng), mỗi số trùng đúng ô với tờ khác phạt nhẹ.
 */
function likeness(rows: Sheet, block: number, taken: Taken, shared: Int32Array): number {
  let cost = 0
  rows.forEach((row, i) => {
    const r = block * 3 + i
    const touched: number[] = []
    row.forEach((n, c) => {
      if (n === null) return
      cost += taken.cells[r * COLS + c].get(n) ?? 0
      for (const k of taken.rowsWith[n]) if (shared[k]++ === 0) touched.push(k)
    })
    for (const k of touched) {
      const over = shared[k] - MAX_SHARED
      if (over > 0) cost += 100 * over * over
      shared[k] = 0
    }
  })
  return cost
}

function addTaken(taken: Taken, pair: [Sheet, Sheet]) {
  for (const sheet of pair)
    sheet.forEach((row, r) => {
      const k = taken.rows++
      row.forEach((n, c) => {
        if (n === null) return
        taken.rowsWith[n].push(k)
        const cell = taken.cells[r * COLS + c]
        cell.set(n, (cell.get(n) ?? 0) + 1)
      })
    })
}

const emptyTaken = (): Taken => ({
  rowsWith: Array.from({ length: 91 }, () => []),
  rows: 0,
  cells: Array.from({ length: ROWS * COLS }, () => new Map()),
})

/** Số bước chỉnh tối đa cho một cặp: đủ hết hàng na ná, bớt phần lớn số trùng ô — 10 cặp chừng vài chục ms. */
const TUNE_STEPS = 1000

/**
 * Sinh một cặp tờ (2 tờ × 3 vé) phủ đủ 1–90.
 * Có `taken` (các tờ đã có trong bộ) thì chỉnh dần cho cặp mới khác hẳn chúng: đổi chỗ hai số cùng cột giữa hai vé
 * (vẫn đúng luật: mỗi vé giữ số lượng ở mỗi cột) hoặc xếp lại khung một vé — giữ bước nào không làm tờ giống hơn.
 */
export function generatePair(rand: () => number, taken?: Taken): [Sheet, Sheet] {
  let cols: number[][][] | null = null
  while (!cols) cols = splitIntoTickets(rand)
  const patterns = cols.map((t) => patternFor(t, rand))
  if (!taken?.rows) return toPair(cols, patterns)
  const shared = new Int32Array(taken.rows)
  // Vé t là khối t % 3 của tờ đầu (t < 3) hoặc tờ sau
  const costOf = (t: number) => likeness(layout(cols![t], patterns[t]), t % 3, taken, shared)
  const costs = cols.map((_, t) => costOf(t))
  let total = costs.reduce((a, b) => a + b, 0)
  for (let step = 0; step < TUNE_STEPS && total > 0; step++) {
    const t = Math.floor(rand() * 6)
    if (rand() < 0.2) {
      // Xếp lại khung một vé
      const old = patterns[t]
      patterns[t] = patternFor(cols[t], rand)
      const next = costOf(t)
      if (next <= costs[t]) {
        total += next - costs[t]
        costs[t] = next
      } else patterns[t] = old
      continue
    }
    // Đổi hai số cùng cột giữa hai vé
    const u = (t + 1 + Math.floor(rand() * 5)) % 6
    const c = Math.floor(rand() * COLS)
    const i = Math.floor(rand() * cols[t][c].length)
    const j = Math.floor(rand() * cols[u][c].length)
    const swap = () => ([cols![t][c][i], cols![u][c][j]] = [cols![u][c][j], cols![t][c][i]])
    swap()
    const [nt, nu] = [costOf(t), costOf(u)]
    if (nt + nu <= costs[t] + costs[u]) {
      total += nt + nu - costs[t] - costs[u]
      costs[t] = nt
      costs[u] = nu
    } else swap()
  }
  return toPair(cols, patterns)
}

/**
 * Bộ giấy của game: `pairs` cặp màu (tờ 2k và 2k+1 cùng màu k). Cố định theo mã game.
 * Mỗi cặp sinh theo thứ tự, tránh giống các cặp trước — thêm cặp (đông người) không đổi các tờ cũ.
 */
export function sheetSet(gameId: string, pairs: number): Sheet[] {
  // Nhớ bộ đã sinh theo mã game (sinh có chỉnh nên tốn vài chục ms) — cần thêm cặp thì sinh tiếp từ chỗ cũ
  let set = sets.get(gameId)
  if (!set) {
    if (sets.size >= 8) sets.clear()
    set = { sheets: [], taken: emptyTaken() }
    sets.set(gameId, set)
  }
  for (let k = set.sheets.length / 2; k < pairs; k++) {
    const pair = generatePair(seeded(`${gameId}:loto2:${k}`), set.taken)
    addTaken(set.taken, pair)
    set.sheets.push(...pair)
  }
  return set.sheets.slice(0, pairs * 2)
}
const sets = new Map<string, { sheets: Sheet[]; taken: Taken }>()

/** Bộ giấy đủ cho cả bàn: 10 bộ màu (20 tờ), đông người thì thêm để ai cũng mua đủ tối đa. */
export const pairsFor = (players: number, max: number) => Math.max(10, Math.ceil((players * max) / 2))

/** Màu / tên tờ thứ `index`. */
export const sheetColor = (index: number) => SHEET_COLORS[Math.floor(index / 2) % SHEET_COLORS.length]
/** Màu dấu đánh số: tương phản với màu tờ (đối màu, đậm để nổi trên nền giấy trắng). */
export function markColor(index: number): string {
  const hex = sheetColor(index)
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  const hue = (Math.round(h * 60) + 180 + 360) % 360
  return `hsl(${hue} 85% 38%)`
}
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
