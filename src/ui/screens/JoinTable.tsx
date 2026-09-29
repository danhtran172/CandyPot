import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { actions, useApp } from '../../store'
import { Button, Card, TopBar } from '../components/kit'
import { claimWindow } from '../me'
import { QrScanner } from '../components/QrScanner'
import { codeFromQr } from '../qrCode'


/** Join bàn bằng mã 5 số (hoặc mở link / quét QR có sẵn mã). */
export function JoinTable() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const kind = useApp((s) => s.roomKind)
  const [code, setCode] = useState(() => (params.get('code') ?? '').replace(/\D/g, '').slice(0, 5))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)

  const join = async (c = code) => {
    if (c.length !== 5 || busy) return
    setBusy(true)
    setError('')
    const { id, error } = await actions().joinRoom(c)
    setBusy(false)
    if (!id) return setError(error ?? 'Không vào được bàn này.')
    // Giả lập trên cùng máy: tab này đóng vai một máy khác
    if (kind === 'local') claimWindow(id)
    navigate(`/s/${id}`, { replace: true })
  }

  const onScan = useCallback((text: string) => {
    setScanning(false)
    const c = codeFromQr(text)
    if (!c) return setError('Mã QR này không phải mã bàn CandyPot.')
    setCode(c)
    void join(c)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mở từ link / QR (?code=12345) → vào luôn
  const auto = useRef(false)
  useEffect(() => {
    if (auto.current || code.length !== 5) return
    auto.current = true
    void join(code)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main>
      <TopBar title="Join bàn" back="/" />
      <Card className="text-center">
        <p className="text-sm text-muted">Nhập mã 5 số mà host đưa cho bạn.</p>
        <input
          aria-label="Mã bàn 5 số"
          inputMode="numeric"
          autoFocus
          maxLength={5}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, '').slice(0, 5))
            setError('')
          }}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="• • • • •"
          className="num font-display mt-4 w-full rounded-2xl border-2 border-line bg-night/60 py-3 text-center text-4xl font-extrabold tracking-[0.5em] outline-none placeholder:text-line focus:border-sky"
        />
        {error && <p className="mt-3 text-sm font-semibold text-berry">{error}</p>}
        <Button variant="primary" className="font-display mt-4 w-full py-3 text-xl" disabled={code.length !== 5 || busy} onClick={() => join()}>
          {busy ? 'Đang vào…' : 'Vào bàn'}
        </Button>
        <div className="my-3 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          hoặc
          <span className="h-px flex-1 bg-line" />
        </div>
        <Button className="w-full py-3 text-lg font-bold text-sky" onClick={() => setScanning(true)}>
          📷 Quét mã QR
        </Button>
        {kind === 'local' && (
          <p className="mt-3 rounded-2xl bg-sky/10 px-3 py-2 text-xs text-sky">
            📡 App chưa kết nối Firebase — hiện chỉ join được bàn tạo trên chính máy này.
          </p>
        )}
      </Card>
      {scanning && <QrScanner onResult={onScan} onClose={() => setScanning(false)} />}
    </main>
  )
}
