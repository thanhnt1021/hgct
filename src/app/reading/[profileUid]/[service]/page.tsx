// Profile-scoped reading view. URL: /reading/{profileUid}/{service}
// profileUid = 16-char hash of input data → stable per (data, person).
// 1 user can have many profiles → many URLs → easy to bookmark + revisit.

import ReadingClient from './ReadingClient'
import { CATALOG } from '@/lib/catalog/sections'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReadingPage({
  params,
}: {
  params: Promise<{ profileUid: string; service: string }>
}) {
  const { profileUid, service } = await params
  if (!/^[a-f0-9]{16}$/.test(profileUid)) notFound()
  if (!CATALOG[service]) notFound()
  return <ReadingClient profileUid={profileUid} service={service} />
}
