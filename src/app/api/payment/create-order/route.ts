import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const VALID_SERVICES = ['career', 'love', 'synastry', 'transit']

async function getServicePrice(): Promise<number> {
  try {
    const cfg = await prisma.config.findUnique({ where: { key: 'service_price' } })
    const price = cfg ? parseInt(cfg.value, 10) : NaN
    return isNaN(price) || price <= 0 ? 3333 : price
  } catch {
    return 3333
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { service, inputData, email, inputDataB, profileUidA, profileUidB, startDate, endDate } =
      body as {
        service: string
        inputData: Record<string, unknown>
        email: string
        inputDataB?: Record<string, unknown>
        profileUidA?: string
        profileUidB?: string
        startDate?: string
        endDate?: string
      }

    if (!service || !inputData || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!VALID_SERVICES.includes(service)) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }

    const amount = await getServicePrice()

    const session = await getServerSession(authOptions)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userUid = (session?.user as any)?.uid as string | undefined

    // Create order first to get the auto-increment ID
    const order = await prisma.order.create({
      data: {
        userUid: userUid ?? null,
        service,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profileData: inputData as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        profileDataB: (inputDataB ?? null) as any,
        profileUidA: profileUidA ?? null,
        profileUidB: profileUidB ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        email,
        status: 'pending',
        paymentStatus: 'unpaid',
        amount,
      },
    })

    // Generate transferCode from orderId: HGCT + 6-digit padded ID
    const transferCode = `HGCT${order.id.toString().padStart(6, '0')}`

    // Update order with transferCode
    await prisma.order.update({
      where: { id: order.id },
      data: { transferCode },
    })

    return NextResponse.json({
      orderId: order.id,
      transferCode,
      amount,
      bankAccount: process.env.BANK_ACCOUNT_NUMBER || '',
      bankName: process.env.BANK_NAME || '',
      bankAccountName: process.env.BANK_ACCOUNT_NAME || '',
    })
  } catch (error) {
    console.error('[create-order] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
