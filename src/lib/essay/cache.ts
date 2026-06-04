// Persistent essay storage in DB (table `essays`), keyed by user + profile + service.
// Replaces the old /tmp filesystem cache: survives container restart/redeploy and
// stays consistent. The essay is generated ONCE per (user, profile, service);
// every section is sliced from this same row so a report never mixes content from
// two different generations.

import prisma from '@/lib/db'

export async function readEssay(userUid: string, service: string, hash: string): Promise<string | null> {
  try {
    const row = await prisma.essay.findUnique({
      where: { userUid_profileUid_service: { userUid, profileUid: hash, service } },
      select: { content: true },
    })
    return row?.content ?? null
  } catch {
    return null
  }
}

// Upsert with update:{} → keep the FIRST generated essay (consistency under races).
export async function writeEssay(userUid: string, service: string, hash: string, text: string, name?: string): Promise<void> {
  try {
    await prisma.essay.upsert({
      where: { userUid_profileUid_service: { userUid, profileUid: hash, service } },
      create: { userUid, profileUid: hash, service, content: text, name: name ?? null },
      update: {},
    })
  } catch {
    // best-effort — caller still holds the generated text in-memory for this request
  }
}

export async function hasEssay(userUid: string, service: string, hash: string): Promise<boolean> {
  return (await readEssay(userUid, service, hash)) != null
}
