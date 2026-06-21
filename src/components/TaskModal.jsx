import { useState, useEffect, useRef } from 'react'

function toDateInput(dueStr) {
  if (!dueStr) return ''
  return dueStr.slice(0, 10)
}

export default function TaskModal({ mode, task, onSubmit, onClose }) {
  const [title, setTitle] = useState(task?.title || '')
  const [due, setDue] = useState(toDateInput(task?.due || ''))
  const [notes, setNotes] = useState(task?.notes || '')
  const titleRef = useRef()

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100)
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), due, notes })
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet">
        <div className="modal-handle" />
        <h2 className="modal-title">{mode === 'add' ? '할 일 추가' : '할 일 수정'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label">제목 *</label>
            <input
              ref={titleRef}
              className="field-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
              autoComplete="off"
            />
          </div>

          <div className="field">
            <label className="field-label">마감일</label>
            <input
              className="field-input"
              type="date"
              value={due}
              onChange={e => setDue(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-label">메모</label>
            <textarea
              className="field-input field-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="메모 (선택)"
              rows={3}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
            <button type="submit" className="btn-submit" disabled={!title.trim()}>
              {mode === 'add' ? '추가' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
