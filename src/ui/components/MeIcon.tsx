/** Biểu tượng "bạn" (hình người: đầu tròn + vai). */
export function MeIcon({ className = 'size-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <circle cx="12" cy="6.2" r="5.2" />
      <path d="M2.6 23v-3.4c0-2.7 1.6-4.8 4.1-5.6.6-.2 1.2-.1 1.7.3 1 .8 2.2 1.2 3.6 1.2s2.6-.4 3.6-1.2c.5-.4 1.1-.5 1.7-.3 2.5.8 4.1 2.9 4.1 5.6V23z" />
    </svg>
  )
}
