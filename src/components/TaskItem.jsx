import { useState } from 'react'

const KST_OFFSET = 9 * 60 * 60 * 1000

function daysUntil(dueStr) {
  if (!dueStr) return null
  const due = new Date(dueStr)
  const today = new Date(Date.now() + KST_OFFSET)
  today.setUTCHours(0, 0, 0, 0)
  return Math.round((due - today) / 86400000)
}

function Badge({ days }) {
  if (days === null) return null
  let text, cls
  if (days < 0)      { text = `${Math.abs(days)}일 지남`; cls = 'badge-overdue' }
  else if (days === 0) { text = '오늘';                   cls = 'badge-today' }
  else if (days === 1) { text = '내일';                   cls = 'badge-tomorrow' }
  else if (days <= 7)  { text = `${days}일 뒤`;           cls = 'badge-soon' }
  else {
    const d = new Date(Date.now() + KST_OFFSET)
    d.setUTCHours(0,0,0,0)
    const due = new Date(d.getTime() + days * 86400000)
    text = `${due.getUTCMonth()+1}/${due.getUTCDate()}`
    cls = 'badge-far'
  }
  return <span className={`badge ${cls}`}>{text}</span>
}

export default function TaskItem({ task, onComplete, onEdit, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const days = daysUntil(task.due)
  const notes = task.notes?.split('\n')[0] || ''

  return (
    <div className={`task-item${days !== null && days < 0 ? ' overdue' : ''}`}>
      <button
        className="task-dot"
        onClick={() => onComplete(task.id)}
        aria-label="완료로 표시"
      />

      <div className="task-body" onClick={() => onEdit(task)}>
        <div className="task-title">{task.title}</div>
        {notes && <div className="task-notes">{notes}</div>}
      </div>

      <Badge days={days} />

      <div style={{ position: 'relative' }}>
        <button className="task-menu-btn" onClick={() => setShowMenu(v => !v)}>⋮</button>
        {showMenu && (
          <>
            <div className="backdrop" onClick={() => setShowMenu(false)} />
            <div className="dropdown dropdown-left">
              <button className="dropdown-item" onClick={() => { onEdit(task); setShowMenu(false) }}>
                ✏ 수정
              </button>
              <button className="dropdown-item" onClick={() => { onComplete(task.id); setShowMenu(false) }}>
                ✅ 완료로 표시
              </button>
              <div className="dropdown-sep" />
              <button className="dropdown-item danger" onClick={() => { onDelete(task.id); setShowMenu(false) }}>
                🗑 삭제
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
