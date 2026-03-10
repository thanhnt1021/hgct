'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  username: string
  name: string
  email: string
  isPremium: boolean
  premiumToken: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (username: string, name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  upgradeToPremium: (code: string) => Promise<{ ok: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | null>(null)

const LS_AUTH = 'hatgiong_auth'
const LS_USERS = 'hatgiong_users'

type UserRecord = { name: string; email: string; passwordHash: string; isPremium?: boolean; premiumToken?: string }
function getUsers(): Record<string, UserRecord> {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || '{}') } catch { return {} }
}
function saveUsers(users: Record<string, UserRecord>) {
  localStorage.setItem(LS_USERS, JSON.stringify(users))
}

// Simple hash (not cryptographic — mock only)
function simpleHash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i)
  return (h >>> 0).toString(16)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_AUTH)
      if (stored) setUser(JSON.parse(stored))
    } catch { /* ignore */ }
    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    const users = getUsers()
    const u = users[username.toLowerCase()]
    if (!u || u.passwordHash !== simpleHash(password)) {
      return { ok: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' }
    }
    const userData: User = {
      username: username.toLowerCase(),
      name: u.name,
      email: u.email,
      isPremium: u.isPremium ?? false,
      premiumToken: u.premiumToken ?? '',
    }
    localStorage.setItem(LS_AUTH, JSON.stringify(userData))
    setUser(userData)
    return { ok: true }
  }

  const register = async (username: string, name: string, email: string, password: string) => {
    if (!username || !name || !email || !password) return { ok: false, error: 'Vui lòng điền đầy đủ thông tin' }
    if (password.length < 6) return { ok: false, error: 'Mật khẩu ít nhất 6 ký tự' }
    const users = getUsers()
    const key = username.toLowerCase()
    if (users[key]) return { ok: false, error: 'Tên đăng nhập đã tồn tại' }
    users[key] = { name, email, passwordHash: simpleHash(password) }
    saveUsers(users)
    const userData: User = { username: key, name, email, isPremium: false, premiumToken: '' }
    localStorage.setItem(LS_AUTH, JSON.stringify(userData))
    setUser(userData)
    return { ok: true }
  }

  const logout = () => {
    localStorage.removeItem(LS_AUTH)
    setUser(null)
  }

  const upgradeToPremium = async (code: string) => {
    try {
      const res = await fetch('/api/user/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) return { ok: false, error: data.error || 'Mã không hợp lệ' }

      const updated = { ...user!, isPremium: true, premiumToken: data.token }
      localStorage.setItem(LS_AUTH, JSON.stringify(updated))
      // Persist premium status to user DB so it survives logout/login
      const users = getUsers()
      const key = updated.username
      if (users[key]) {
        users[key] = { ...users[key], isPremium: true, premiumToken: data.token }
        saveUsers(users)
      }
      setUser(updated)
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
