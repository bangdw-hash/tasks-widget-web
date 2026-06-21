import { useState, useEffect, useCallback } from 'react'
import { initAuth, requestSignIn, signOut, scheduleRefresh } from './auth.js'
import { subscribeSettings, saveSettings, applySettings, resetStyles, DEFAULTS } from './cloudSettings.js'
import * as api from './api.js'
import LoginScreen from './components/LoginScreen.jsx'
import Header from './components/Header.jsx'
import TaskItem from './components/TaskItem.jsx'
import CompletedSection from './components/CompletedSection.jsx'
import TaskModal from './components/TaskModal.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'

export default function App() {
  const [authed, setAuthed]           = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [lists, setLists]             = useState([])
  const [currentId, setCurrentId]     = useState('')
  const [tasks, setTasks]             = useState([])
  const [completed, setCompleted]     = useState([])
  const [loadingComp, setLoadingComp] = useState(false)
  const [syncing, setSyncing]         = useState(false)
  const [modal, setModal]             = useState(null)
  const [error, setError]             = useState('')
  const [settings, setSettings]       = useState(DEFAULTS)
  const [showSettings, setShowSettings] = useState(false)

  // ── 인증 초기화 ────────────────────────────────────────────────────
  useEffect(() => {
    initAuth(
      () => { setAuthed(true); setAuthLoading(false) },
      () => { setAuthed(false); setAuthLoading(false) },
    )
  }, [])

  // ── 로그인 후 목록 로드 + 설정 실시간 구독 ───────────────────────
  useEffect(() => {
    if (!authed) return
    scheduleRefresh(() => setAuthed(false))
    loadLists()
    // Firestore 실시간 리스너 — PC·모바일 어디서 바꿔도 즉시 반영
    const unsubSettings = subscribeSettings((s) => {
      setSettings(s)
      applySettings(s)
    })
    return () => unsubSettings()
  }, [authed])

  // ── 로그아웃 시 스타일 초기화 ─────────────────────────────────────
  useEffect(() => {
    if (!authed) resetStyles()
  }, [authed])

  const loadLists = useCallback(async () => {
    try {
      const data = await api.getTaskLists()
      setLists(data)
      const saved = localStorage.getItem('current_list_id')
      const id = data.find(l => l.id === saved)?.id || data[0]?.id || ''
      setCurrentId(id)
    } catch (e) {
      setError('목록을 불러오지 못했습니다')
    }
  }, [])

  // ── 목록 변경 시 태스크 로드 ──────────────────────────────────────
  useEffect(() => {
    if (!currentId) return
    localStorage.setItem('current_list_id', currentId)
    setCompleted([])
    loadTasks()
  }, [currentId])

  const loadTasks = useCallback(async () => {
    if (!currentId) return
    setSyncing(true)
    try {
      const data = await api.getTasks(currentId)
      setTasks(data)
    } catch (e) {
      if (e.status === 401) { setAuthed(false); return }
      setError('할 일을 불러오지 못했습니다')
    } finally {
      setSyncing(false)
    }
  }, [currentId])

  const loadCompleted = useCallback(async () => {
    if (!currentId) return
    setLoadingComp(true)
    try {
      const data = await api.getCompletedTasks(currentId)
      setCompleted(data)
    } catch {}
    finally { setLoadingComp(false) }
  }, [currentId])

  // ── Task 조작 ─────────────────────────────────────────────────────
  const handleComplete = async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await api.completeTask(currentId, taskId)
      setCompleted([])
    } catch { loadTasks() }
  }

  const handleUncomplete = async (taskId) => {
    setCompleted(prev => prev.filter(t => t.id !== taskId))
    try {
      const task = await api.uncompleteTask(currentId, taskId)
      setTasks(prev => [task, ...prev])
    } catch {}
  }

  const handleDelete = async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try { await api.deleteTask(currentId, taskId) }
    catch { loadTasks() }
  }

  const handleDeleteCompleted = async (taskId) => {
    setCompleted(prev => prev.filter(t => t.id !== taskId))
    try { await api.deleteTask(currentId, taskId) } catch {}
  }

  const handleAdd = async ({ title, due, notes }) => {
    setModal(null)
    const tmp = { id: `tmp_${Date.now()}`, title, due: due ? `${due}T00:00:00.000Z` : '', notes }
    setTasks(prev => [...prev, tmp])
    try {
      const created = await api.insertTask(currentId, { title, due, notes })
      setTasks(prev => prev.map(t => t.id === tmp.id ? created : t))
    } catch { setTasks(prev => prev.filter(t => t.id !== tmp.id)) }
  }

  const handleEdit = async ({ title, due, notes }) => {
    const { task } = modal
    setModal(null)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, title, due: due ? `${due}T00:00:00.000Z` : '', notes } : t))
    try {
      await api.updateTask(currentId, task.id, { title, due, notes })
    } catch { loadTasks() }
  }

  const handleCreateList = async () => {
    const name = prompt('새 목록 이름을 입력하세요')
    if (!name?.trim()) return
    try {
      const created = await api.createTaskList(name.trim())
      setLists(prev => [...prev, created])
      setCurrentId(created.id)
    } catch { setError('목록을 만들지 못했습니다') }
  }

  const handleSignOut = () => {
    signOut()
    setAuthed(false)
    setTasks([])
    setLists([])
    setCurrentId('')
    setShowSettings(false)
  }

  const handleSettingsUpdate = (newSettings) => {
    setSettings(newSettings)
  }

  // ── 렌더 ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="login-screen">
        <div className="spinner" />
      </div>
    )
  }

  if (!authed) return <LoginScreen loading={authLoading} />

  return (
    <div className="app">
      <Header
        lists={lists}
        currentId={currentId}
        onSelect={id => setCurrentId(id)}
        onCreateList={handleCreateList}
        onSettings={() => setShowSettings(true)}
        onSignOut={handleSignOut}
      />

      <main className="main">
        {error && (
          <div className="error-banner" onClick={() => setError('')}>{error} ✕</div>
        )}

        {syncing && tasks.length === 0 && (
          <div className="empty-msg"><div className="spinner" /></div>
        )}

        {!syncing && tasks.length === 0 && (
          <div className="empty-msg">
            <div style={{ fontSize: 36 }}>✅</div>
            <div>할 일이 없습니다</div>
          </div>
        )}

        <div className="task-list">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onEdit={task => setModal({ mode: 'edit', task })}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <CompletedSection
          tasks={completed}
          loading={loadingComp}
          onLoad={loadCompleted}
          onUncomplete={handleUncomplete}
          onDelete={handleDeleteCompleted}
        />
      </main>

      <button className="fab" onClick={() => setModal({ mode: 'add' })} aria-label="할 일 추가">
        ＋
      </button>

      {modal && (
        <TaskModal
          mode={modal.mode}
          task={modal.task}
          onSubmit={modal.mode === 'add' ? handleAdd : handleEdit}
          onClose={() => setModal(null)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onUpdate={handleSettingsUpdate}
        />
      )}
    </div>
  )
}
