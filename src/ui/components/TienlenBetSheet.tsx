import { useState } from 'react'
import type { Game } from '../../core/types'
import { tienlenBets } from '../../core/suggest'
import { actions } from '../../store'
import { CardModeSwitch, LinkChip, SettingRow, SettingsModal } from './RuleSheets'
import { TienlenBetInputs } from './TienlenBetInputs'

/**
 * Tiến lên: host đặt Rule — tiền ăn Nhất/Nhì và giá heo đỏ/heo đen (mặc định bằng Nhất/Nhì).
 * Đây là các số gợi ý khi trả kẹo.
 */
export function TienlenBetSheet({ game, online, onDone }: { game: Game; online: boolean; onDone: (saved: boolean) => void }) {
  const init = tienlenBets(game)
  const [bet, setBet] = useState(init.bet)
  const [bet2, setBet2] = useState(init.bet2 ?? Math.max(1, Math.round(init.bet / 2)))
  // Heo chưa đặt riêng thì đi theo Nhất / Nhì
  const [red, setRed] = useState<number | undefined>(game.bets?.red)
  const [black, setBlack] = useState<number | undefined>(game.bets?.black)
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const errors = actions().setTienlenBets(game.id, bet, bet2, { red, black })
    if (errors.length) setError(errors[0])
    else onDone(true)
  }

  return (
    <SettingsModal
      title={
        <>
          <span className="text-sky">Rule</span> · Tiến lên
        </>
      }
      hint="Các số gợi ý khi trả kẹo."
      error={error}
      onSave={save}
      onClose={() => onDone(false)}
    >
      <TienlenBetInputs
        bet={bet}
        bet2={bet2}
        onChange={(v) => {
          setBet(v.bet)
          setBet2(v.bet2)
        }}
      />
      <div className="border-t border-line/60 pt-3" />
      <SettingRow icon="pigRed" label="Heo đỏ" hint="chặt heo đỏ" value={red ?? bet} onChange={setRed} />
      <LinkChip linked={red === undefined} text="Heo đỏ = Nhất" onRelink={() => setRed(undefined)} />
      <SettingRow icon="pigBlack" label="Heo đen" hint="chặt heo đen" value={black ?? bet2} onChange={setBlack} />
      <LinkChip linked={black === undefined} text="Heo đen = Nhì" onRelink={() => setBlack(undefined)} />
      <CardModeSwitch game={game} isHost online={online} />
    </SettingsModal>
  )
}
