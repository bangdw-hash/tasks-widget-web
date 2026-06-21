import { useState } from 'react'
import { saveSettings, applySettings, DEFAULTS } from '../cloudSettings.js'

const FONTS = [
  { value: 'Malgun Gothic',        label: '맑은 고딕 (Windows)' },
  { value: 'Apple SD Gothic Neo',  label: 'Apple SD 고딕 Neo' },
  { value: 'NanumGothic',          label: '나눔고딕' },
  { value: 'system-ui',            label: '시스템 기본' },
]

export default function SettingsPanel({ settings, onClose, onUpdate }) {
  const [local, setLocal]   = useState(settings)
  const [saving, setSaving] = useState(false)
  const [synced, setSynced] = useState(false)

  const update = (key, val) => {
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
    setTimeout(onClose, 600)
  }

  const handleReset = () => {
    setLocal(DEFAULTS)
    applySettings(DEFAULTS)
  }

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
            <select
              className="field-input"
              value={local.font_family}
              onChange={e => update('font_family', e.target.value)}
            >
              {FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
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
              <span>11</span><span>20</span>
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
