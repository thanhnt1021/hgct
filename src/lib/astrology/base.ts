// Base utilities for knowledge-based lookup (ported from career/base.py)

export function normalizeStr(text: string | null | undefined): string {
  if (!text) return ''
  return text.normalize('NFC').trim().toLowerCase().replace(/\s+/g, '')
}

export function findColIndex(headers: unknown[], targetHeader: string): number {
  const target = normalizeStr(String(targetHeader))
  for (let i = 0; i < headers.length; i++) {
    if (normalizeStr(String(headers[i])) === target) return i
  }
  return -1
}

export function getRowValue(row: unknown[], idx: number): string {
  if (idx !== -1 && idx < row.length) {
    return String(row[idx] ?? '').trim()
  }
  return ''
}

export function formatText(text: string): string {
  if (!text) return ''
  return text.replace(/\n/g, '<br>')
}

export function lookupMatrix(matrixData: unknown[][], rowVal: string, colVal: string): string {
  if (!matrixData || matrixData.length < 2) return ''
  const headers = matrixData[0] as string[]
  const rows = matrixData.slice(1)

  const normRow = normalizeStr(rowVal)
  const normCol = normalizeStr(colVal)

  let colIdx = -1
  for (let i = 0; i < headers.length; i++) {
    if (normalizeStr(String(headers[i])) === normCol) {
      colIdx = i
      break
    }
  }
  if (colIdx === -1) return ''

  for (const row of rows) {
    const r = row as string[]
    if (r && normalizeStr(String(r[0])) === normRow) {
      if (colIdx < r.length) return String(r[colIdx]).trim()
    }
  }
  return ''
}
