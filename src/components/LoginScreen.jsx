import { requestSignIn } from '../auth.js'

// 카카오톡·인스타그램 등 인앱 브라우저는 Google OAuth 차단됨 (disallowed_useragent)
function isInAppBrowser() {
  const ua = navigator.userAgent || ''
  return (
    /KAKAOTALK|NAVER|Instagram|Line\/|FB_IAB|FBAN|FBAV|Twitter|Snapchat|TikTok/i.test(ua) ||
    (/Android/.test(ua) && !/Chrome/i.test(ua)) ||
    (/iPhone|iPad/.test(ua) && !/Safari/i.test(ua))
  )
}

function copyUrl() {
  const url = window.location.href
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert('주소가 복사됐습니다.\nChrome에서 붙여넣기 해주세요.'))
  } else {
    // fallback
    const el = document.createElement('textarea')
    el.value = url
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    alert('주소가 복사됐습니다.\nChrome에서 붙여넣기 해주세요.')
  }
}

export default function LoginScreen({ loading }) {
  if (isInAppBrowser()) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-icon">🌐</div>
          <h1>Chrome으로 열어주세요</h1>
          <p>
            카카오톡 등 앱 내 브라우저에서는<br />
            Google 보안 정책으로 로그인이 차단됩니다.
          </p>

          <div className="inapp-guide">
            <div className="inapp-step">① 우측 상단 메뉴(⋮) 탭</div>
            <div className="inapp-step">② <strong>Chrome으로 열기</strong> 선택</div>
            <div className="inapp-step">③ 로그인 진행</div>
          </div>

          <p style={{ fontSize: 13, marginBottom: 8 }}>또는 주소를 복사해 Chrome에서 직접 입력:</p>
          <div className="url-box">{window.location.href}</div>
          <button className="btn-google" style={{ marginTop: 12 }} onClick={copyUrl}>
            주소 복사
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">✅</div>
        <h1>Tasks Widget</h1>
        <p>Google Tasks를 모바일에서 관리하세요</p>
        <button
          className="btn-google"
          onClick={requestSignIn}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? '연결 중…' : 'Google 계정으로 시작'}
        </button>
      </div>
    </div>
  )
}
