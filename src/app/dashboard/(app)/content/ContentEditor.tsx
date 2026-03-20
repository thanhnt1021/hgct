'use client'

import { useState } from 'react'

interface TextField {
  key: string
  label: string
  description: string
  multiline?: boolean
  defaultValue: string
  section: string
}

const FIELDS: TextField[] = [
  // ── Trang chủ ──────────────────────────────────────────────────
  {
    key: 'hero_subtitle',
    label: 'Hero — Mô tả',
    description: 'Đoạn văn dưới headline trên trang chủ',
    multiline: true,
    section: 'Trang Chủ',
    defaultValue: 'Bầu trời lúc bạn chào đời không hề ngẫu nhiên. Mỗi hành tinh là một dấu ấn – mỗi góc chiếu là một câu chuyện về bạn. Bản đồ sao chính là hạt giống tiềm năng đang chờ bạn khám phá và đánh thức. Hiểu bản đồ sao là bắt đầu hành trình hiểu mình – để chọn đúng đường, đi đúng hướng và tìm đúng người đồng hành.',
  },
  {
    key: 'hero_cta_text',
    label: 'Hero — Nút CTA',
    description: 'Text trên nút chính ở hero section',
    section: 'Trang Chủ',
    defaultValue: 'Khám phá ngay tại đây',
  },
  {
    key: 'cta_body',
    label: 'CTA Section — Đoạn văn',
    description: 'Đoạn văn trong khung CTA cuối trang',
    multiline: true,
    section: 'Trang Chủ',
    defaultValue: 'Bạn không tình cờ lạc vào trang này đâu. Có thể vũ trụ đã sắp xếp một chút... hoặc một người bạn nào đó đưa bạn đến đây..\nNhưng nếu bạn đang đọc đến dòng này, có lẽ trong lòng bạn cũng đang có vài câu hỏi băn khoăn về bản thân, tình yêu hay con đường phía trước. Và biết đâu, câu trả lời đó đang nằm trong bản đồ sao của bạn.',
  },
  {
    key: 'cta_button_text',
    label: 'CTA Section — Nút',
    description: 'Text trên nút trong khung CTA cuối trang',
    section: 'Trang Chủ',
    defaultValue: 'Khám phá tại đây',
  },
  // ── Trang dịch vụ ──────────────────────────────────────────────
  {
    key: 'service_career_name',
    label: 'Hướng Nghiệp — Tên',
    description: 'Tên hiển thị trên card dịch vụ',
    section: 'Trang Dịch Vụ',
    defaultValue: 'Hướng Nghiệp',
  },
  {
    key: 'service_career_desc',
    label: 'Hướng Nghiệp — Mô tả',
    description: 'Đoạn mô tả ngắn trên card dịch vụ (\\n\\n để xuống đoạn)',
    multiline: true,
    section: 'Trang Dịch Vụ',
    defaultValue: 'Bạn đang loay hoay giữa nhiều lựa chọn, không chắc mình thực sự phù hợp với điều gì và nên đi theo hướng nào để vừa phát triển vừa có thu nhập tốt?\n\n→ Mỗi người đều mang trong mình một "hạt giống" riêng. Hiểu đúng hạt giống của bạn để chọn đúng hướng đi, phát triển đúng cách và xây dựng sự nghiệp – tài chính bền vững.',
  },
  {
    key: 'service_love_name',
    label: 'Tình Duyên — Tên',
    description: 'Tên hiển thị trên card dịch vụ',
    section: 'Trang Dịch Vụ',
    defaultValue: 'Tình Duyên',
  },
  {
    key: 'service_love_desc',
    label: 'Tình Duyên — Mô tả',
    description: 'Đoạn mô tả ngắn trên card dịch vụ',
    multiline: true,
    section: 'Trang Dịch Vụ',
    defaultValue: 'Bạn yêu như thế nào, và đâu là kiểu người khiến trái tim bạn thực sự bình yên?\n\n→ Bản luận giải này giúp bạn hiểu cách mình yêu, người phù hợp và cách xây dựng một mối quan hệ sâu sắc, bền vững.',
  },
  {
    key: 'service_synastry_name',
    label: 'Cặp Đôi — Tên',
    description: 'Tên hiển thị trên card dịch vụ',
    section: 'Trang Dịch Vụ',
    defaultValue: 'Cặp Đôi',
  },
  {
    key: 'service_synastry_desc',
    label: 'Cặp Đôi — Mô tả',
    description: 'Đoạn mô tả ngắn trên card dịch vụ',
    multiline: true,
    section: 'Trang Dịch Vụ',
    defaultValue: 'Vì sao hai bạn gặp nhau, điều gì khiến hai người thu hút nhau và những thử thách nào đang ẩn dấu trong mối quan hệ này?\n\n→ Bản luận giải này giúp bạn nhìn rõ sự hòa hợp, khác biệt và chìa khóa để mối quan hệ phát triển bền vững hơn.',
  },
  {
    key: 'service_transit_name',
    label: 'Vận Hạn — Tên',
    description: 'Tên hiển thị trên card dịch vụ',
    section: 'Trang Dịch Vụ',
    defaultValue: 'Vận Hạn',
  },
  {
    key: 'service_transit_desc',
    label: 'Vận Hạn — Mô tả',
    description: 'Đoạn mô tả ngắn trên card dịch vụ',
    multiline: true,
    section: 'Trang Dịch Vụ',
    defaultValue: 'Thời gian này bạn nên mở rộng, hay cần chậm lại một chút để nhìn rõ hơn?\n\n→ Bản luận giải giúp bạn hiểu rõ giai đoạn mình đang trải qua và lựa chọn hướng đi phù hợp hơn.',
  },
]

