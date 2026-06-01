// /reading without a profile → fall back to services landing.
// The canonical reading URL is /reading/[profileUid]/[service].

import { redirect } from 'next/navigation'

export default function ReadingIndexPage() {
  redirect('/services')
}
