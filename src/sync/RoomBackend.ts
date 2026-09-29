import type { Session } from '../core/types'

/**
 * Phòng chơi nhiều máy: mỗi bàn "Nhiều người join" là một phòng theo mã 5 số, chứa nguyên bàn.
 * Mọi máy trong phòng đều ghi được — ghi bằng transaction nên hai máy bấm cùng lúc không đè mất của nhau.
 */
export interface RoomBackend {
  /** 'firebase' = qua mạng; 'local' = giả lập trên máy này (chưa cấu hình Firebase). */
  readonly kind: 'firebase' | 'local'
  /** Đưa bàn lên phòng `code`. false = mã đã thuộc bàn khác. Phòng đã có của đúng bàn này thì giữ bản trên phòng. */
  claim(code: string, session: Session): Promise<boolean>
  /** Đọc bàn trong phòng (null = chưa có phòng). */
  fetch(code: string): Promise<Session | null>
  /** Theo dõi phòng; gọi lại mỗi khi có thay đổi (`onError`: không đọc được, vd bị từ chối quyền). Trả về hàm hủy theo dõi. */
  watch(code: string, onChange: (session: Session | null) => void, onError?: (error: unknown) => void): () => void
  /** Sửa bàn trong phòng theo dữ liệu mới nhất (chạy lại `fn` nếu máy khác vừa ghi). */
  update(code: string, fn: (session: Session) => Session): Promise<void>
  /** Trạng thái kết nối. Trả về hàm hủy theo dõi. */
  onConnection(onChange: (online: boolean) => void): () => void
  /** Đánh dấu phòng còn được dùng (mở bàn mà không ghi gì). */
  touch?(code: string): Promise<void>
  /** Dọn phòng bỏ không lâu ngày; trả về mã các phòng đã dọn. */
  sweep?(): Promise<string[]>
  /** Tạm ngắt / nối lại kết nối (app ẩn hoặc lâu không dùng). */
  pause?(): void
  resume?(): void
}

/** Dữ liệu một phòng: bàn lưu dạng chuỗi JSON (tránh việc cơ sở dữ liệu bỏ mảng rỗng / undefined). */
export interface RoomRecord {
  sessionId: string
  updatedAt: number
  data: string
}

export function toRecord(session: Session): RoomRecord {
  return { sessionId: session.id, updatedAt: session.updatedAt, data: JSON.stringify(session) }
}

export function fromRecord(record: RoomRecord | null | undefined): Session | null {
  if (!record?.data) return null
  try {
    return JSON.parse(record.data) as Session
  } catch {
    return null
  }
}