const SECTIONS = ['Trang Chủ', 'Trang Dịch Vụ']

export default function ContentEditor({ initialValues }: { initialValues: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of FIELDS) init[f.key] = initialValues[f.key] ?? f.defaultValue
    return init
  })
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState<Record<string, boolean>>({})

  function onChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }))
    setDirty((prev) => ({ ...prev, [key]: true }))
    setError(null)
  }

  async function save(key: string) {
    setSaving(key)
    setError(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: values[key] }),
      })
      if (res.ok) {
        setDirty((prev) => ({ ...prev, [key]: false }))
        setSaved(key)
        setTimeout(() => setSaved(null), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(`Lỗi ${res.status}: ${data.error ?? 'Không lưu được — kiểm tra lại đăng nhập'}`)
      }
    } catch (e: any) {
      setError(`Lỗi kết nối: ${e.message}`)
    }
    setSaving(null)
  }

  async function reset(field: TextField) {
    setError(null)
    const defaultVal = field.defaultValue
    setValues((prev) => ({ ...prev, [field.key]: defaultVal }))
    setDirty((prev) => ({ ...prev, [field.key]: false }))
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: field.key, value: defaultVal }),
      })
      if (res.ok) {
        setSaved(field.key)
        setTimeout(() => setSaved(null), 2500)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(`Lỗi ${res.status}: ${data.error ?? 'Không reset được'}`)
      }
    } catch (e: any) {
      setError(`Lỗi kết nối: ${e.message}`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40, maxWidth: 680 }}>
      {error && (
        <div style={{
          background: 'rgba(220,38,38,0.12)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 8,
          padding: '10px 16px',
          color: '#f87171',
          fontSize: '0.82rem',
        }}>
          ⚠ {error}
        </div>
      )}

      {SECTIONS.map((section) => {
        const sectionFields = FIELDS.filter((f) => f.section === section)
        return (
          <div key={section}>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#c9a84c',
              textTransform: 'uppercase',
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(201,168,76,0.15)',
            }}>
              {section}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sectionFields.map((field) => (
                <div
                  key={field.key}
                  style={{
                    background: '#13131f',
                    border: `1px solid ${dirty[field.key] ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.10)'}`,
                    borderRadius: 10,
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#e8e0f0' }}>{field.label}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b6585', marginTop: 2 }}>{field.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12, alignItems: 'center' }}>
                      {saved === field.key && (
                        <span style={{ fontSize: '0.73rem', color: '#4ade80' }}>✓ Đã lưu</span>
                      )}
                      <button
                        onClick={() => reset(field)}
                        style={{
                          padding: '3px 9px',
                          background: 'none',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 5,
                          color: '#6b6585',
                          cursor: 'pointer',
                          fontSize: '0.7rem',
                        }}
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => save(field.key)}
                        disabled={saving === field.key || !dirty[field.key]}
                        style={{
                          padding: '3px 13px',
                          background: 'rgba(201,168,76,0.15)',
                          border: '1px solid rgba(201,168,76,0.35)',
                          borderRadius: 5,
                          color: '#c9a84c',
                          cursor: dirty[field.key] ? 'pointer' : 'not-allowed',
                          fontSize: '0.76rem',
                          opacity: (saving === field.key || !dirty[field.key]) ? 0.45 : 1,
                        }}
                      >
                        {saving === field.key ? '…' : 'Lưu'}
                      </button>
                    </div>
                  </div>

                  {field.multiline ? (
                    <textarea
                      value={values[field.key]}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        background: '#0a0a16',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 6,
                        padding: '10px 12px',
                        color: '#e8e0f0',
                        fontSize: '0.83rem',
                        lineHeight: 1.6,
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'var(--font-vietnam)',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[field.key]}
                      onChange={(e) => onChange(field.key, e.target.value)}
                      style={{
                        width: '100%',
                        background: '#0a0a16',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 6,
                        padding: '8px 12px',
                        color: '#e8e0f0',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontFamily: 'var(--font-vietnam)',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
