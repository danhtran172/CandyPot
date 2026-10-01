import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { fullRows, ownerOf, type LotoState } from '../../core/games/lotoPlay'
import { COLS, markColor, rowNumbers, sheetColor, sheetName, type Sheet } from '../../core/games/lotoSheets'
import type { ID, Player } from '../../core/types'
import { Button } from './kit'

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
        className={`pointer-events-none absolute inset-[18%] size-[64%] drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)] ${fresh ? 'mark-drop' : ''}`}
        style={{ rotate: `${rot}deg` }}
      >
        <path d="M20 4 C29 12 31 24 26 33 C23 38 17 38 14 33 C9 24 11 12 20 4 Z" fill="#2a1414" stroke="#7a2e2e" strokeWidth="1.6" />
        <path d="M18 12 C15 18 15 25 17 30" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  const tilt = ((n * 37) % 13) - 6
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={`pointer-events-none absolute inset-0 size-full ${fresh ? 'mark-draw' : ''}`} style={{ rotate: `${tilt}deg` }}>
      {kind === 'cross' ? (
        <>
          <path d="M8 8 L32 32" pathLength={100} stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M32 8 L8 32" pathLength={100} stroke={color} strokeWidth="4.5" strokeLinecap="round" style={{ animationDelay: '0.12s' }} />
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
}) {
  const color = sheetColor(index)
  const ink = markColor(index)
  const [shake, setShake] = useState<number | null>(null)
  /** Ô số: nền trắng ngà, số đen to đậm (kiểu tờ in) — hàng kinh nền vàng. */
  const numCell = (win: boolean) =>
    `relative grid place-items-center bg-[#fffdf6] font-display font-extrabold leading-none tracking-tighter text-[#1a1a1a] ${
      small ? 'h-2 text-[0px]' : 'aspect-[3/4] text-[15px]'
    } ${win ? '!bg-lemon' : ''}`
  /** Dải chữ trang trí giữa các khối, như tờ in. */
  const band = (text: string, italic?: boolean) =>
    !small && (
      <div className={`py-0.5 text-center text-[10px] font-bold tracking-wide ${italic ? 'italic' : 'uppercase'}`} style={{ color }}>
        {text}
      </div>
    )
  return (
    // Không viền: tờ là nền giấy trắng, các khối kẻ ô đen mảnh
    <div className={`bg-[#fffdf6] shadow-lg ${small ? 'rounded p-0.5' : 'rounded-md px-1 pb-0.5'}`}>
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
                  // Ô trống: màu của tờ, hoa văn hình thoi nhỏ
                  <span
                    key={`${row}-${c}`}
                    className={small ? 'h-2' : 'aspect-[3/4]'}
                    style={{ background: `${ORNAMENT} center / 60% no-repeat, ${color}` } as CSSProperties}
                  />
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
                      if (!called?.includes(n) && !marked) {
                        setShake(n)
                        return onWarn?.(n)
                      }
                      onMark(n)
                    }}
                    className={`${numCell(win)} ${shake === n ? 'loto-shake' : ''} ${marked && freshMark === n ? 'mark-pop' : ''}`}
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
    </div>
  )
}

/** Hoa văn ô trống (hình thoi trắng nhỏ có chấm giữa) — một ảnh dùng chung. */
const ORNAMENT = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M10 2l8 8-8 8-8-8z' fill='none' stroke='white' stroke-opacity='.55' stroke-width='1.4'/><path d='M10 7l3 3-3 3-3-3z' fill='white' fill-opacity='.5'/></svg>",
)}")`

