import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase.js'
import { getFirebaseUser } from './auth.js'

export const DEFAULTS = {
  font_family: 'Malgun Gothic',
  font_size:   15,
  bg_color:    '#1a1a2e',
  text_color:  '#f0f0f0',
}

const SYNC_KEYS = Object.keys(DEFAULTS)

async function waitForUser(maxMs = 4000) {
  let user = getFirebaseUser()
  const step = 300
  for (let elapsed = 0; !user && elapsed < maxMs; elapsed += step) {
    await new Promise(r => setTimeout(r, step))
    user = getFirebaseUser()
  }
  return user
}

// 실시간 리스너 — Firestore 문서가 바뀌면 즉시 callback 호출
// 반환값: 구독 해제 함수 (컴포넌트 언마운트 시 호출)
export function subscribeSettings(callback) {
  let unsub = null

  waitForUser().then(user => {
    if (!user) return
    unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => callback(snap.exists() ? { ...DEFAULTS, ...snap.data() } : { ...DEFAULTS }),
      (err)  => console.warn('[cloud] snapshot error:', err.message),
    )
  })

  return () => { unsub?.() }
}

export async function saveSettings(settings) {
  const user = getFirebaseUser()
  if (!user) return
  const data = Object.fromEntries(
    SYNC_KEYS.map(k => [k, settings[k]]).filter(([, v]) => v !== undefined)
  )
  try {
    await setDoc(doc(db, 'users', user.uid), data, { merge: true })
  } catch (e) {
    console.warn('[cloud] save failed:', e.message)
  }
}

export function applySettings(s) {
  const r = document.documentElement
  r.style.setProperty('--bg', s.bg_color)
  r.style.setProperty('--text', s.text_color)
  document.body.style.fontFamily = `'${s.font_family}', -apple-system, 'Noto Sans KR', sans-serif`
  document.body.style.fontSize   = s.font_size + 'px'
}

export function resetStyles() {
  const r = document.documentElement
  r.style.removeProperty('--bg')
  r.style.removeProperty('--text')
  document.body.style.fontFamily = ''
  document.body.style.fontSize   = ''
}
