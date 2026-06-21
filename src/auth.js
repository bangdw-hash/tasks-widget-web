import { getAuth, GoogleAuthProvider, signInWithCredential, signOut as fbSignOut } from 'firebase/auth'
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
  fbSignOut(auth).catch(() => {})
}

export function initAuth(onSignIn, onExpire) {
  const tryInit = () => {
    if (!window.google?.accounts?.oauth2) {
      setTimeout(tryInit, 100)
      return
    }
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) { onExpire?.(); return }
        _save(resp.access_token, parseInt(resp.expires_in, 10))
        _signInToFirebase(resp.access_token)
        onSignIn(resp.access_token)
      },
    })
    if (isSignedIn()) {
      _signInToFirebase(_accessToken)
      onSignIn(_accessToken)
    } else {
      onExpire?.()
    }
  }
  tryInit()
}

export function requestSignIn() {
  tokenClient?.requestAccessToken({ prompt: '' })
}

export function scheduleRefresh(onExpire) {
  if (!_expiry) return
  const msLeft = _expiry - Date.now()
  if (msLeft <= 0) { onExpire?.(); return }
  setTimeout(() => {
    tokenClient?.requestAccessToken({ prompt: '' })
  }, msLeft)
}
