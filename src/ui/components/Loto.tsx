import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { fullRows, ownerOf, type LotoState } from '../../core/games/lotoPlay'
import { COLS, rowNumbers, sheetColor, sheetName, type Sheet } from '../../core/games/lotoSheets'
import type { ID, Player } from '../../core/types'
import { Button } from './kit'

/** Cách đánh dấu số trên tờ. */
export type Marker = 'chalk' | 'seed'
const MARKER_KEY = 'candypot:loto-marker'
function readMarker(): Marker {
  try {
    return localStorage.getItem(MARKER_KEY) === 'seed' ? 'seed' : 'chalk'
  } catch {
    return 'chalk'
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

/** Viên phấn: vòng trắng nét phấn (hơi lệch, hơi nhòe). */
function ChalkMark({ n }: { n: number }) {
  const rot = (n * 47) % 360
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="pointer-events-none absolute inset-0 size-full" style={{ rotate: `${rot}deg` }}>
      {/* Bóng mờ dưới nét phấn để thấy rõ trên nền giấy sáng */}
      <path
        d="M20 5 C31 4 36 12 35 21 C34 31 26 36 18 35 C9 34 4 27 5 18 C6 10 12 6 22 6"
        fill="rgb(120 130 160 / 0.18)"
        stroke="#5b6478"
        strokeOpacity="0.55"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <path
        d="M20 5 C31 4 36 12 35 21 C34 31 26 36 18 35 C9 34 4 27 5 18 C6 10 12 6 22 6"
        fill="none"
        stroke="#fffdf5"
        strokeOpacity="0.92"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeDasharray="38 2 14 3 60"
        filter="url(#chalk)"
      />
    </svg>
  )
}

/** Hạt dưa: hạt đen bóng, viền đỏ nâu, xoay ngẫu nhiên theo số. */
function SeedMark({ n }: { n: number }) {
  const rot = (n * 73) % 360
  return (
    <svg aria-hidden viewBox="0 0 40 40" className="pointer-events-none absolute inset-[20%] size-[60%] drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]" style={{ rotate: `${rot}deg` }}>
      <path d="M20 4 C29 12 31 24 26 33 C23 38 17 38 14 33 C9 24 11 12 20 4 Z" fill="#2a1414" stroke="#7a2e2e" strokeWidth="1.6" />
      <path d="M18 12 C15 18 15 25 17 30" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
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
}) {
  const color = sheetColor(index)
  const [shake, setShake] = useState<number | null>(null)
  return (
    <div
      className={`overflow-hidden rounded-xl border-2 bg-cream shadow-lg ${small ? 'p-0.5' : 'p-1'}`}
      style={{ borderColor: color }}
    >
      {!small && (
        <div className="mb-1 flex items-center justify-between rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ background: color }}>
          <span>Tờ {sheetName(index)}</span>
          <span className="opacity-80">LÔ TÔ</span>
        </div>
      )}
      <div className="flex flex-col gap-[3px]">
        {[0, 1, 2].map((b) => (
          <div key={b} className="grid gap-px" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
            {[0, 1, 2].flatMap((i) =>
              sheet[b * 3 + i].map((n, c) => {
                const row = b * 3 + i
                const marked = n !== null && !!marks?.includes(n)
                const win = winRow === row
                return n === null ? (
                  <span
                    key={`${row}-${c}`}
                    className={small ? 'h-2' : 'aspect-[1/0.78]'}
                    style={{ background: color, opacity: 0.85 } as CSSProperties}
                  />
                ) : !onMark || small ? (
                  // Chỉ để xem (bảng chọn tờ / tờ phía sau): không bấm được
                  <span
                    key={`${row}-${c}`}
                    className={`num relative grid place-items-center font-bold text-night ${
                      small ? 'h-2 bg-cream text-[0px]' : `aspect-[1/0.78] text-sm leading-none ${win ? 'bg-lemon' : 'bg-cream'}`
                    }`}
                  >
                    {n}
                    {marked && !small && (marker === 'seed' ? <SeedMark n={n} /> : <ChalkMark n={n} />)}
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
                    className={`num relative grid place-items-center text-sm leading-none font-bold text-night aspect-[1/0.78] ${
                      win ? 'bg-lemon' : 'bg-cream'
                    } ${shake === n ? 'loto-shake' : ''}`}
                  >
                    {n}
                    {marked && (marker === 'seed' ? <SeedMark n={n} /> : <ChalkMark n={n} />)}
                  </button>
                )
              }),
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Bảng danh sách giấy: chạm chọn tờ (tối đa `max`), tờ người khác đã mua thì mờ + tên người mua. */
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
  const [picked, setPicked] = useState<number[]>(loto?.sheets[me] ?? [])
  const [error, setError] = useState<string | null>(null)
  const had = (loto?.sheets[me] ?? []).length > 0
  const toggle = (i: number) => {
    setError(null)
    setPicked((p) => {
      if (p.includes(i)) return p.filter((x) => x !== i)
      if (p.length >= max) {
        setError(`Tối đa ${max} tờ — bỏ bớt một tờ rồi chọn tờ khác.`)
        return p
      }
      return [...p, i]
    })
  }
  return (
    <div role="dialog" aria-modal="true" aria-label="Chọn tờ lô tô" className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Đóng" className="absolute inset-0 bg-night/70" onClick={onClose} />
      <div className="pop relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-line/60 bg-plum p-4 sm:rounded-3xl">
        <h2 className="font-display text-xl font-extrabold">Chọn tờ</h2>
        <p className="text-xs text-muted">
          Chạm để chọn / bỏ. Tối đa {max} tờ · {price} kẹo một tờ. Hai tờ cùng màu là một cặp đủ 90 số.
        </p>
        <div className="no-scrollbar mt-3 grid flex-1 grid-cols-3 gap-2 overflow-y-auto pb-2">
          {papers.map((sheet, i) => {
            const owner = ownerOf(loto ?? { sheets: {}, caller: null, called: [] }, i, me)
            const on = picked.includes(i)
            return (
              <button
                key={i}
                type="button"
                disabled={!!owner}
                onClick={() => toggle(i)}
                aria-pressed={on}
                aria-label={`Tờ ${sheetName(i)}${owner ? ` — ${players[owner]?.name} đã mua` : ''}`}
                className={`relative rounded-xl p-1 text-left transition ${on ? 'bg-lemon/20 ring-2 ring-lemon' : 'bg-night/40'} ${owner ? 'opacity-40' : 'active:scale-95'}`}
              >
                <SheetCard sheet={sheet} index={i} small />
                <span className="mt-1 block truncate text-[11px] font-semibold" style={{ color: sheetColor(i) }}>
                  {sheetName(i)}
                </span>
                {owner && <span className="absolute inset-x-1 top-1/3 truncate rounded bg-night/85 px-1 text-center text-[10px]">{players[owner]?.name}</span>}
                {on && <span className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-lemon text-xs font-bold text-night">✓</span>}
              </button>
            )
          })}
        </div>
        {error && <p className="mb-2 text-center text-xs font-semibold text-berry">{error}</p>}
        <div className="flex items-center gap-2 border-t border-line/60 pt-3">
          <p className="flex-1 text-sm">
            <b className="text-lemon">{picked.length}</b>/{max} tờ · <b className="num text-lemon">{picked.length * price}</b> kẹo
          </p>
          <Button onClick={onClose}>Đóng</Button>
          <Button
            variant="primary"
            disabled={!picked.length && !had}
            onClick={() => {
              const errors = onSave(picked)
              if (errors.length) setError(errors[0])
              else onClose()
            }}
          >
            {picked.length || !had ? 'Mua' : 'Bỏ mua'}
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

/** Túi số cho người gọi: giữ để lắc, thả ra là ra một số. */
function BagButton({ onShake, small }: { onShake: () => void; small?: boolean }) {
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
        if (shaking) onShake()
        setShaking(false)
      }}
      onPointerCancel={() => setShaking(false)}
      onKeyDown={(e) => e.key === 'Enter' && onShake()}
    >
      <Bag shaking={shaking} small={small} />
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
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        {canShake ? <BagButton onShake={onShake} /> : <Bag shaking={false} />}
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
        {canShake && <BagButton onShake={onShake} small />}
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
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${i === current ? 'bg-cream text-night' : 'border-line/60 text-muted'}`}
                  style={i === current ? { borderColor: sheetColor(i) } : undefined}
                >
                  {sheetName(i)}
                </button>
              ))}
            <span className="flex-1" />
            <div role="radiogroup" aria-label="Đánh số bằng" className="flex rounded-full border border-line/60 bg-night/70 p-0.5 text-[11px] font-bold">
              {(
                [
                  ['chalk', 'Phấn'],
                  ['seed', 'Hạt dưa'],
                ] as const
              ).map(([v, label]) => (
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
          {/* Xấp tờ: tờ đang xem ở trước; các tờ kia nhỏ hơn, mờ, lệch ra sau — chạm để đưa lên */}
          <div className="relative mt-2" style={{ paddingTop: (mine.length - 1) * 10 }}>
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
                  className="absolute inset-x-0 top-0 origin-top cursor-pointer transition-transform"
                  style={{ transform: `translate(${(depth + 1) * 10}px, ${-(depth + 1) * 2}px) scale(${1 - (depth + 1) * 0.05})`, opacity: 0.5, zIndex: 0 }}
                >
                  <SheetCard sheet={papers[i]} index={i} marks={marks} marker={marker} />
                </div>
              ))}
            <div className="relative z-10">
              <SheetCard
                key={current}
                sheet={papers[current]}
                index={current}
                marks={marks}
                called={loto.called}
                marker={marker}
                winRow={winner?.id === me && winner.sheet === current ? winner.row : undefined}
                onMark={winner ? undefined : (n) => setMarks(marks.includes(n) ? marks.filter((x) => x !== n) : [...marks, n])}
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
