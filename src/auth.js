import { GoogleAuthProvider, signInWithCredential, signOut as fbSignOut } from 'firebase/auth'
import { auth } from './firebase.js'

const CLIENT_ID   = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES      = 'https://www.googleapis.com/auth/tasks'
const TOKEN_KEY   = 'gapi_access_token'
const TOKEN_EXP_KEY = 'gapi_token_exp'

let tokenClient   = null
let _accessToken  = sessionStorage.getItem(TOKEN_KEY) || null
let _expiry       = parseInt(sessionStorage.getItem(TOKEN_EXP_KEY) || '0', 10)
let _firebaseUser = null

function _save(token, expiresIn) {
  _accessToken = token
  _expiry = Date.now() + (expiresIn - 60) * 1000
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(TOKEN_EXP_KEY, String(_expiry))
}

async function _signInToFirebase(accessToken) {
  if (!auth) return
  try {
    const credential = GoogleAuthProvider.credential(null, accessToken)
    const result = await signInWithCredential(auth, credential)
    _firebaseUser = result.user
  } catch (e) {
    console.warn('[auth] Firebase sign-in failed:', e.message)
  }
}

export function isSignedIn() {
  return !!_accessToken && Date.now() < _expiry
}

export function getToken() {
  return _accessToken
}

export function getFirebaseUser() {
  return _firebaseUser
}

export function signOut() {
  if (_accessToken) {
    window.google?.accounts.oauth2.revoke(_accessToken)
  }
  _accessToken  = null
  _expiry       = 0
  _firebaseUser = null
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_EXP_KEY)
  if (auth) fbSignOut(auth).catch(() => {})
}

export function initAuth(onSignIn, onExpire) {
  let called = false
  // 한 번만 콜백을 호출하도록 보장
  const done = (fn) => { if (!called) { called = true; fn() } }

  // 안전장치: 10초 안에 GIS가 로드되지 않으면 로그인 화면으로 전환
  const fallback = setTimeout(() => done(() => onExpire?.()), 10000)

  const tryInit = () => {
    if (!window.google?.accounts?.oauth2) {
      setTimeout(tryInit, 100)
      return
    }
    clearTimeout(fallback)

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { done(() => onExpire?.()); return }
        _save(resp.access_token, parseInt(resp.expires_in, 10))
        _signInToFirebase(resp.access_token)
        done(() => onSignIn(resp.access_token))
      },
    })

    if (isSignedIn()) {
      _signInToFirebase(_accessToken)
      done(() => onSignIn(_accessToken))
    } else {
      done(() => onExpire?.())
    }
  }

  tryInit()
}

export function requestSignIn() {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: '' })
  } else {
    // GIS가 아직 로드 중이면 잠시 후 재시도
    const retry = () => {
      if (tokenClient) { tokenClient.requestAccessToken({ prompt: '' }) }
      else setTimeout(retry, 200)
    }
    retry()
  }
}

export function scheduleRefresh(onExpire) {
  if (!_expiry) return
  const msLeft = _expiry - Date.now()
  if (msLeft <= 0) { onExpire?.(); return }
  setTimeout(() => {
    tokenClient?.requestAccessToken({ prompt: '' })
  }, msLeft)
}
