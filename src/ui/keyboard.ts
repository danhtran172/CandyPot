/**
 * Bàn phím ảo che mất popup (iPhone, và Chrome Android đời mới: bàn phím phủ lên trang chứ không co trang lại).
 * Theo dõi phần màn hình bị bàn phím che (visualViewport) → biến CSS `--kb` (px); các popup toàn màn hình
 * dùng nó làm `bottom` để nổi lên ngay trên bàn phím (xem index.css).
 */
export function trackKeyboard(): void {
  const vv = window.visualViewport
  if (!vv) return
  const update = () => {
    // Đang phóng to bằng hai ngón → không phải bàn phím
    const covered = vv.scale > 1.01 ? 0 : window.innerHeight - vv.height - vv.offsetTop
    const kb = covered > 60 ? Math.round(covered) : 0
    document.documentElement.style.setProperty('--kb', `${kb}px`)
  }
  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  update()
}
