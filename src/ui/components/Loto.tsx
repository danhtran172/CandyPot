import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { fullRows, ownerOf, type LotoState } from '../../core/games/lotoPlay'
import { COLS, markColor, rowNumbers, sheetColor, sheetName, type Sheet } from '../../core/games/lotoSheets'
import type { ID, Player } from '../../core/types'
import { Button } from './kit'
import { useLandscape } from '../landscape'
import bagIcon from '../../assets/loto-bag.webp'

/** Cách đánh dấu số trên tờ. */
export type Marker = 'cross' | 'chalk' | 'seed'
const MARKERS: [Marker, string][] = [
  ['cross', 'Dấu X'],
  ['chalk', 'Phấn'],
  ['seed', 'Hạt dưa'],
]
const MARKER_KEY = 'candypot:loto-marker'
function readMarker(): Marker {
  try {
    const v = localStorage.getItem(MARKER_KEY) as Marker | null
    return v && MARKERS.some(([m]) => m === v) ? v : 'cross'
  } catch {
    return 'cross'
  }
}
function saveMarker(m: Marker) {
  try {
    localStorage.setItem(MARKER_KEY, m)
  } catch {
    /* không nhớ được thì thôi */
  }
}

/** Số đã đánh trên máy này (đánh tay, mỗi ván một danh sách). */
function useMarks(roundId: string, me: ID | null) {
  const key = `candypot:loto-marks:${roundId}:${me ?? ''}`
  const [marks, setMarks] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]') as number[]
    } catch {
      return []
    }
  })
  const save = (next: number[]) => {
    setMarks(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      /* chế độ riêng tư */
    }
  }
  return [marks, save] as const
}

/**
 * Dấu đánh trên một số, màu tương phản với màu tờ.
 * - Dấu X: hai nét chéo. - Phấn: một nét gạch xéo, nét phấn nhòe. - Hạt dưa: hạt đen đặt lên số.
 * Vừa đánh (`fresh`) thì nét được vẽ ra / hạt rơi xuống cho rõ.
 */
function Mark({ n, kind, color, fresh }: { n: number; kind: Marker; color: string; fresh?: boolean }) {
  if (kind === 'seed') {
    const rot = (n * 73) % 360
    return (
      <svg
        aria-hidden
        viewBox="0 0 40 40"
        className={`pointer-events-none absolute inset-[8%] z-[2] size-[84%] drop-shadow-[0_2px_2px_rgb(0_0_0/0.55)] ${fresh ? 'mark-drop' : ''}`}
        style={{ rotate: `${rot}deg` }}
      >
        <defs>
          <radialGradient id="seed" cx="0.38" cy="0.32" r="0.75">
            <stop offset="0" stopColor="#5a3a30" />
            <stop offset="0.55" stopColor="#1c0d0a" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
        </defs>
        {/* Viền sáng mỏng quanh hạt để nổi trên giấy và trên số */}
        <path
          d="M20 3 C30 11 32 24 27 33 C24 39 16 39 13 33 C8 24 10 11 20 3 Z"
          fill="none"
          stroke="#fffaf0"
          strokeWidth="3.2"
          strokeOpacity="0.9"
        />
        <path d="M20 3 C30 11 32 24 27 33 C24 39 16 39 13 33 C8 24 10 11 20 3 Z" fill="url(#seed)" stroke="#8a3b2c" strokeWidth="1.4" />
        {/* Gờ giữa hạt + vệt bóng */}
        <path d="M20 9 C22 17 22 26 20 33" fill="none" stroke="#a0533f" strokeOpacity="0.55" strokeWidth="1.2" />
        <path d="M16 12 C13.5 18 13.5 24 15.5 29" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }
  const tilt = ((n * 37) % 13) - 6
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 40"
      className={`pointer-events-none absolute inset-0 z-[2] size-full ${fresh ? 'mark-draw' : ''}`}
      style={{ rotate: `${tilt}deg` }}
    >
      {kind === 'cross' ? (
        <>
          <path d="M8 8 L32 32" pathLength={100} stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <path
            d="M32 8 L8 32"
            pathLength={100}
            stroke={color}
            strokeWidth="4.5"
            strokeLinecap="round"
            style={{ animationDelay: '0.12s' }}
          />
        </>
      ) : (
        <path
          d="M5 31 C14 25 24 17 35 9"
          pathLength={100}
          fill="none"
          stroke={color}
          strokeOpacity="0.88"
          strokeWidth="6.5"
          strokeLinecap="round"
          filter="url(#chalk)"
        />
      )}
    </svg>
  )
}

/** Bộ lọc nét phấn — vẽ một lần trong trang. */
function ChalkFilter() {
  return (
    <svg aria-hidden className="absolute size-0">
      <filter id="chalk">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
      </filter>
    </svg>
  )
}

/**
 * Một tờ lô tô: 9 hàng × 9 cột, ô trống tô màu của tờ, ô số nền kem.
 * Chạm số đã gọi để đánh / bỏ đánh; số chưa gọi thì báo (lắc ô).
 */
