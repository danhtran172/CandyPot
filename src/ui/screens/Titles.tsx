import { titles } from '../../core/titles'
import { useSession } from '../components/useSession'
import { TopBar, Who } from '../components/kit'
import { playerMap, signed } from '../format'

function valueText(key: string, v: number): string {
  if (key === 'bat-dong') return `lệch ${v} kẹo`
  if (['vua-keo', 'thanh-lo', 'cai-do', 'cai-den'].includes(key)) return `${signed(v)} kẹo`
  if (key === 'nong-tay') return `${v} ván liên tiếp`
  return `${v} lần`
}

export function Titles() {
  const session = useSession()
  const players = playerMap(session)
  const list = titles(session)

  return (
    <main>
      <TopBar title="Danh hiệu" />
      {list.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-6 text-center text-muted">
          Chơi thêm vài ván để danh hiệu xuất hiện.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {list.map((t) => (
            <li key={t.key} className="pop flex flex-col rounded-3xl border border-line/60 bg-plum p-4">
              <span aria-hidden className="text-4xl">
                {t.emoji}
              </span>
              <span className="font-display mt-1 text-xl leading-tight font-extrabold">{t.name}</span>
              <span className="text-xs text-muted">{t.description}</span>
              <span className="mt-3 flex flex-col gap-0.5 font-semibold">
                {t.playerIds.map((id) => (
                  <Who key={id} player={players[id]} />
                ))}
              </span>
              <span className="num mt-auto pt-2 text-sm text-lemon">
                {valueText(t.key, t.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
