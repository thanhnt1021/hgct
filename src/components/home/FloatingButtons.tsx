'use client'

// VISUAL ONLY — floating contact buttons restyled

export default function FloatingButtons() {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* Facebook Messenger */}
      <a
        href="https://m.me/hatgiongchiemtinh"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat Facebook"
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: 'rgba(11,11,31,0.9)',
          border: '1px solid rgba(200,148,63,0.25)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,148,63,0.55)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(0,0,0,0.6)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,148,63,0.25)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        <svg className="w-5 h-5" fill="#d9ab55" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.892 1.434 5.472 3.678 7.159V22l3.37-1.852c.9.25 1.855.385 2.952.385 5.523 0 10-4.145 10-9.243S17.523 2 12 2zm1.067 12.455l-2.545-2.718-4.97 2.718 5.467-5.804 2.608 2.718 4.907-2.718-5.467 5.804z"/>
        </svg>
      </a>

      {/* Zalo */}
      <a
        href="https://zalo.me/hatgiongchiemtinh"
        target="_blank"
        rel="noopener noreferrer"
        title="Chat Zalo"
        style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: 'rgba(11,11,31,0.9)',
          border: '1px solid rgba(200,148,63,0.25)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,148,63,0.55)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(0,0,0,0.6)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(200,148,63,0.25)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)'
        }}
      >
        <span
          style={{
            color: '#d9ab55',
            fontFamily: 'var(--font-vietnam)',
            fontWeight: 700,
            fontSize: '0.65rem',
            letterSpacing: '0.05em',
          }}
        >
          Zalo
        </span>
      </a>
    </div>
  )
}
