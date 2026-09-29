import { useEffect, useRef, useState } from 'react'

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (options: { formats: string[] }) => Detector

/**
 * Quét mã QR bằng camera sau. Trình duyệt có sẵn BarcodeDetector (Chrome Android) thì dùng luôn;
 * không có (Safari iPhone) thì đọc từng khung hình bằng jsQR (tải lúc cần).
 */
export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const done = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer = 0
    let stopped = false

    const finish = (text: string) => {
      if (done.current) return
      done.current = true
      navigator.vibrate?.(80)
      onResult(text)
    }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) return setError('Trình duyệt này không mở được camera — nhập mã 5 số nhé.')
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      } catch {
        return setError('Chưa được phép dùng camera — cho phép camera trong cài đặt trình duyệt, hoặc nhập mã 5 số.')
      }
      if (stopped || !video.current) return
      video.current.srcObject = stream
      await video.current.play().catch(() => {})

      const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
      const detector = Ctor ? new Ctor({ formats: ['qr_code'] }) : null
      const jsQR = detector ? null : (await import('jsqr')).default
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      const scan = async () => {
        if (stopped || done.current) return
        const v = video.current
        if (v && v.readyState >= 2 && v.videoWidth) {
          try {
            if (detector) {
              const [hit] = await detector.detect(v)
              if (hit?.rawValue) return finish(hit.rawValue)
            } else if (jsQR && ctx) {
              // Thu nhỏ khung hình cho nhẹ máy
              const scale = Math.min(1, 640 / v.videoWidth)
              canvas.width = Math.round(v.videoWidth * scale)
              canvas.height = Math.round(v.videoHeight * scale)
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
              const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
              if (hit?.data) return finish(hit.data)
            }
          } catch {
            // Khung hình lỗi → thử khung sau
          }
        }
        timer = window.setTimeout(scan, 200)
      }
      void scan()
    }
    void start()

    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onResult])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night" role="dialog" aria-modal="true" aria-label="Quét mã QR">
      <div className="relative flex-1 overflow-hidden">
        <video ref={video} playsInline muted className="absolute inset-0 size-full object-cover" />
        {/* Khung ngắm */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="aspect-square w-3/4 max-w-72 rounded-3xl border-4 border-lemon shadow-[0_0_0_100vmax_rgb(28_14_34/0.55)]" />
        </div>
        <p className="absolute inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] text-center font-semibold text-cream drop-shadow">
          Đưa mã QR của bàn vào khung
        </p>
        {error && (
          <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-2xl bg-plum p-4 text-center text-sm text-berry shadow-xl">{error}</p>
        )}
      </div>
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} className="w-full rounded-2xl bg-plum-2 py-3 font-semibold">
          Đóng
        </button>
      </div>
    </div>
  )
}
