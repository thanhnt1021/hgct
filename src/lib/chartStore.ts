// Lưu bản đồ sao trong BROWSER (localStorage) — không cần đăng nhập.
// Mỗi bản đồ có id riêng → URL /ket-qua/[id], giữ tới khi user xoá cache/cookies.
// Chỉ gọi ở client (dùng localStorage).

type ViewKind = 'cores' | 'houses' | 'love' | 'synastry' | 'transit'
type PersonData = {
  name?: string; ten?: string
  dob?: { day: number; month: number; year: number }
  tob?: { hour: number; minute: number; unknown?: boolean }
  loc?: { address?: string; lat?: number; lon?: number; tz?: string }
}

export type SavedChart = {
  id: string
  name: string
  inputData: unknown
  savedAt: number
  view?: ViewKind   // cores=form S2 (3 lõi); houses=career/transit nhà trội; love=Tình duyên; synastry=Cặp đôi
  service?: string
  inputDataB?: unknown
}

const KEY = 'astros_charts'
const pad = (n?: number) => String(n ?? 0).padStart(2, '0')

function readAll(): Record<string, SavedChart> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function writeAll(m: Record<string, SavedChart>) {
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* quota / private mode */ }
}
function newId(): string { return `${Date.now()}${Math.floor(Math.random() * 100)}` }

// Khóa định danh 1 NGƯỜI = tên + ngày + giờ + nơi sinh (để gộp danh sách, không trùng)
function personKey(d?: PersonData): string {
  if (!d) return ''
  const t = d.tob?.unknown ? 'u' : `${d.tob?.hour}:${d.tob?.minute}`
  return `${(d.name || d.ten || '').trim().toLowerCase()}|${d.dob?.day}-${d.dob?.month}-${d.dob?.year}|${t}|${d.loc?.lat},${d.loc?.lon}`
}
// Khóa đầy đủ 1 LƯỢT XEM = người A + view + service + người B (để không tạo entry trùng khi điều hướng lại)
function fullKey(a?: PersonData, opts?: { view?: ViewKind; service?: string; inputDataB?: unknown }): string {
  return `${personKey(a)}#${opts?.view || 'cores'}#${opts?.service || ''}#${personKey(opts?.inputDataB as PersonData)}`
}

// Nhãn hiển thị đầy đủ trong dropdown: Tên · DD/MM/YYYY · HH:MM · Nơi sinh
export function personLabel(c: SavedChart): string {
  const d = c.inputData as PersonData
  const name = d?.name || d?.ten || 'Lá số'
  const dob = d?.dob ? `${pad(d.dob.day)}/${pad(d.dob.month)}/${d.dob.year}` : ''
  const tob = d?.tob?.unknown ? 'Không rõ giờ' : (d?.tob ? `${pad(d.tob.hour)}:${pad(d.tob.minute)}` : '')
  const loc = d?.loc?.address || ''
  return [name, dob, tob, loc].filter(Boolean).join(' · ')
}

export function saveChart(
  inputData: { name?: string; ten?: string },
  opts: { view?: ViewKind; service?: string; inputDataB?: unknown } = {},
): string {
  const m = readAll()
  const fk = fullKey(inputData as PersonData, opts)
  // Đã có đúng lượt xem này (cùng người + view + service + người B) → tái dùng, không tạo trùng
  const existing = Object.values(m).find(c => fullKey(c.inputData as PersonData, { view: c.view, service: c.service, inputDataB: c.inputDataB }) === fk)
  if (existing) { existing.savedAt = Date.now(); writeAll(m); return existing.id }
  const id = newId()
  m[id] = {
    id, name: inputData.name || inputData.ten || 'Lá số', inputData, savedAt: Date.now(),
    view: opts.view || 'cores', service: opts.service, inputDataB: opts.inputDataB,
  }
  writeAll(m)
  return id
}

export function getChart(id: string): SavedChart | null {
  return readAll()[id] || null
}

// Danh sách DUY NHẤT theo người (gộp mọi view của cùng 1 người) — mới nhất trước.
// Dùng chung cho mọi dropdown (S1 modal + S2 form + người thứ 2) → luôn sync 1 danh sách.
export function listCharts(): SavedChart[] {
  const all = Object.values(readAll()).sort((a, b) => b.savedAt - a.savedAt)
  const seen = new Set<string>()
  const out: SavedChart[] = []
  for (const c of all) {
    const k = personKey(c.inputData as PersonData)
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

export function deleteChart(id: string) {
  const m = readAll()
  delete m[id]
  writeAll(m)
}
