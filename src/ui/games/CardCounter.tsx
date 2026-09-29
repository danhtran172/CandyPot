import { CARD_KEYS, CARD_LABELS, type CardCount } from '../../core/games/tienlen'

/** Bấm để cộng quân, bấm "−" để bớt. */
export function CardCounter({ value, onChange }: { value: CardCount; onChange: (v: CardCount) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CARD_KEYS.map((k) => {
        const n = value[k] ?? 0
        return (
          <span
            key={k}
            className={`inline-flex items-center overflow-hidden rounded-full border text-sm font-semibold ${
              n ? 'border-lemon bg-lemon text-night' : 'border-line bg-night/40 text-cream'
            }`}
          >
            <button type="button" className="py-1 pr-2 pl-3" onClick={() => onChange({ ...value, [k]: n + 1 })}>
              {CARD_LABELS[k]}
              {n > 0 && <span className="num ml-1">×{n}</span>}
            </button>
            {n > 0 && (
              <button
                type="button"
                aria-label={`Bớt ${CARD_LABELS[k]}`}
                className="border-l border-night/20 px-2 py-1"
                onClick={() => onChange({ ...value, [k]: n - 1 })}
              >
                −
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
