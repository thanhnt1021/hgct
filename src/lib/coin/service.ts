// Atomic coin balance operations + audit log.
// Every change goes through addCoin / deductCoin so balanceAfter stays correct
// and there is always a row in coin_transactions.

import prisma from '@/lib/db'
import type { Prisma } from '@prisma/client'

export type RefType = 'topup' | 'deduct' | 'seed' | 'refund' | 'admin'

export class InsufficientCoinError extends Error {
  constructor(public have: number, public need: number) {
    super(`Insufficient coin: have ${have}, need ${need}`)
    this.name = 'InsufficientCoinError'
  }
}

interface CoinOpInput {
  userUid: string
  amount: number              // must be > 0
  reason: string              // short label, e.g. 'topup-COIN002', 'unlock-career-3'
  refType: RefType
  refId?: string | null
  tx?: Prisma.TransactionClient
}

async function runOp(input: CoinOpInput, signedDelta: number) {
  const { userUid, reason, refType, refId, tx } = input

  const exec = async (db: Prisma.TransactionClient) => {
    const updated = await db.user.update({
      where: { userUid },
      data: {
        coin: { increment: signedDelta },
        coinUpdatedAt: new Date(),
      },
      select: { coin: true },
    })

    if (updated.coin < 0) {
      // Roll back via thrown error inside the transaction
      throw new InsufficientCoinError(updated.coin - signedDelta, Math.abs(signedDelta))
    }

    await db.coinTransaction.create({
      data: {
        userUid,
        delta: signedDelta,
        balanceAfter: updated.coin,
        reason,
        refType,
        refId: refId ?? null,
      },
    })

    return updated.coin
  }

  if (tx) return exec(tx)
  return prisma.$transaction(exec)
}

export function addCoin(input: CoinOpInput): Promise<number> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('addCoin: amount must be a positive integer')
  }
  return runOp(input, input.amount)
}

export function deductCoin(input: CoinOpInput): Promise<number> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('deductCoin: amount must be a positive integer')
  }
  return runOp(input, -input.amount)
}

export async function getBalance(userUid: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { userUid },
    select: { coin: true },
  })
  return u?.coin ?? 0
}
