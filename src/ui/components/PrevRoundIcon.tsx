/** Biểu tượng quay lại ván trước (vạch + mũi tên lùi). */
export function PrevRoundIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 5v14" />
      <path d="M18 6.2v11.6a.9.9 0 0 1-1.4.75L9.1 12.75a.9.9 0 0 1 0-1.5l7.5-5.8a.9.9 0 0 1 1.4.75Z" fill="currentColor" fillOpacity={0.25} />
    </svg>
  )
}
