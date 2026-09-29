/** Hũ kẹo — thứ người chơi kéo để trả kẹo. */
export function CandyJar({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 36" className={className} aria-hidden>
      {/* nắp */}
      <rect x="8" y="1.5" width="16" height="5" rx="2" fill="#ffd23f" />
      <rect x="8" y="5" width="16" height="1.5" fill="#000" opacity=".18" />
      {/* cổ hũ */}
      <rect x="9.5" y="6.5" width="13" height="3" fill="#e9dcff" opacity=".55" />
      {/* thân hũ */}
      <path
        d="M9.5 9.5h13c3.6 0 6.5 2.9 6.5 6.5v12.5c0 3.6-2.9 6.5-6.5 6.5h-13C5.9 35 3 32.1 3 28.5V16c0-3.6 2.9-6.5 6.5-6.5Z"
        fill="#e9dcff"
        fillOpacity=".28"
        stroke="#e9dcff"
        strokeOpacity=".85"
        strokeWidth="1.4"
      />
      {/* kẹo bên trong */}
      <circle cx="10" cy="29" r="3.4" fill="#ff5c7a" />
      <circle cx="16.5" cy="30" r="3.4" fill="#ffd23f" />
      <circle cx="23" cy="29" r="3.4" fill="#3ddc97" />
      <circle cx="13" cy="23.5" r="3.2" fill="#a974f0" />
      <circle cx="19.8" cy="23.8" r="3.2" fill="#ff5c7a" />
      <circle cx="16.4" cy="18.5" r="2.8" fill="#3ddc97" />
      {/* ánh sáng trên thủy tinh */}
      <path d="M6.5 15.5v9" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
