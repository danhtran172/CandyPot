import recommend from '../../assets/recommend.webp'

/**
 * Huy hiệu 👍 "nên chọn" ở góc trên bên phải một lựa chọn. Quy ước: trong mọi nhóm lựa chọn, lựa chọn đầu tiên
 * bên trái là lựa chọn hợp lý nhất và mang huy hiệu này (phần tử cha cần `relative`).
 */
export function RecommendBadge({ className = '' }: { className?: string }) {
  const mask = `url(${recommend}) center / contain no-repeat`
  return (
    <span
      role="img"
      aria-label="Nên chọn"
      title="Nên chọn"
      className={`pointer-events-none absolute -top-2 -right-2 size-7 drop-shadow-[0_1px_2px_rgb(0_0_0/0.5)] ${className}`}
    >
      {/* Nền tròn đen nhỏ hơn nằm dưới: phần ngón cái (trong suốt) hiện màu đen, không lộ nền phía sau */}
      <span className="absolute inset-[16%] rounded-full bg-black" />
      <span className="absolute inset-0 bg-recommend" style={{ mask, WebkitMask: mask }} />
    </span>
  )
}
