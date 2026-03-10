'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'

export default function GoogleSignInButton({ callbackUrl = '/profile' }: { callbackUrl?: string }) {
  const [available, setAvailable] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if Google provider is configured
    fetch('/api/auth/providers')
      .then(r => r.json())
      .then(providers => { if (providers?.google) setAvailable(true) })
      .catch(() => {})
  }, [])

  if (!available) return null

  const handleClick = () => {
    setLoading(true)
    signIn('google', { callbackUrl, redirect: true })
    // Safety: reset loading if somehow the redirect didn't navigate away (e.g. popup blocked)
    setTimeout(() => setLoading(false), 10000)
  }

  return (
    <>
      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(200,148,63,0.15)' }} />
        <span style={{ color: '#6b7280', fontFamily: 'var(--font-vietnam)', fontSize: '0.75rem' }}>hoặc</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(200,148,63,0.15)' }} />
      </div>

      {/* Google Button */}
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          borderRadius: '4px',
          background: loading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#e8e0d0',
          fontFamily: 'var(--font-vietnam)',
          fontSize: '0.88rem',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)' }}
        onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)' }}
      >
        {/* Google G icon */}
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        {loading ? 'Đang chuyển hướng...' : 'Tiếp tục với Google'}
      </button>
    </>
  )
}
