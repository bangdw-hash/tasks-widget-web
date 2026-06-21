import { useState } from 'react'
import { saveSettings, applySettings, DEFAULTS } from '../cloudSettings.js'

// Google Fonts로 제공되는 폰트는 선택 시 동적으로 로드
const FONT_GROUPS = [
  {
    label: '시스템',
    fonts: [
      { value: 'system-ui',           name: '시스템 기본' },
      { value: 'Malgun Gothic',        name: '맑은 고딕 (Windows)' },
      { value: 'Apple SD Gothic Neo',  name: 'Apple SD 고딕 Neo (Mac)' },
      { value: 'Segoe UI',             name: 'Segoe UI (Windows)' },
    ],
  },
  {
    label: '고딕 / 산세리프',
    fonts: [
      { value: 'Noto Sans KR',         name: 'Noto Sans KR',    google: true },
      { value: 'Gothic A1',            name: 'Gothic A1',        google: true },
      { value: 'IBM Plex Sans KR',     name: 'IBM Plex Sans KR', google: true },
      { value: 'NanumGothic',          name: '나눔고딕',          google: true },
      { value: 'Do Hyeon',             name: '도현체',            google: true },
      { value: 'Black Han Sans',       name: '검은고딕',          google: true },
      { value: 'Jua',                  name: '주아체',            google: true },
      { value: 'Sunflower',            name: '선플라워',          google: true },
      { value: 'Hahmlet',              name: '함렛',             google: true },
    ],
  },
  {
    label: '명조 / 세리프',
    fonts: [
      { value: 'Noto Serif KR',        name: 'Noto Serif KR',   google: true },
      { value: 'NanumMyeongjo',        name: '나눔명조',          google: true },
    ],
  },
  {
    label: '손글씨 / 디자인',
    fonts: [
      { value: 'Gaegu',                name: '개구체 (Gaegu)',   google: true },
      { value: 'Poor Story',           name: '가난한이야기',      google: true },
      { value: 'Single Day',           name: 'Single Day',       google: true },
      { value: 'Cute Font',            name: 'Cute Font',        google: true },
    ],
  },
]

const ALL_FONTS = FONT_GROUPS.flatMap(g => g.fonts)

function loadGoogleFont(name) {
  const id = `gf-${name.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id   = id
  link.rel  = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}&display=swap`
  document.head.appendChild(link)
}

// 설정 패널 열릴 때 현재 선택된 폰트 미리 로드
ALL_FONTS.filter(f => f.google).forEach(f => {
  // 실제 선택 시에만 로드하므로 여기서는 로드하지 않음
})

export default function SettingsPanel({ settings, onClose, onUpdate }) {
  const [local, setLocal]   = useState(settings)
  const [saving, setSaving] = useState(false)
  const [synced, setSynced] = useState(false)

  const update = (key, val) => {
    if (key === 'font_family') {
      const font = ALL_FONTS.find(f => f.value === val)
      if (font?.google) loadGoogleFont(val)
    }
    const next = { ...local, [key]: val }
    setLocal(next)
    applySettings(next)
  }

  const handleSave = async () => {
    setSaving(true)
    await saveSettings(local)
    setSaving(false)
    setSynced(true)
    onUpdate(local)
    setTimeout(onClose, 700)
  }

  const handleReset = () => {
    setLocal(DEFAULTS)
    applySettings(DEFAULTS)
  }

  const currentFont = ALL_FONTS.find(f => f.value === local.font_family)

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-hdr">
          <span className="settings-title">화면 설정</span>
          <button className="hdr-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="field">
            <label className="field-label">배경색</label>
            <div className="color-row">
              <input
                type="color"
                className="color-swatch"
                value={local.bg_color}
                onChange={e => update('bg_color', e.target.value)}
              />
              <span className="color-hex">{local.bg_color}</span>
            </div>
          </div>

          <div className="field">
            <label className="field-label">글자색</label>
            <div className="color-row">
              <input
                type="color"
                className="color-swatch"
                value={local.text_color}
                onChange={e => update('text_color', e.target.value)}
              />
              <span className="color-hex">{local.text_color}</span>
            </div>
          </div>

          <div className="field">
            <label className="field-label">글꼴</label>

            {/* 미리보기 */}
            <div
              className="font-preview"
              style={{ fontFamily: `'${local.font_family}', sans-serif` }}
            >
              가나다라 ABC 123
            </div>

            <select
              className="field-input"
              value={local.font_family}
              onChange={e => update('font_family', e.target.value)}
            >
              {FONT_GROUPS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.fonts.map(f => (
                    <option key={f.value} value={f.value}>{f.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label">글자 크기 — {local.font_size}px</label>
            <input
              type="range"
              min="11"
              max="20"
              value={local.font_size}
              onChange={e => update('font_size', parseInt(e.target.value, 10))}
              className="size-slider"
            />
            <div className="size-labels">
              <span>11px</span><span>20px</span>
            </div>
          </div>

          <p className="sync-hint">
            저장하면 PC 위젯과 설정이 동기화됩니다.
          </p>
        </div>

        <div className="settings-footer">
          <button className="btn-cancel" onClick={handleReset}>기본값</button>
          <button className="btn-submit" onClick={handleSave} disabled={saving}>
            {synced ? '✓ 동기화 완료' : saving ? '저장 중…' : '저장 및 동기화'}
          </button>
        </div>
      </div>
    </>
  )
}
