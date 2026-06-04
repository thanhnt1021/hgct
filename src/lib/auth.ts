import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { createHash, randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from './db'

// Legacy SHA256 (migration only — do NOT use for new passwords)
function sha256Hash(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Dual-mode verify: try bcrypt first, fallback SHA256 → rehash silently
async function verifyPassword(password: string, hash: string, userUid: string): Promise<boolean> {
  const bcryptMatch = await bcrypt.compare(password, hash)
  if (bcryptMatch) return true

  // Legacy SHA256 check
  if (sha256Hash(password) === hash) {
    // Rehash with bcrypt on next login — transparent migration
    const newHash = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { userUid }, data: { passwordHash: newHash } }).catch(() => {})
    return true
  }
  return false
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const cleanInput = credentials.username.trim().toLowerCase()
        const user = await prisma.user.findFirst({
          where: { OR: [{ username: cleanInput }, { email: cleanInput }] },
        })

        if (user && await verifyPassword(credentials.password, user.passwordHash, user.userUid)) {
          return { id: user.userUid, name: user.username, email: user.email }
        }
        return null
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: { strategy: 'jwt' as const, maxAge: 30 * 24 * 60 * 60 },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token-v2'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.hatgiongchiemtinh.com' : undefined,
      },
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      if (trigger === 'update' && token.uid) {
        const dbUser = await prisma.user.findUnique({
          where: { userUid: token.uid as string },
          select: { isPremium: true, planType: true },
        })
        if (dbUser) {
          token.isPremium = dbUser.isPremium
          token.planType = dbUser.planType
        }
        return token
      }
      if (user) {
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({ where: { email: user.email as string } })
          token.uid = dbUser?.userUid ?? ''
          token.isPremium = dbUser?.isPremium ?? false
          token.planType = dbUser?.planType ?? 'free'
          token.username = dbUser?.username ?? ''
        } else {
          token.uid = user.id
          const dbUser = await prisma.user.findUnique({ where: { userUid: user.id as string } })
          token.isPremium = dbUser?.isPremium ?? false
          token.planType = dbUser?.planType ?? 'free'
          token.username = dbUser?.username ?? ''
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).uid = token.uid
        ;(session.user as any).isPremium = token.isPremium ?? false
        ;(session.user as any).planType = token.planType ?? 'free'
        ;(session.user as any).username = token.username ?? ''
      }
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } })
        if (!existing) {
          // User Google mới → tự tạo tài khoản (không mật khẩu credentials).
          const base = (user.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_.]/g, '') || 'user'
          let username = base
          for (let i = 0; i < 6; i++) {
            const taken = await prisma.user.findUnique({ where: { username } })
            if (!taken) break
            username = `${base}${Math.floor(1000 + Math.random() * 9000)}`
          }
          try {
            await prisma.user.create({
              data: {
                username,
                email: user.email,
                // passwordHash NOT NULL → đặt hash ngẫu nhiên không dùng được để login mật khẩu
                passwordHash: await bcrypt.hash(randomUUID(), 12),
                userUid: randomUUID(),
                createdAt: new Date().toISOString(),
              },
            })
          } catch (e) {
            console.error('[auth] tạo user Google thất bại:', e)
            return false
          }
        }
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      // Allow redirects to any subdomain of hatgiongchiemtinh.com (e.g. demo.)
      if (url.startsWith('https://') && url.includes('.hatgiongchiemtinh.com')) return url
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith('/')) return `${baseUrl}${url}`
      return baseUrl
    },
  },
}
