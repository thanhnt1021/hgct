import prisma from './db'

export const SERVICES = ['career', 'love', 'synastry', 'transit'] as const
export type ServiceKey = typeof SERVICES[number]

export const SERVICE_LABELS: Record<string, string> = {
  career: 'Hướng Nghiệp',
  love: 'Tình Duyên',
  synastry: 'Cặp Đôi',
  transit: 'Vận Hạn',
}

export const SERVICE_ICONS: Record<string, string> = {
  career: '🎯',
  love: '💝',
  synastry: '💑',
  transit: '🔮',
}

const DEFAULTS: Record<string, number> = {
  career: 3333,
  love: 3333,
  synastry: 3333,
  transit: 3333,
}

export function priceKey(service: string): string {
  return `price_${service}`
}

/** Get price for a single service. Falls back to legacy global key → hardcoded default. */
export async function getPrice(service: string): Promise<number> {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: [priceKey(service), 'service_price'] } },
    })
    const map = Object.fromEntries(rows.map(r => [r.key, parseInt(r.value, 10)]))
    const specific = map[priceKey(service)]
    // Bug #28 fix: use >= 0 so admin-set price=0 is returned instead of falling through to default
    if (!isNaN(specific) && specific >= 0) return specific
    const global = map['service_price']
    if (!isNaN(global) && global >= 0) return global
  } catch { /* ignore */ }
  return DEFAULTS[service] ?? 3333
}

/** Get all 4 service prices in one DB query. */
export async function getAllPrices(): Promise<Record<string, number>> {
  try {
    const rows = await prisma.config.findMany({
      where: { key: { in: [...SERVICES.map(priceKey), 'service_price'] } },
    })
    const map = Object.fromEntries(rows.map(r => [r.key, parseInt(r.value, 10)]))
    const globalFb = map['service_price']
    return Object.fromEntries(
      SERVICES.map(svc => {
        const v = map[priceKey(svc)]
        // Bug #28 fix: use >= 0 so admin-set price=0 is returned instead of falling through to default
        const price =
          !isNaN(v) && v >= 0
            ? v
            : !isNaN(globalFb) && globalFb >= 0
              ? globalFb
              : DEFAULTS[svc]
        return [svc, price]
      }),
    )
  } catch {
    return Object.fromEntries(SERVICES.map(s => [s, DEFAULTS[s]]))
  }
}

export async function setPrice(service: string, price: number): Promise<void> {
  await prisma.config.upsert({
    where: { key: priceKey(service) },
    update: { value: String(price) },
    create: { key: priceKey(service), value: String(price) },
  })
}

export async function setAllPrices(price: number): Promise<void> {
  await Promise.all(
    SERVICES.map(svc =>
      prisma.config.upsert({
        where: { key: priceKey(svc) },
        update: { value: String(price) },
        create: { key: priceKey(svc), value: String(price) },
      }),
    ),
  )
}
