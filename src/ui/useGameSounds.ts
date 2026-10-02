import { useEffect, useRef } from 'react'
import type { ID, Player, Round } from '../core/types'
import { lotoCallText } from './lotoCall'
import { sfx, soundPrefs, speak } from './sound'

interface Snapshot {
  id?: ID
  tlTable?: string
  tlPassed?: number
  tlFinished?: number
  xdCards?: number
  xdSettled?: number
  xdShown?: boolean
  called?: number
  winner?: ID
  waiting?: ID[]
}

/**
 * Âm thanh theo diễn biến ván (máy nào cũng phát, ai thao tác cũng vậy): đánh bài / bỏ lượt / về Nhất (Tiến lên),
 * rút / lật bài (Xì dách), số vừa gọi + đọc số, kinh, đợi (Lô tô). Lần đầu thấy ván (mở màn, tải lại) thì không phát.
 */
export function useGameSounds(round: Round | undefined, players: Record<ID, Player>, me: ID | null) {
  const prev = useRef<Snapshot>({})
  const name = (id: ID) => players[id]?.name ?? ''
  useEffect(() => {
    const p = prev.current
    const same = !!round && p.id === round.id
    const next: Snapshot = { id: round?.id }

    const tl = round?.tienlen
    if (tl) {
      next.tlTable = tl.table ? tl.table.cards.join(',') : ''
      next.tlPassed = tl.passed.length
      next.tlFinished = tl.finished.length
      if (same) {
        if (next.tlTable && next.tlTable !== p.tlTable) sfx.play(tl.table!.cards.length)
        else if (next.tlPassed > (p.tlPassed ?? 0)) sfx.pass()
        if (next.tlFinished > 0 && (p.tlFinished ?? 0) === 0) sfx.win()
      }
    }

    const xd = round?.xidach
    if (xd) {
      next.xdCards = Object.values(xd.hands).reduce((n, h) => n + h.length, 0)
      next.xdSettled = Object.keys(xd.settled).length
      next.xdShown = xd.dealerShown
      // Lúc vừa chia (chưa có bài ở lần trước) không tính là rút — tiếng chia do màn chia bài phát
      if (same && p.xdCards !== undefined) {
        if (next.xdCards > p.xdCards) sfx.draw()
        if (next.xdSettled > (p.xdSettled ?? 0) || (next.xdShown && !p.xdShown)) sfx.flip()
      }
    }

    const lo = round?.loto
    if (lo) {
      next.called = lo.called.length
      next.winner = lo.winner?.id
      next.waiting = lo.waiting ?? []
      if (same) {
        if (next.called > (p.called ?? next.called)) {
          sfx.ball()
          // Rao lô tô (câu vần) hoặc đọc số — câu chọn theo mã ván nên mọi máy đọc giống nhau
          speak(lotoCallText(lo.called[lo.called.length - 1], round!.id, soundPrefs().rhyme))
        }
        if (lo.winner && !p.winner) {
          sfx.win()
          speak(`${name(lo.winner.id)} kinh!`)
        }
        const fresh = next.waiting.filter((id) => id !== me && !(p.waiting ?? []).includes(id))
        if (fresh.length && !lo.winner) speak(`${fresh.map(name).join(', ')} đợi`)
      }
    }
    prev.current = next
  }, [round]) // eslint-disable-line react-hooks/exhaustive-deps
}
