import prisma from '@/lib/db'

export async function getKnowledgeFromDB(): Promise<Record<string, unknown[][]>> {
  const entries = await prisma.knowledgeBase.findMany()
  const result: Record<string, unknown[][]> = {}
  for (const entry of entries) {
    result[entry.tabName] = (entry.data as unknown[][]) || []
  }
  return result
}
