import type { ID, Player, Transfer } from '../../core/types'
import { Who } from './kit'

/** "A → B [🍬 N]" — mỗi dòng một lượt đưa kẹo. */
export function TransferList({
  transfers,
  players,
  showReason = false,
  highlight,
}: {
  transfers: Transfer[]
  players: Record<ID, Player>
  showReason?: boolean
  highlight?: ID
}) {
  return (
    <ul className="space-y-2">
      {transfers.map((t, i) => (
        <li
          key={i}
          className={`grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-2xl px-2 py-2 ${
            highlight && (t.from === highlight || t.to === highlight) ? 'bg-lemon/10' : 'bg-night/40'
          }`}
        >
          <Who player={players[t.from]} className="min-w-0 font-semibold" />
          <span className="flex flex-col items-center">
            <span className="candy num" style={{ ['--candy' as string]: 'var(--color-lemon)' }}>
              {t.amount}
            </span>
            {showReason && <span className="mt-0.5 text-center text-[11px] leading-tight text-muted">{t.reason}</span>}
          </span>
          <Who player={players[t.to]} className="min-w-0 justify-end font-semibold" />
        </li>
      ))}
    </ul>
  )
}
