import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as fbSignOut,
} from 'firebase/auth'
import { auth } from './firebase.js'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES    = 'https://www.googleapis.com/auth/tasks'
const TOKEN_KEY = 'gapi_access_token'
const TOKEN_EXP = 'gapi_token_exp'

// 모바일 감지 (팝업 차단 브라우저 → 리디렉션 방식 사용)
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

let tokenClient   = null  // 데스크톱 GIS 전용
let _token        = sessionStorage.getItem(TOKEN_KEY) || null
let _expiry       = parseInt(sessionStorage.getItem(TOKEN_EXP) || '0', 10)
let _firebaseUser = null

function _saveToken(token, expiresIn = 3540) {
  _token  = token
  _expiry = Date.now() + (expiresIn - 60) * 1000
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(TOKEN_EXP, String(_expiry))
}

function _clearToken() {
  _token = null; _expiry = 0
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_EXP)
}

function _fbProvider() {
  const p = new GoogleAuthProvider()
  p.addScope(SCOPES)
  return p
}

async function _signInToFirebase(accessToken) {
  if (!auth) return
  try {
    const cred = GoogleAuthProvider.credential(null, accessToken)
    const res  = await signInWithCredential(auth, cred)
    _firebaseUser = res.user
  } catch (e) {
    console.warn('[auth] Firebase sign-in failed:', e.message)
  }
}

export function isSignedIn()      { return !!_token && Date.now() < _expiry }
export function getToken()        { return _token }
export function getFirebaseUser() { return _firebaseUser }

// ── 데스크톱: GIS 팝업 흐름 ────────────────────────────────────────
function _initDesktop(onSignIn, onExpire) {
  let called = false
  const done = (fn) => { if (!called) { called = true; fn() } }
  const fallback = setTimeout(() => done(() => onExpire?.()), 10000)

  const tryInit = () => {
    if (!window.google?.accounts?.oauth2) { setTimeout(tryInit, 100); return }
    clearTimeout(fallback)
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { done(() => onExpire?.()); return }
        _saveToken(resp.access_token, parseInt(resp.expires_in, 10))
        _signInToFirebase(resp.access_token)
        done(() => onSignIn(resp.access_token))
      },
    })
    if (isSignedIn()) {
      _signInToFirebase(_token)
      done(() => onSignIn(_token))
    } else {
      done(() => onExpire?.())
    }
  }
  tryInit()
}

// ── 모바일: Firebase Auth 리디렉션 흐름 ────────────────────────────
async function _initMobile(onSignIn, onExpire) {
  if (!auth) { onExpire?.(); return }
  try {
    // 구글에서 리디렉션 후 돌아온 경우 → 결과 처리
    const result = await getRedirectResult(auth)
    if (result) {
      const cred = GoogleAuthProvider.credentialFromResult(result)
      if (cred?.accessToken) {
        _saveToken(cred.accessToken)
        _firebaseUser = result.user
        onSignIn(result.user)
        return
      }
    }
  } catch (e) {
    console.warn('[auth] redirect result error:', e.message)
  }

  // 리디렉션 결과 없음 → 기존 세션 확인
  onAuthStateChanged(auth, (user) => {
    _firebaseUser = user
    if (isSignedIn()) {
      onSignIn(_token)
    } else {
      onExpire?.()
    }
  })
}

export function initAuth(onSignIn, onExpire) {
  if (IS_MOBILE) {
    _initMobile(onSignIn, onExpire)
  } else {
    _initDesktop(onSignIn, onExpire)
  }
}

export async function requestSignIn() {
  if (IS_MOBILE) {
    if (!auth) return
    // 리디렉션 방식 — 팝업 차단 우회 (페이지 이동 후 복귀)
    await signInWithRedirect(auth, _fbProvider())
  } else {
    // 데스크톱 GIS 팝업
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'select_account' })
    } else {
      const retry = () => {
        if (tokenClient) tokenClient.requestAccessToken({ prompt: 'select_account' })
        else setTimeout(retry, 200)
      }
      retry()
    }
  }
}

export function signOut() {
  const prev = _token
  _clearToken()
  _firebaseUser = null
  if (!IS_MOBILE && prev) window.google?.accounts.oauth2.revoke(prev)
  if (auth) fbSignOut(auth).catch(() => {})
}

export function scheduleRefresh(onExpire) {
  if (IS_MOBILE) return  // 모바일은 리디렉션으로만 갱신
  if (!_expiry) return
  const msLeft = _expiry - Date.now()
  if (msLeft <= 0) { onExpire?.(); return }
  setTimeout(() => tokenClient?.requestAccessToken({ prompt: '' }), msLeft)
}