export function SheetCard({
  sheet,
  index,
  marks,
  called,
  marker,
  onMark,
  onWarn,
  winRow,
  small,
  freshMark,
  hint,
}: {
  sheet: Sheet
  index: number
  marks?: number[]
  called?: number[]
  marker?: Marker
  onMark?: (n: number) => void
  onWarn?: (n: number) => void
  /** Hàng kinh — tô sáng. */
  winRow?: number
  /** Bản thu nhỏ (bảng chọn tờ / tờ phía sau). */
  small?: boolean
  /** Số vừa đánh — chạy hiệu ứng gạch. */
  freshMark?: number
  /** Số vừa gọi mà chưa đánh — nháy nhẹ để nhắc. */
  hint?: number
}) {
  const color = sheetColor(index)
  // Màu ô trống pha với màu giấy cho chìm, như mực in trên giấy
  const muted = `color-mix(in srgb, ${color} 62%, #b9ab8f)`
  const ink = markColor(index)
  const [shake, setShake] = useState<number | null>(null)
  /** Ô số: nền trắng ngà, số đen to đậm (kiểu tờ in) — hàng kinh nền vàng. */
  const numCell = (win: boolean) =>
    `relative grid place-items-center bg-[#f7f0e1] font-display font-extrabold leading-none tracking-tighter text-[#1a1a1a] ${
      small ? 'h-2 text-[0px]' : 'aspect-[3/4] text-[15px] land:text-[12px]'
    } ${win ? '!bg-lemon' : ''}`
  /** Dải chữ trang trí giữa các khối, như tờ in. */
  const band = (text: string, italic?: boolean) =>
    !small && (
      <div className={`truncate py-0.5 text-center text-[10px] font-bold tracking-wide land:text-[9px] ${italic ? 'italic' : 'uppercase'}`} style={{ color: muted }}>
        {text}
      </div>
    )
  return (
    // Không viền: tờ giấy ngà, các khối kẻ ô đen mảnh; phủ vân giấy lên cả tờ
    <div className={`relative isolate overflow-hidden bg-[#f7f0e1] shadow-lg ${small ? 'rounded p-0.5' : 'rounded-md px-1 pb-0.5'}`}>
      {band(`CandyPot · Tờ ${sheetName(index)}`)}
      {[0, 1, 2].map((b) => (
        <div key={b}>
          <div className="grid gap-px bg-[#1a1a1a] p-px" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {[0, 1, 2].flatMap((i) =>
              sheet[b * 3 + i].map((n, c) => {
                const row = b * 3 + i
                const marked = n !== null && !!marks?.includes(n)
                const win = winRow === row
                return n === null ? (
                  // Ô trống: chỉ tô màu của tờ (màu chìm)
                  <span key={`${row}-${c}`} className={small ? 'h-2' : 'aspect-[3/4]'} style={{ background: muted } as CSSProperties} />
                ) : !onMark || small ? (
                  // Chỉ để xem (bảng mua tờ / tờ phía sau): không bấm được
                  <span key={`${row}-${c}`} className={numCell(win)}>
                    {n}
                    {marked && !small && <Mark n={n} kind={marker ?? 'cross'} color={ink} />}
                  </span>
                ) : (
                  <button
                    key={`${row}-${c}`}
                    type="button"
                    aria-label={`Số ${n}${marked ? ' — đã đánh' : ''}`}
                    aria-pressed={marked}
                    onAnimationEnd={() => setShake(null)}
                    onClick={() => {
                      if (called && !called.includes(n) && !marked) {
                        setShake(n)
                        return onWarn?.(n)
                      }
                      onMark(n)
                    }}
                    className={`${numCell(win)} ${shake === n ? 'loto-shake' : ''} ${marked && freshMark === n ? 'mark-pop' : ''} ${!marked && hint === n ? 'loto-hint' : ''}`}
                  >
                    {n}
                    {marked && <Mark n={n} kind={marker ?? 'cross'} color={ink} fresh={freshMark === n} />}
                  </button>
                )
              }),
            )}
          </div>
          {b === 0 && band('Lô tô · vui là chính')}
          {b === 1 && band('Phúc lộc đầy nhà', true)}
        </div>
      ))}
      {band('Lô tô CandyPot')}
      {/* Vân giấy nằm dưới dấu đánh (dấu vẫn đậm, rõ) */}
      <span aria-hidden className="paper-grain pointer-events-none absolute inset-0 z-[1]" />
    </div>
  )
}

/**
 * Mua tờ: xem từng tờ (hiện đủ số), lướt / bấm ‹ › hoặc chạm màu để chuyển tờ, một nút để mua.
 * Tờ của mình thì Bỏ chọn; mục "Đã chọn" bên dưới liệt kê màu + số tờ, chạm ✕ để bỏ. Tờ người khác đã mua thì không mua được.
 * Mỗi thao tác ghi ngay (cả bàn thấy liền).
 */