/**
 * Mua tờ: xem từng tờ (hiện đủ số), lướt / bấm ‹ › hoặc chạm màu để chuyển tờ, một nút để mua.
 * Tờ của mình thì Hoàn mua; đã đủ số tờ thì Đổi tờ đang xem lấy một tờ của mình. Tờ người khác đã mua thì không mua được.
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
  const [at, setAt] = useState(() => mine[0] ?? Math.max(0, papers.findIndex((_, i) => !ownerOf(state, i, me))))
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
    <div role="dialog" aria-modal="true" aria-label="Mua tờ lô tô" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70" onClick={onClose} />
      <div className="pop relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl border border-line/60 bg-plum p-4 sm:rounded-3xl">
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
                } ${who ? 'opacity-35' : ''}`}
                style={{ background: sheetColor(i) }}
              >
                {(i % 2) + 1}
                {own && <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-lemon text-[9px] text-night">✓</span>}
              </button>
            )
          })}
        </div>
        {/* Tờ đang xem — đủ số; lướt ngang để chuyển tờ */}
        <div
          className="relative mt-2 touch-pan-y"
          onPointerDown={(e) => (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            const x0 = swipe.current
            swipe.current = null
            if (x0 !== null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1)
          }}
        >
          <div className={`mx-auto max-w-[16rem] ${owner ? 'opacity-50' : ''}`}>
            <SheetCard key={at} sheet={papers[at]} index={at} />
          </div>
          {owner && (
            <span className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-night/90 px-3 py-2 text-center text-sm font-semibold">
              {players[owner]?.name} đã mua tờ này
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <button type="button" aria-label="Tờ trước" onClick={() => go(-1)} className="grid size-9 place-items-center rounded-full bg-night/70 text-xl">
            ‹
          </button>
          <p className="flex-1 text-center text-[11px] text-muted">
            Tờ {at + 1}/{papers.length} · {price} kẹo một tờ · lướt ngang để xem tờ khác
          </p>
          <button type="button" aria-label="Tờ sau" onClick={() => go(1)} className="grid size-9 place-items-center rounded-full bg-night/70 text-xl">
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
              Hoàn mua (trả lại {price} kẹo)
            </Button>
          ) : mine.length < max ? (
            <Button variant="primary" className="font-display flex-1 text-lg" onClick={() => save([...mine, at])}>
              Mua tờ này · {price} kẹo
            </Button>
          ) : null}
          {/* Đổi: tờ đang xem còn trống → đổi lấy một tờ của mình */}
          {!owner &&
            !isMine &&
            mine.map((m) => (
              <Button key={m} className="flex-1 text-sm whitespace-nowrap" onClick={() => save(mine.map((x) => (x === m ? at : x)))}>
                Đổi tờ {sheetName(m)} lấy tờ này
              </Button>
            ))}
          <Button className="basis-full" onClick={onClose}>
            Xong
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Quả số lô tô. */
export function Ball({ n, big, fresh }: { n: number; big?: boolean; fresh?: boolean }) {
  return (
    <span
      className={`num grid shrink-0 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff,#ffe9a8_45%,#f4b400)] font-extrabold text-night shadow-md ${
        big ? 'size-14 text-2xl' : 'size-7 text-xs'
      } ${fresh ? 'pop' : ''}`}
    >
      {n}
    </span>
  )
}

