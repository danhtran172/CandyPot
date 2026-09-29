import undo from '../../assets/undo.webp'

/** Biểu tượng hoàn tác (mũi tên vòng). */
export function UndoIcon({ className = 'size-[1em]' }: { className?: string }) {
  return <img src={undo} alt="" draggable={false} className={`inline-block max-w-none shrink-0 ${className}`} />
}
