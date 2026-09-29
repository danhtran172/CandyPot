import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { GAME_ICONS, GAMES } from '../../core/games'
import { CARD_KEYS, CARD_LABELS, type TienLenConfig } from '../../core/games/tienlen'
import type { XiDachConfig } from '../../core/games/xidach'
import type { GameType } from '../../core/types'
import { actions } from '../../store'
import { useSession } from '../components/useSession'
import { Button, Card, Chip, SectionTitle, Stepper, TopBar } from '../components/kit'

interface Field {
  label: string
  get: (c: never) => number
  set: (c: never, v: number) => unknown
}

function tl(label: string, key: keyof Omit<TienLenConfig, 'cards'>): Field {
  return { label, get: (c: TienLenConfig) => c[key], set: (c: TienLenConfig, v) => ({ ...c, [key]: v }) } as Field
}

const FIELDS: Record<GameType, { title: string; unit: string; fields: Field[] }[]> = {
  tienlen: [
    {
      title: 'Trả theo hạng',
      unit: '× mức cược',
      fields: [
        tl('4 người: Bét trả Nhất', 'pay4Bet'),
        tl('4 người: Ba trả Nhì', 'pay4Ba'),
        tl('3 người: Bét trả Nhất', 'pay3Bet'),
        tl('2 người: Thua trả Nhất', 'pay2Bet'),
      ],
    },
    {
      title: 'Tình huống đặc biệt',
      unit: '× mức cược',
      fields: [tl('Tới trắng: mỗi người trả', 'toiTrang'), tl('Cháy: trả người Nhất', 'chay')],
    },
    {
      title: 'Giá quân (thối & chặt)',
      unit: '× mức cược',
      fields: CARD_KEYS.map(
        (k) =>
          ({
            label: CARD_LABELS[k],
            get: (c: TienLenConfig) => c.cards[k],
            set: (c: TienLenConfig, v: number) => ({ ...c, cards: { ...c.cards, [k]: v } }),
          }) as Field,
      ),
    },
  ],
  xidach: [
    {
      title: 'Hệ số bài đặc biệt',
      unit: '× tiền cược',
      fields: (['xiban', 'xidach', 'ngulinh'] as const).map(
        (k) =>
          ({
            label: { xiban: 'Xì bàn', xidach: 'Xì dách', ngulinh: 'Ngũ linh' }[k],
            get: (c: XiDachConfig) => c.multipliers[k],
            set: (c: XiDachConfig, v: number) => ({ ...c, multipliers: { ...c.multipliers, [k]: v } }),
          }) as Field,
      ),
    },
  ],
  poker: [],
}

export function GameSettings() {
  const session = useSession()
  const { gid } = useParams()
  const navigate = useNavigate()
  const game = session.games.find((g) => g.id === gid)
  const [presetName, setPresetName] = useState('')
  const [presets, setPresets] = useState(() => actions().presets())
  if (!game) return <p className="pt-24 text-center text-muted">Không tìm thấy game.</p>

  const back = `/s/${session.id}?g=${game.id}`
  const config = game.config as never
  const update = (next: unknown) => actions().updateGameConfig(game.id, next)
  const myPresets = presets.filter((p) => p.gameType === game.type)

  const removeGame = () => {
    const msg = game.rounds.length
      ? `Xóa ${game.name} cùng ${game.rounds.length} ván đã chơi? Lời/lỗ sẽ được tính lại.`
      : `Xóa ${game.name}?`
    if (!confirm(msg)) return
    actions().removeGame(game.id)
    navigate(`/s/${session.id}`, { replace: true })
  }

  return (
    <main>
      <TopBar title={`${GAME_ICONS[game.type]} Luật & cài đặt`} back={back} />

      <Card>
        <label htmlFor="game-name" className="text-sm text-muted">
          Tên game
        </label>
        <input
          id="game-name"
          className="mt-1 w-full rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
          defaultValue={game.name}
          onBlur={(e) => e.target.value.trim() && actions().renameGame(game.id, e.target.value.trim())}
        />
      </Card>

      <p className="mt-3 text-sm text-muted">
        Đổi luật chỉ áp dụng cho ván mới và ván được sửa lại. Ván cũ giữ nguyên số kẹo đã tính.
      </p>

      {FIELDS[game.type].map((group) => (
        <Card key={group.title} className="mt-3">
          <SectionTitle aside={<span className="text-xs text-muted">{group.unit}</span>}>{group.title}</SectionTitle>
          <ul className="space-y-2">
            {group.fields.map((f) => (
              <li key={f.label} className="flex items-center justify-between gap-3">
                <span className="text-sm">{f.label}</span>
                <Stepper value={f.get(config)} min={0} label={f.label} onChange={(v) => update(f.set(config, v))} />
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {game.type === 'xidach' && (
        <Card className="mt-3">
          <SectionTitle>Cái quắc, con cũng quắc</SectionTitle>
          <div className="flex gap-2">
            {(
              [
                ['push', 'Hòa'],
                ['lose', 'Con vẫn thua'],
              ] as const
            ).map(([v, text]) => (
              <Chip
                key={v}
                active={(game.config as XiDachConfig).bothBust === v}
                onClick={() => update({ ...(game.config as XiDachConfig), bothBust: v })}
              >
                {text}
              </Chip>
            ))}
          </div>
        </Card>
      )}

      {game.type === 'poker' ? (
        <Card className="mt-3 text-sm text-muted">Poker tính theo số kẹo thực bỏ vào pot, không có hệ số cần chỉnh.</Card>
      ) : (
        <Card className="mt-3">
          <SectionTitle>Luật nhà</SectionTitle>
          <p className="mb-3 text-sm text-muted">Lưu bộ luật này để dùng lại ở buổi sau.</p>
          {myPresets.length > 0 && (
            <ul className="mb-3 space-y-1.5">
              {myPresets.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-2xl bg-night/40 py-1.5 pr-2 pl-3">
                  <span className="flex-1 font-semibold">{p.name}</span>
                  <Button className="px-3 py-1.5 text-sm" onClick={() => update(structuredClone(p.config))}>
                    Áp dụng
                  </Button>
                  <button
                    type="button"
                    aria-label={`Xóa luật ${p.name}`}
                    className="px-1 text-muted hover:text-berry"
                    onClick={() => {
                      actions().removePreset(p.id)
                      setPresets(actions().presets())
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              aria-label="Tên luật nhà"
              className="min-w-0 flex-1 rounded-xl border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-lemon"
              placeholder="VD: Luật nhà An"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <Button
              onClick={() => {
                actions().savePreset(presetName, game.type, game.config)
                setPresets(actions().presets())
                setPresetName('')
              }}
            >
              Lưu
            </Button>
          </div>
          <Button variant="ghost" className="mt-2 w-full text-sm" onClick={() => update(structuredClone(GAMES[game.type].defaultConfig))}>
            Về luật mặc định
          </Button>
        </Card>
      )}

      <Button variant="danger" className="mt-6 w-full" onClick={removeGame}>
        Xóa game này
      </Button>
    </main>
  )
}
