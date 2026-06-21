import { useState } from 'react'

function fmtDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getMonth()+1}/${d.getDate()}`
}

export default function CompletedSection({ tasks, loading, onLoad, onUncomplete, onDelete }) {
  const [open, setOpen] = useState(false)

  const toggle = () => {
    if (!open && tasks.length === 0) onLoad()
    setOpen(v => !v)
  }

  return (
    <div className="completed-section">
      <button className="completed-toggle" onClick={toggle}>
        <span>{open ? '▾' : '▸'} 완료됨 {tasks.length > 0 && `(${tasks.length})`}</span>
      </button>

      {open && (
        <div className="completed-list">
          {loading && <div className="empty-msg">불러오는 중…</div>}
          {!loading && tasks.length === 0 && (
            <div className="empty-msg">완료된 항목이 없습니다</div>
          )}
          {tasks.map(task => (
            <div key={task.id} className="completed-item">
              <span className="completed-check">✅</span>
              <div className="completed-body">
                <div className="completed-title">{task.title}</div>
                {task.completed && (
                  <div className="completed-date">{fmtDate(task.completed)} 완료</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="icon-btn"
                  title="미완료로 되돌리기"
                  onClick={() => onUncomplete(task.id)}
                >↩</button>
                <button
                  className="icon-btn danger"
                  title="영구 삭제"
                  onClick={() => onDelete(task.id)}
                >🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