export function SheetPicker({
  papers,
  loto,
  me,
  max,
  price,
  players,
  onSave,
  onClose,
}: {
  papers: Sheet[]
  loto: LotoState | undefined
  me: ID
  max: number
  price: number
  players: Record<ID, Player>
  onSave: (ids: number[]) => string[]
  onClose: () => void
}) {
  const state = loto ?? { sheets: {}, caller: null, called: [] }
  const mine = state.sheets[me] ?? []
  const [at, setAt] = useState(
    () =>
      mine[0] ??
      Math.max(
        0,
        papers.findIndex((_, i) => !ownerOf(state, i, me)),
      ),
  )
  const [error, setError] = useState<string | null>(null)
  const swipe = useRef<number | null>(null)
  const owner = ownerOf(state, at, me)
  const isMine = mine.includes(at)
  const go = (d: number) => {
    setError(null)
    setAt((i) => (i + d + papers.length) % papers.length)
  }
  const save = (ids: number[]) => {
    const errors = onSave(ids)
    setError(errors[0] ?? null)
  }
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mua tờ lô tô"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70" onClick={onClose} />
      <div className="pop no-scrollbar relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-x-hidden overflow-y-auto rounded-t-3xl border border-line/60 bg-plum p-4 sm:rounded-3xl">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display flex-1 text-xl font-extrabold">Mua tờ</h2>
          <span className="text-sm">
            Đã mua <b className="text-lemon">{mine.length}</b>/{max} · <b className="num text-lemon">{mine.length * price}</b> kẹo
          </span>
        </div>
        {/* Chọn nhanh tờ theo màu: mỗi màu 2 tờ (cặp đủ 90 số) */}
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {papers.map((_, i) => {
            const who = ownerOf(state, i, me)
            const own = mine.includes(i)
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setError(null)
                  setAt(i)
                }}
                aria-label={`Tờ ${sheetName(i)}${own ? ' — của bạn' : who ? ` — ${players[who]?.name} đã mua` : ''}`}
                aria-current={i === at}
                className={`relative grid size-8 shrink-0 place-items-center rounded-lg text-xs font-extrabold text-white transition ${
                  i === at ? 'scale-110 ring-2 ring-cream' : ''
                } ${who ? 'brightness-50 saturate-50' : ''}`}
                style={{ background: sheetColor(i) }}
              >
                {(i % 2) + 1}
                {own && (
                  <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-lemon text-[9px] text-night">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {/*
          Băng tờ: tờ đang xem ở giữa, hai tờ trước bên trái và hai tờ sau bên phải (nhỏ dần, tối dần, nằm sau) — chạm tờ bên cạnh
          để chuyển, lướt ngang cũng được. Các tờ trượt mượt sang chỗ mới khi đổi tờ.
        */}
        <div
          className="relative mt-2 grid touch-pan-y overflow-hidden py-2"
          onPointerDown={(e) => (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            const x0 = swipe.current
            swipe.current = null
            if (x0 !== null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1)
          }}
        >
          {papers.map((sheet, i) => {
            const n = papers.length
            // Khoảng cách có dấu tới tờ đang xem (vòng tròn)
            const d = ((((i - at) % n) + n + Math.floor(n / 2)) % n) - Math.floor(n / 2)
            if (Math.abs(d) > 2) return null
            const far = Math.abs(d)
            const who = ownerOf(state, i, me)
            return (
              <div
                key={i}
                role={d ? 'button' : undefined}
                tabIndex={d ? 0 : undefined}
                aria-label={d ? `Xem tờ ${sheetName(i)}` : undefined}
                onClick={d ? () => go(d) : undefined}
                onKeyDown={d ? (e) => e.key === 'Enter' && go(d) : undefined}
                className={`relative col-start-1 row-start-1 w-[15rem] justify-self-center rounded-md transition-[transform,filter] duration-300 ease-out ${d ? 'cursor-pointer' : ''}`}
                style={{
                  // Tờ bên cạnh: nhỏ dần, lấp ló hai bên, tối đi (vẫn đặc, không trong suốt)
                  transform: `translateX(${Math.sign(d) * [0, 52, 90][far]}px) scale(${[1, 0.86, 0.74][far]})`,
                  filter: far ? `brightness(${far === 1 ? 0.5 : 0.35}) saturate(0.7)` : undefined,
                  boxShadow: far ? undefined : '0 10px 28px rgb(0 0 0 / 0.55)',
                  zIndex: 10 - far,
                }}
              >
                <div className={who && !d ? 'brightness-50 saturate-50' : ''}>
                  <SheetCard sheet={sheet} index={i} />
                </div>
                {!d && who && (
                  <span className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-2xl bg-night/90 px-3 py-2 text-center text-sm font-semibold">
                    {players[who]?.name} đã mua tờ này
                  </span>
                )}
                {!d && mine.includes(i) && (
                  <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-lemon text-sm font-extrabold text-night shadow-lg">
                    ✓
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            aria-label="Tờ trước"
            onClick={() => go(-1)}
            className="grid size-9 place-items-center rounded-full bg-night/70 text-xl"
          >
            ‹
          </button>
          <p className="flex-1 text-center text-[11px] text-muted">
            Tờ {at + 1}/{papers.length} · {price} kẹo một tờ · lướt ngang để xem tờ khác
          </p>
          <button
            type="button"
            aria-label="Tờ sau"
            onClick={() => go(1)}
            className="grid size-9 place-items-center rounded-full bg-night/70 text-xl"
          >
            ›
          </button>
        </div>
        {error && <p className="mt-1 text-center text-xs font-semibold text-berry">{error}</p>}
        {/* Hành động cho tờ đang xem */}
        <div className="mt-2 flex flex-wrap gap-2 border-t border-line/60 pt-3">
          {owner ? (
            <p className="flex-1 self-center text-center text-sm text-muted">Tờ này đã có người mua — xem tờ khác.</p>
          ) : isMine ? (
            <Button variant="danger" className="flex-1" onClick={() => save(mine.filter((x) => x !== at))}>
              Bỏ chọn tờ này (trả lại {price} kẹo)
            </Button>
          ) : mine.length < max ? (
            <Button variant="primary" className="font-display flex-1 text-lg" onClick={() => save([...mine, at])}>
              Mua tờ này · {price} kẹo
            </Button>
          ) : (
            <p className="flex-1 self-center text-center text-xs text-muted">Đã đủ {max} tờ — bỏ chọn một tờ bên dưới để mua tờ này.</p>
          )}
          {/* Đã chọn: màu + số tờ; chạm ✕ để bỏ chọn, chạm tên để xem lại tờ */}
          <div className="basis-full">
            <p className="text-xs font-semibold text-muted">
              Đã chọn {mine.length}/{max}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {mine.length ? (
                mine.map((m) => (
                  <span key={m} className="flex items-center overflow-hidden rounded-full border border-line/60 bg-night/60 text-xs font-semibold">
                    <button type="button" onClick={() => setAt(m)} className="flex items-center gap-1.5 py-1 pr-1 pl-1">
                      <span className="grid size-5 place-items-center rounded-full text-[10px] font-extrabold text-white" style={{ background: sheetColor(m) }}>
                        {(m % 2) + 1}
                      </span>
                      {sheetName(m)}
                    </button>
                    <button
                      type="button"
                      aria-label={`Bỏ chọn tờ ${sheetName(m)}`}
                      onClick={() => save(mine.filter((x) => x !== m))}
                      className="grid size-7 place-items-center text-sm text-berry"
                    >
                      ✕
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted">Chưa chọn tờ nào.</span>
              )}
            </div>
          </div>
          <Button className="basis-full" onClick={onClose}>
            Xong
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Quả số lô tô. */
export function Ball({ n, big, mid, fresh }: { n: number; big?: boolean; mid?: boolean; fresh?: boolean }) {
  // Kiểu bi xổ số: vành màu, mặt kem bóng, số cùng màu vành (màu theo số)
  const ring = BALL_COLORS[n % BALL_COLORS.length]
  return (
    <span
      className={`num relative grid shrink-0 place-items-center rounded-full shadow-[0_2px_4px_rgb(0_0_0/0.35)] ${big ? 'size-14' : mid ? 'size-11' : 'size-8'} ${
        fresh ? 'ball-in' : ''
      }`}
      style={{
        background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${ring} 55%, white), ${ring} 55%, color-mix(in srgb, ${ring} 70%, black))`,
      }}
    >
      <span
        className={`absolute rounded-full bg-[radial-gradient(circle_at_38%_30%,#fffef6,#f7eccd_60%,#e6d6a8)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] ${
          big || mid ? 'inset-[4px]' : 'inset-[3px]'
        }`}
      />
      <span
        className={`font-display relative leading-none font-extrabold ${big ? 'text-2xl' : mid ? 'text-lg' : 'text-[13px]'}`}
        style={{ color: ring }}
      >
        {n}
      </span>
    </span>
  )
}
/** Hai màu bi như bảng dò: đỏ (số lẻ) và xanh lá (số chẵn). */
const BALL_COLORS = ['#2b9348', '#d62828']

/** Bảng tất cả số đã gọi (mới nhất trước) — như bảng dò kết quả. */
function CalledBoard({ called, onClose }: { called: number[]; onClose: () => void }) {
  const list = [...called].reverse()
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Các số đã gọi"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70" onClick={onClose} />
      <div className="pop relative max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line/60 bg-plum p-4 sm:rounded-3xl">
        <div className="flex items-baseline">
          <h2 className="font-display flex-1 text-xl font-extrabold">Số đã gọi</h2>
          <span className="num text-sm text-muted">{called.length}/90</span>
        </div>
        <div className="mt-3 grid grid-cols-6 justify-items-center gap-2">
          {list.map((n, i) => (
            <span key={n} className={i === 0 ? 'rounded-full ring-2 ring-lemon ring-offset-2 ring-offset-plum' : ''}>
              <Ball n={n} mid />
            </span>
          ))}
        </div>
        {!list.length && <p className="py-6 text-center text-sm text-muted">Chưa gọi số nào.</p>}
        <Button className="mt-4 w-full" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </div>
  )
}

/** Cái túi đựng số. */
function Bag({ shaking, small }: { shaking: boolean; small?: boolean }) {
  return (
    <img
      src={bagIcon}
      alt=""
      aria-hidden
      draggable={false}
      className={`${small ? 'size-11' : 'size-16'} drop-shadow-[0_4px_6px_rgb(0_0_0/0.4)] ${shaking ? 'loto-bag-shake' : ''}`}
    />
  )
}

/** Nhớ trạng thái thu / mở tờ lô tô trên máy này. */
const FOLD_KEY = 'candypot:loto-folded'

/** Số vừa gọi chưa đánh thì sau bấy nhiêu ms bắt đầu nháy nhắc. */
const HINT_DELAY_MS = 3000

/** Lắc xong phải chờ ít nhất bấy nhiêu ms mới lắc tiếp (chốt an toàn, khỏi lắc liền tay ra hai số). */
const SHAKE_GAP_MS = 5000
/** Còn đang trong khoảng chờ sau số vừa gọi không — `count` = số đã gọi. */
function useShakeReady(count: number) {
  // Số đã gọi mà khoảng chờ sau nó đã hết — có số mới thì phải chờ thêm SHAKE_GAP_MS
  const [doneFor, setDoneFor] = useState(count)
  useEffect(() => {
    const t = window.setTimeout(() => setDoneFor(count), SHAKE_GAP_MS)
    return () => window.clearTimeout(t)
  }, [count])
  return doneFor === count
}

/** Túi số cho người gọi: giữ để lắc, thả ra là ra một số (vừa ra số thì nghỉ vài giây). */
function BagButton({ onShake, small, ready }: { onShake: () => void; small?: boolean; ready: boolean }) {
  const [shaking, setShaking] = useState(false)
  return (
    <button
      type="button"
      aria-label="Giữ để lắc túi, thả ra để ra số"
      className="shrink-0 touch-none select-none"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setShaking(true)
      }}
      onPointerUp={() => {
        if (shaking && ready) onShake()
        setShaking(false)
      }}
      onPointerCancel={() => setShaking(false)}
      onKeyDown={(e) => e.key === 'Enter' && ready && onShake()}
    >
      {/* Đang nghỉ giữa hai lần lắc: túi hơi mờ */}
      <span className={`block transition-opacity ${ready ? '' : 'opacity-60'}`}>
        <Bag shaking={shaking} small={small} />
      </span>
    </button>
  )
}

/**
 * Giữa bàn: số vừa gọi (quả to), đã gọi bao nhiêu, người gọi. Người gọi (lắc thủ công): giữ túi để lắc, thả ra là ra số.
 */
export function LotoCenter({
  loto,
  players,
  me,
  auto,
  outside,
  canPickCaller,
  onShake,
  onPickCaller,
}: {
  loto: LotoState
  players: Record<ID, Player>
  me: ID | null
  auto: boolean
  /** Số gọi ở ngoài đời: không có túi, không có số trên app. */
  outside?: boolean
  canPickCaller: boolean
  onShake: () => void
  onPickCaller: () => void
}) {
  const last = loto.called[loto.called.length - 1]
  const canShake = !!me && loto.caller === me && !auto && !loto.winner && loto.called.length < 90
  const shakeReady = useShakeReady(loto.called.length)
  if (outside)
    return (
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-sm font-semibold">Số gọi ở ngoài</span>
        <span className="text-[11px] text-muted">Nghe kêu số rồi tự đánh trên tờ</span>
      </div>
    )
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        {canShake ? <BagButton onShake={onShake} ready={shakeReady} /> : <Bag shaking={false} />}
        {last !== undefined ? <Ball key={last} n={last} big fresh /> : <span className="text-xs text-muted">Chưa gọi số</span>}
      </div>
      <span className="text-[11px] text-muted">Đã gọi {loto.called.length}/90</span>
      {canShake && <span className="text-[10px] font-semibold text-lemon">Giữ túi để lắc · thả ra là ra số</span>}
      <button
        type="button"
        onClick={onPickCaller}
        disabled={!canPickCaller}
        className="rounded-full bg-night/60 px-2.5 py-1 text-xs disabled:opacity-90"
        aria-label={canPickCaller ? 'Đổi người gọi số' : 'Người gọi số'}
      >
        Người gọi: <b>{loto.caller ? players[loto.caller]?.name : '—'}</b>
        {auto && <span className="ml-1 text-sky">· máy gọi</span>}
      </button>
    </div>
  )
}

/**
 * Thanh dưới đáy lúc chơi: các số vừa gọi, tờ của mình (nhiều tờ thì một tờ ở trước, các tờ kia nhỏ, mờ, nằm sau),
 * chọn phấn / hạt dưa, Kinh! khi đủ một hàng.
 */
export function LotoPanel({
  roundId,
  loto,
  papers,
  me,
  players,
  isHost,
  onClaim,
  onNext,
  onWarn,
  canShake,
  onShake,
  outside,
  menu,
}: {
  roundId: string
  loto: LotoState
  papers: Sheet[]
  me: ID | null
  players: Record<ID, Player>
  isHost: boolean
  onClaim: (sheet: number, row: number) => void
  onNext: () => void
  onWarn: (msg: string) => void
  /** Mình là người gọi (lắc thủ công): túi số nằm ngay đầu khung. */
  canShake: boolean
  onShake: () => void
  /** Số gọi ở ngoài đời: không có dãy số gọi, đánh tự do, đủ hàng là Kinh. */
  outside?: boolean
  menu: ReactNode
}) {
  const mine = (me && loto.sheets[me]) || []
  const [front, setFront] = useState(0)
  const current = mine[Math.min(front, mine.length - 1)]
  const [marks, setMarks] = useMarks(roundId, me)
  const [marker, setMarker] = useState<Marker>(readMarker)
  const [fresh, setFresh] = useState<number | undefined>()
  const [board, setBoard] = useState(false)
  // Thu tờ lại (chỉ còn số gọi + nút) — nhớ trên máy này
  const [folded, setFolded] = useState(() => {
    try {
      return localStorage.getItem(FOLD_KEY) === '1'
    } catch {
      return false
    }
  })
  const fold = (v: boolean) => {
    setFolded(v)
    try {
      localStorage.setItem(FOLD_KEY, v ? '1' : '0')
    } catch {
      /* không nhớ được thì thôi */
    }
  }
  // Nhắc số vừa gọi: sau 3 giây mà chưa đánh thì ô số đó nháy nhẹ (tờ phụ có số đó thì nháy viền)
  const last = loto.called[loto.called.length - 1]
  const [hintFor, setHintFor] = useState<number | undefined>()
  useEffect(() => {
    if (last === undefined) return
    const t = window.setTimeout(() => setHintFor(last), HINT_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [last])
  const hint = !outside && hintFor === last && last !== undefined && !marks.includes(last) && !loto.winner ? last : undefined
  const shakeReady = useShakeReady(loto.called.length)
  const recent = loto.called.slice(-7).reverse()
  /** Hàng đánh đủ 5 số (đã gọi) — kinh được. */
  const ready = (() => {
    for (const i of mine) {
      const rows = fullRows(papers[i], marks).filter((r) => outside || rowNumbers(papers[i], r).every((n) => loto.called.includes(n)))
      if (rows.length) return { sheet: i, row: rows[0] }
    }
    return null
  })()
  const winner = loto.winner

  // Vừa có hàng kinh được → rung nhẹ nhắc
  const buzzed = useRef(false)
  useEffect(() => {
    if (ready && !buzzed.current) {
      buzzed.current = true
      navigator.vibrate?.([60, 40, 60])
    }
  }, [ready])

  const land = useLandscape()
  const markOn = winner
    ? undefined
    : (n: number) => {
        const on = !marks.includes(n)
        setFresh(on ? n : undefined)
        setMarks(on ? [...marks, n] : marks.filter((x) => x !== n))
      }
  const markerPicker = (
    <div role="radiogroup" aria-label="Đánh số bằng" className="flex shrink-0 rounded-full border border-line/60 bg-night/70 p-0.5 text-[11px] font-bold whitespace-nowrap">
      {MARKERS.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={marker === v}
          onClick={() => {
            setMarker(v)
            saveMarker(v)
          }}
          className={`rounded-full px-2 py-0.5 ${marker === v ? 'bg-lemon text-night' : 'text-muted'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
  const pending = loto.pending
  const action = pending && !winner ? (
    <p className={`flex-1 rounded-2xl px-2 py-2 text-center text-xs font-semibold ${pending.id === me ? 'animate-pulse bg-lemon/15 text-lemon' : 'text-muted'}`}>
      {pending.id === me ? 'Đã báo KINH — chờ host xác nhận…' : `${players[pending.id]?.name} báo kinh — chờ host xác nhận`}
    </p>
  ) : winner ? (
    isHost ? (
      <Button variant="primary" className="font-display flex-1 text-lg" onClick={onNext}>
        Ván mới
      </Button>
    ) : (
      <p className="flex-1 text-center text-xs text-muted">{players[winner.id]?.name} kinh · chờ host mở ván mới</p>
    )
  ) : ready ? (
    <div className="flex flex-1 flex-col gap-1">
      {loto.rejected === me && <p className="text-center text-[11px] font-semibold text-berry">Host chưa công nhận lần kinh vừa rồi.</p>}
      <Button variant="primary" className="font-display loto-kinh text-xl" onClick={() => onClaim(ready.sheet, ready.row)}>
        KINH!
      </Button>
    </div>
  ) : null

  // Xoay ngang: cột trái gom số gọi + nút, bên phải bày đủ các tờ cạnh nhau (đánh trực tiếp trên tờ nào cũng được)
  if (land) {
    const n = Math.max(1, mine.length)
    return (
      <section
        data-guide="cards"
        className="mb-1 flex h-[calc(100dvh-3.5rem)] gap-3 rounded-3xl border border-line/60 bg-night/95 p-2 backdrop-blur"
      >
        <ChalkFilter />
        {board && <CalledBoard called={loto.called} onClose={() => setBoard(false)} />}
        <div className="flex w-36 shrink-0 flex-col gap-2">
          {outside ? (
            <p className="text-xs text-muted">Số gọi ở ngoài — nghe kêu số rồi chạm để đánh</p>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                {canShake && <BagButton onShake={onShake} small ready={shakeReady} />}
                {recent.length ? <Ball key={recent[0]} n={recent[0]} big fresh /> : <span className="text-xs text-muted">Chờ gọi số…</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {recent.slice(1).map((n2) => (
                  <Ball key={n2} n={n2} />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setBoard(true)}
                aria-label="Xem tất cả số đã gọi"
                className="num self-start rounded-full border border-line/60 px-2 py-1 text-[11px] text-muted"
              >
                {loto.called.length}/90
              </button>
            </>
          )}
          {markerPicker}
          <span className="flex-1" />
          {action}
          <div className="flex justify-start">{menu}</div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {mine.length ? (
            mine.map((i) => (
              <div
                key={i}
                className="shrink-0"
                style={{ width: `min(calc((100dvh - 5rem) / 1.45), calc((100% - ${(n - 1) * 0.5}rem) / ${n}))` }}
              >
                <SheetCard
                  sheet={papers[i]}
                  index={i}
                  marks={marks}
                  called={outside ? undefined : loto.called}
                  marker={marker}
                  freshMark={fresh}
                  hint={hint}
                  winRow={winner?.id === me && winner.sheet === i ? winner.row : undefined}
                  onMark={markOn}
                  onWarn={(x) => onWarn(`Số ${x} chưa được gọi — chưa đánh được.`)}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Bạn không mua tờ nào ván này.</p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section data-guide="cards" className="mb-2 rounded-3xl border border-line/60 bg-night/90 px-3 pt-2 pb-2 backdrop-blur">
      <ChalkFilter />
      {board && <CalledBoard called={loto.called} onClose={() => setBoard(false)} />}
      {/* Túi số (người gọi) + số vừa gọi: mới nhất to, bên trái */}
      <div className="flex items-center gap-2">
        {outside ? (
          <span className="flex-1 text-xs text-muted">Số gọi ở ngoài — nghe kêu số rồi chạm để đánh</span>
        ) : (
          <>
            {canShake && <BagButton onShake={onShake} small ready={shakeReady} />}
            {recent.length ? (
              <>
                <Ball key={recent[0]} n={recent[0]} big fresh />
                <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                  {recent.slice(1).map((n) => (
                    <Ball key={n} n={n} />
                  ))}
                </div>
              </>
            ) : (
              <span className="flex-1 text-xs text-muted">{canShake ? 'Giữ túi để lắc, thả ra là ra số' : 'Chờ gọi số…'}</span>
            )}
          </>
        )}
        {!outside && (
          <button
            type="button"
            onClick={() => setBoard(true)}
            aria-label="Xem tất cả số đã gọi"
            className="num shrink-0 rounded-full border border-line/60 px-2 py-1 text-[11px] text-muted"
          >
            {loto.called.length}/90
          </button>
        )}
        {mine.length > 0 && (
          <button
            type="button"
            onClick={() => fold(!folded)}
            aria-expanded={!folded}
            // Đang thu mà có số vừa gọi nằm trên tờ → nút nháy viền nhắc
            className={`shrink-0 rounded-full border border-line/60 bg-night/70 px-2 py-1 text-[11px] font-semibold ${folded && hint !== undefined && mine.some((i) => papers[i].some((r) => r.includes(hint))) ? 'loto-hint-border' : ''}`}
          >
            {folded ? 'Mở tờ ▴' : 'Thu tờ ▾'}
          </button>
        )}
      </div>

      {mine.length && folded ? null : mine.length ? (
        <>
          {/* Chọn tờ đang xem + phấn / hạt dưa */}
          <div className="mt-2 flex items-center gap-1.5">
            {mine.length > 1 &&
              mine.map((i, k) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFront(k)}
                  aria-pressed={i === current}
                  aria-label={`Xem tờ ${sheetName(i)}`}
                  title={sheetName(i)}
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold text-white transition ${
                    i === current ? 'ring-2 ring-cream' : 'opacity-50'
                  }`}
                  style={{ background: sheetColor(i) }}
                >
                  {(i % 2) + 1}
                </button>
              ))}
            <span className="flex-1" />
            <div
              role="radiogroup"
              aria-label="Đánh số bằng"
              className="flex shrink-0 rounded-full border border-line/60 bg-night/70 p-0.5 text-[11px] font-bold whitespace-nowrap"
            >
              {MARKERS.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={marker === v}
                  onClick={() => {
                    setMarker(v)
                    saveMarker(v)
                  }}
                  className={`rounded-full px-2 py-0.5 ${marker === v ? 'bg-lemon text-night' : 'text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Các tờ xếp ngang: tờ đang xem ở giữa (to, rõ); tờ phụ nhỏ hơn, mờ, lấp ló phía sau bên phải — chạm để đưa lên */}
          <div className="relative mt-2 flex justify-center">
            {mine
              .map((i, k) => ({ i, k }))
              .filter(({ i }) => i !== current)
              .map(({ i, k }, depth) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`Xem tờ ${sheetName(i)}`}
                  onClick={() => setFront(k)}
                  onKeyDown={(e) => e.key === 'Enter' && setFront(k)}
                  className="absolute top-3 left-[18%] w-[64%] origin-left cursor-pointer transition-transform"
                  style={{ transform: `translateX(${(depth + 1) * 22}%) scale(${1 - (depth + 1) * 0.08})`, zIndex: 5 - depth }}
                >
                  <div className={`rounded-md ${hint !== undefined && papers[i].some((r) => r.includes(hint)) ? 'loto-hint-border' : ''}`}>
                    {/* Tờ phụ: tối đi chứ không trong suốt */}
                    <div className="brightness-50 saturate-[0.7]">
                      <SheetCard sheet={papers[i]} index={i} marks={marks} marker={marker} />
                    </div>
                  </div>
                </div>
              ))}
            <div className={`relative z-10 ${mine.length > 1 ? 'w-[64%]' : 'w-[72%]'}`}>
              <SheetCard
                key={current}
                sheet={papers[current]}
                index={current}
                marks={marks}
                called={outside ? undefined : loto.called}
                marker={marker}
                freshMark={fresh}
                hint={hint}
                winRow={winner?.id === me && winner.sheet === current ? winner.row : undefined}
                onMark={
                  winner
                    ? undefined
                    : (n) => {
                        const on = !marks.includes(n)
                        setFresh(on ? n : undefined)
                        setMarks(on ? [...marks, n] : marks.filter((x) => x !== n))
                      }
                }
                onWarn={(n) => onWarn(`Số ${n} chưa được gọi — chưa đánh được.`)}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="py-4 text-center text-sm text-muted">Bạn không mua tờ nào ván này — xem số gọi ở trên.</p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {menu}
        {action ?? (
          <p className="flex-1 text-center text-[11px] text-muted">
            {loto.rejected === me && <b className="text-berry">Host chưa công nhận lần kinh vừa rồi. </b>}
            {outside ? 'Chạm số để đánh' : 'Chạm số đã gọi để đánh'} · đủ 5 số một hàng là Kinh
          </p>
        )}
      </div>
    </section>
  )
}

/** Gọi ở ngoài: có người báo kinh → host đối chiếu hàng đó với số đã kêu rồi xác nhận. */
export function LotoJudge({
  loto,
  papers,
  players,
  pot,
  onJudge,
}: {
  loto: LotoState
  papers: Sheet[]
  players: Record<ID, Player>
  pot: number
  onJudge: (ok: boolean) => void
}) {
  const p = loto.pending!
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Xác nhận kinh" className="fixed inset-0 z-[60] flex items-center justify-center px-5">
      <div className="absolute inset-0 bg-night/75" />
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-lemon bg-plum p-4 text-center shadow-[0_0_40px_rgb(255_210_63/0.35)]">
        <p className="font-display text-2xl font-extrabold text-lemon">{players[p.id]?.name} báo KINH!</p>
        <p className="text-xs text-muted">
          Tờ {sheetName(p.sheet)} · hàng {p.row + 1} — so với các số đã kêu rồi xác nhận
        </p>
        <div className="mt-3 flex justify-center gap-1.5">
          {rowNumbers(papers[p.sheet], p.row).map((n) => (
            <Ball key={n} n={n} mid />
          ))}
        </div>
        <div className="mx-auto mt-3 w-44">
          <SheetCard sheet={papers[p.sheet]} index={p.sheet} winRow={p.row} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" className="flex-1" onClick={() => onJudge(false)}>
            Sai, không tính
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => onJudge(true)}>
            Đúng · trao pot{pot ? ` ${pot}` : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Chúc mừng người kinh — cả bàn thấy (pháo giấy + hàng thắng). */
export function LotoWinner({
  loto,
  papers,
  players,
  pot,
  me,
  onClose,
}: {
  loto: LotoState
  papers: Sheet[]
  players: Record<ID, Player>
  pot: number
  me: ID | null
  onClose: () => void
}) {
  const w = loto.winner!
  const confetti = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 13) % 20) / 10,
        dur: 2.4 + ((i * 7) % 10) / 10,
        color: ['#ffd23f', '#ff5c7a', '#3ddc97', '#5cc8ff', '#a974f0', '#fff1e0'][i % 6],
        rot: (i * 53) % 360,
      })),
    [],
  )
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Có người kinh"
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
    >
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75" onClick={onClose} />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="loto-confetti absolute -top-4 block h-3 w-2 rounded-sm"
            style={{
              left: `${c.left}%`,
              background: c.color,
              animationDelay: `${c.delay}s`,
              animationDuration: `${c.dur}s`,
              rotate: `${c.rot}deg`,
            }}
          />
        ))}
      </div>
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-lemon bg-plum p-5 text-center shadow-[0_0_40px_rgb(255_210_63/0.45)]">
        <p className="font-display text-5xl font-extrabold tracking-wider text-lemon">KINH!</p>
        <p className="mt-2 text-lg">
          🎉 Chúc mừng <b className="text-cream">{w.id === me ? 'bạn' : players[w.id]?.name}</b>
        </p>
        <p className="text-xs text-muted">
          Tờ {sheetName(w.sheet)} · hàng {w.row + 1}
        </p>
        <div className="mt-3 flex justify-center gap-1.5">
          {rowNumbers(papers[w.sheet], w.row).map((n) => (
            <Ball key={n} n={n} />
          ))}
        </div>
        {pot > 0 && (
          <p className="mt-3 text-sm">
            Ăn cả pot <b className="num text-lemon">{pot}</b> kẹo
          </p>
        )}
        <Button variant="primary" className="mt-4 w-full" onClick={onClose}>
          Tuyệt!
        </Button>
      </div>
    </div>
  )
}
