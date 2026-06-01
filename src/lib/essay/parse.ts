// Split a full essay into N sections aligned with the catalog.
//
// LLM essays from the existing career/love/synastry/transit/relationship
// prompts already number their sections "1.", "2.", "3."… as the first
// non-whitespace token on a line. We use that as the split anchor.

export interface ParsedSection {
  /** 1-based index. */
  index: number
  /** Full text of the section, including the "N. ..." heading line. */
  text: string
}

const HEADING = /^\s*(\d+)\.\s+/

export function splitSections(essay: string): ParsedSection[] {
  const lines = essay.split('\n')
  const headings: { line: number; idx: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADING)
    if (!m) continue
    const idx = Number(m[1])
    if (!Number.isInteger(idx) || idx < 1 || idx > 12) continue
    headings.push({ line: i, idx })
  }

  if (headings.length === 0) {
    // No numbered headings — return whole essay as single section
    return [{ index: 1, text: essay.trim() }]
  }

  // Treat anything before the first numbered heading as intro to section 1
  const intro = lines.slice(0, headings[0].line).join('\n').trim()

  const sections: ParsedSection[] = []
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]
    const next = headings[i + 1]
    const end = next ? next.line : lines.length
    let body = lines.slice(h.line, end).join('\n').trim()
    if (i === 0 && intro) body = intro + '\n\n' + body
    sections.push({ index: h.idx, text: body })
  }

  return sections
}

export function getSectionByIndex(essay: string, index: number): string | null {
  const sections = splitSections(essay)
  const s = sections.find(x => x.index === index)
  return s ? s.text : null
}
