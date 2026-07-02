'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { syncCharts } from '@/lib/chartStore'

interface User {
  username: string
  name: string
  email: string
  isPremium: boolean
  planType: 'free' | 'premium' | 'standard' | 'cao_cap' | 'lifetime'
  premiumToken: string
  image?: string
  uid?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  upgradeToPremium: (code: string) => Promise<{ ok: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session = null, status = 'unauthenticated' as const, update: updateSession } = useSession() ?? {}
  const [premiumOverride, setPremiumOverride] = useState<boolean | null>(null)

  type SessionUserExt = { uid?: string; username?: string; isPremium?: boolean; planType?: string; name?: string | null; email?: string | null; image?: string | null }
  const sessionUser = session?.user as SessionUserExt | undefined
  const [planTypeOverride, setPlanTypeOverride] = useState<string | null>(null)

  const user: User | null = sessionUser
    ? {
        username: sessionUser.username ?? sessionUser.name ?? sessionUser.email?.split('@')[0] ?? '',
        name: sessionUser.name ?? '',
        email: sessionUser.email ?? '',
        isPremium: premiumOverride ?? sessionUser.isPremium ?? false,
        planType: (planTypeOverride ?? sessionUser.planType ?? 'free') as User['planType'],
        premiumToken: '',
        image: sessionUser.image ?? undefined,
        uid: sessionUser.uid,
      }
    : null

  const isLoading = status === 'loading'

  // Đăng nhập → kéo lá số đã lưu từ DB gộp vào localStorage (đồng bộ mọi thiết bị/origin).
  // Đổi localStorage xong → phát event để danh sách đang mở tự nạp lại.
  useEffect(() => {
    if (!sessionUser?.uid) return
    syncCharts().then(changed => {
      if (changed && typeof window !== 'undefined') window.dispatchEvent(new Event('charts-synced'))
    })
  }, [sessionUser?.uid])

  const login = async (username: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await signIn('credentials', { username, password, redirect: false })
    if (result?.error) {
      return { ok: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' }
    }
    if (!result?.ok) return { ok: false, error: 'Đăng nhập thất bại' }
    return { ok: true }
  }

  const register = async (name: string, email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    if (!email || !password) return { ok: false, error: 'Vui lòng nhập email và mật khẩu' }
    if (password.length < 6) return { ok: false, error: 'Mật khẩu ít nhất 6 ký tự' }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Đăng ký thất bại' }
      // Auto login after register — đăng nhập bằng email
      const loginResult = await signIn('credentials', { username: email, password, redirect: false })
      if (loginResult?.error) return { ok: false, error: 'Đăng ký thành công nhưng đăng nhập thất bại' }
      return { ok: true }
    } catch {
      return { ok: false, error: 'Lỗi kết nối server' }
    }
  }

  const logout = () => {
    setPremiumOverride(null)
    setPlanTypeOverride(null)
    signOut({ callbackUrl: '/' })
  }

  const upgradeToPremium = async (code: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/user/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Mã không hợp lệ' }
      setPremiumOverride(true)
      if (data.planType) setPlanTypeOverride(data.planType)
      // Force JWT cookie re-read from DB so F5 keeps the new planType
      await updateSession?.()
      return { ok: true }
    } catch {
      return { ok: false, error: 'Lỗi kết nối server' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, upgradeToPremium }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
