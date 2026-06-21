import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
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

const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

let tokenClient   = null  // 데스크톱 GIS 전용
let _token        = sessionStorage.getItem(TOKEN_KEY) || null
let _expiry       = parseInt(sessionStorage.getItem(TOKEN_EXP) || '0', 10)
let _firebaseUser = null
let _onSignIn     = null  // 팝업 완료 후 직접 호출하기 위해 보관

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

// ── 모바일: Firebase Auth 팝업 흐름 ────────────────────────────────
async function _initMobile(onSignIn, onExpire) {
  _onSignIn = onSignIn  // requestSignIn 팝업 완료 후 직접 호출
  if (!auth) { onExpire?.(); return }

  // 이전 redirect 흐름 잔여 결과 처리 (폴백)
  try {
    const result = await getRedirectResult(auth)
    if (result?.user) {
      const cred = GoogleAuthProvider.credentialFromResult(result)
      if (cred?.accessToken) _saveToken(cred.accessToken)
      _firebaseUser = result.user
      onSignIn(result.user)
      return
    }
  } catch (e) {
    console.warn('[auth] redirect result error:', e.message)
  }

  // 기존 세션 확인 (페이지 재방문 시)
  onAuthStateChanged(auth, (user) => {
    _firebaseUser = user
    if (user && isSignedIn()) {
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
    try {
      // 팝업 방식 (삼성 인터넷·Chrome에서 redirect 루프 없이 동작)
      const result = await signInWithPopup(auth, _fbProvider())
      const cred = GoogleAuthProvider.credentialFromResult(result)
      if (cred?.accessToken) {
        _saveToken(cred.accessToken)
        _firebaseUser = result.user
        _onSignIn?.(result.user)
      }
    } catch (e) {
      if (e.code === 'auth/popup-blocked') {
        // 팝업이 차단된 경우에만 redirect로 폴백
        await signInWithRedirect(auth, _fbProvider())
      }
      // auth/popup-closed-by-user: 사용자가 취소, 무시
    }
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
