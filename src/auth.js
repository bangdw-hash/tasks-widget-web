const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/tasks'
const TOKEN_KEY = 'gapi_access_token'
const TOKEN_EXP_KEY = 'gapi_token_exp'

let tokenClient = null
let _accessToken = sessionStorage.getItem(TOKEN_KEY) || null
let _expiry = parseInt(sessionStorage.getItem(TOKEN_EXP_KEY) || '0', 10)

function _save(token, expiresIn) {
  _accessToken = token
  _expiry = Date.now() + (expiresIn - 60) * 1000  // 1분 여유
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(TOKEN_EXP_KEY, String(_expiry))
}

export function isSignedIn() {
  return !!_accessToken && Date.now() < _expiry
}

export function getToken() {
  return _accessToken
}

export function signOut() {
  if (_accessToken) {
    window.google?.accounts.oauth2.revoke(_accessToken)
  }
  _accessToken = null
  _expiry = 0
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_EXP_KEY)
}

export function initAuth(onSignIn, onExpire) {
  // GIS 스크립트 로딩을 기다린 뒤 초기화
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
        onSignIn(resp.access_token)
      },
    })
    // 세션에 토큰이 남아 있으면 바로 알려줌, 없으면 로그인 화면으로
    if (isSignedIn()) {
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

// 토큰 만료 직전 자동 갱신 요청
export function scheduleRefresh(onExpire) {
  if (!_expiry) return
  const msLeft = _expiry - Date.now()
  if (msLeft <= 0) { onExpire?.(); return }
  setTimeout(() => {
    tokenClient?.requestAccessToken({ prompt: '' })
  }, msLeft)
}
