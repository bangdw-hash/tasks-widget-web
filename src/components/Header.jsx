import { useState } from 'react'

export default function Header({ lists, currentId, onSelect, onCreateList, onSettings, onSignOut }) {
  const [showMenu, setShowMenu] = useState(false)
  const current = lists.find(l => l.id === currentId)

  return (
    <header className="header">
      <div className="header-title">
        {current?.title || '할 일'}
      </div>

      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {lists.length > 1 && (
          <div style={{ position: 'relative' }}>
            <button className="hdr-btn" onClick={() => setShowMenu(v => !v)} title="목록 전환">
              ☰
            </button>
            {showMenu && (
              <>
                <div className="backdrop" onClick={() => setShowMenu(false)} />
                <div className="dropdown">
                  {lists.map(l => (
                    <button
                      key={l.id}
                      className={`dropdown-item${l.id === currentId ? ' active' : ''}`}
                      onClick={() => { onSelect(l.id); setShowMenu(false) }}
                    >
                      {l.title}
                    </button>
                  ))}
                  <div className="dropdown-sep" />
                  <button className="dropdown-item" onClick={() => { onCreateList(); setShowMenu(false) }}>
                    ＋ 새 목록
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <button className="hdr-btn" onClick={onSettings} title="설정">⚙</button>
        <button className="hdr-btn" onClick={onSignOut} title="로그아웃">⏻</button>
      </div>
    </header>
  )
}
