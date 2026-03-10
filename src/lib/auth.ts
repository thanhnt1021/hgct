import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { createHash } from 'crypto'
import prisma from './db'

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
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

        if (user && user.passwordHash === hashPassword(credentials.password)) {
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
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id
        const dbUser = await prisma.user.findUnique({ where: { userUid: user.id as string } })
        token.isPremium = dbUser?.isPremium ?? false
        token.username = dbUser?.username ?? ''
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).uid = token.uid
        ;(session.user as any).isPremium = token.isPremium ?? false
        ;(session.user as any).username = token.username ?? ''
      }
      return session
    },
    async signIn({ user, account }) {
      // For Google OAuth, auto-create user if not exists
      if (account?.provider === 'google' && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } })
        if (!existing) {
          const uid = crypto.randomUUID()
          await prisma.user.create({
            data: {
              username: user.email.split('@')[0].toLowerCase(),
              email: user.email,
              passwordHash: '',
              userUid: uid,
              createdAt: new Date().toISOString(),
            },
          })
        }
      }
      return true
    },
  },
}