/** Cái túi đựng số (vẽ tay). */
function Bag({ shaking, small }: { shaking: boolean; small?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={`${small ? 'size-11' : 'size-16'} drop-shadow-[0_4px_6px_rgb(0_0_0/0.4)] ${shaking ? 'loto-bag-shake' : ''}`}>
      <path d="M22 16 C18 22 8 30 8 44 C8 56 18 60 32 60 C46 60 56 56 56 44 C56 30 46 22 42 16 Z" fill="#c8915a" stroke="#7a5230" strokeWidth="2" />
      <path d="M14 40 C24 44 40 44 50 40" fill="none" stroke="#7a5230" strokeOpacity="0.4" strokeWidth="2" />
      <path d="M20 16 C26 12 38 12 44 16" fill="none" stroke="#7a5230" strokeWidth="4" strokeLinecap="round" />
      <path d="M24 14 L18 6 M40 14 L46 6" stroke="#e8d3a8" strokeWidth="2" strokeLinecap="round" />
      <text x="32" y="47" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff1e0" opacity="0.9">
        1–90
      </text>
    </svg>
  )
}

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
  canPickCaller,
  onShake,
  onPickCaller,
}: {
  loto: LotoState
  players: Record<ID, Player>
  me: ID | null
  auto: boolean
  canPickCaller: boolean
  onShake: () => void
  onPickCaller: () => void
}) {
  const last = loto.called[loto.called.length - 1]
  const canShake = !!me && loto.caller === me && !auto && !loto.winner && loto.called.length < 90
  const shakeReady = useShakeReady(loto.called.length)
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
  menu: ReactNode
}) {
  const mine = (me && loto.sheets[me]) || []
  const [front, setFront] = useState(0)
  const current = mine[Math.min(front, mine.length - 1)]
  const [marks, setMarks] = useMarks(roundId, me)
  const [marker, setMarker] = useState<Marker>(readMarker)
  const [fresh, setFresh] = useState<number | undefined>()
  const shakeReady = useShakeReady(loto.called.length)
  const recent = loto.called.slice(-7).reverse()
  /** Hàng đánh đủ 5 số (đã gọi) — kinh được. */
  const ready = (() => {
    for (const i of mine) {
      const rows = fullRows(papers[i], marks).filter((r) => rowNumbers(papers[i], r).every((n) => loto.called.includes(n)))
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

  return (
    <section data-guide="cards" className="mb-2 rounded-3xl border border-line/60 bg-night/90 px-3 pt-2 pb-2 backdrop-blur">
      <ChalkFilter />
      {/* Túi số (người gọi) + số vừa gọi: mới nhất to, bên trái */}
      <div className="flex items-center gap-2">
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
        <span className="num shrink-0 text-[11px] text-muted">{loto.called.length}/90</span>
      </div>

      {mine.length ? (
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
          </div>
          {/* Các tờ xếp ngang: tờ đang xem bên phải (to, rõ); tờ phụ nhỏ hơn, mờ, lấp ló bên trái — chạm để đưa lên */}
          <div className="relative mt-2 flex justify-end">
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
                  className="absolute top-3 right-0 w-[64%] origin-right cursor-pointer transition-transform"
                  style={{ transform: `translateX(-${(depth + 1) * 34}%) scale(${1 - (depth + 1) * 0.08})`, opacity: 0.45, zIndex: 5 - depth }}
                >
                  <SheetCard sheet={papers[i]} index={i} marks={marks} marker={marker} />
                </div>
              ))}
            <div className={`relative z-10 ${mine.length > 1 ? 'w-[64%]' : 'mx-auto w-[72%]'}`}>
              <SheetCard
                key={current}
                sheet={papers[current]}
                index={current}
                marks={marks}
                called={loto.called}
                marker={marker}
                freshMark={fresh}
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
        {winner ? (
          isHost ? (
            <Button variant="primary" className="font-display flex-1 text-lg" onClick={onNext}>
              Ván mới
            </Button>
          ) : (
            <p className="flex-1 text-center text-xs text-muted">
              {players[winner.id]?.name} kinh · chờ host mở ván mới
            </p>
          )
        ) : ready ? (
          <Button variant="primary" className="font-display loto-kinh flex-1 text-xl" onClick={() => onClaim(ready.sheet, ready.row)}>
            KINH!
          </Button>
        ) : (
          <p className="flex-1 text-center text-[11px] text-muted">Chạm số đã gọi để đánh · đủ 5 số một hàng là Kinh</p>
        )}
      </div>
    </section>
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
    <div role="alertdialog" aria-modal="true" aria-label="Có người kinh" className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/75" onClick={onClose} />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="loto-confetti absolute -top-4 block h-3 w-2 rounded-sm"
            style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, rotate: `${c.rot}deg` }}
          />
        ))}
      </div>
      <div className="pop relative w-full max-w-sm rounded-3xl border-2 border-lemon bg-plum p-5 text-center shadow-[0_0_40px_rgb(255_210_63/0.45)]">
        <p className="font-display text-5xl font-extrabold tracking-wider text-lemon">KINH!</p>
        <p className="mt-2 text-lg">
          🎉 Chúc mừng <b className="text-cream">{w.id === me ? 'bạn' : players[w.id]?.name}</b>
        </p>
        <p className="text-xs text-muted">Tờ {sheetName(w.sheet)} · hàng {w.row + 1}</p>
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
