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
// Cặp đôi (có người B): danh tính BẤT BIẾN THỨ TỰ — sort 2 personKey → nhập A+B hay B+A đều về 1 entry.
function fullKey(a?: PersonData, opts?: { view?: ViewKind; service?: string; inputDataB?: unknown }): string {
  const view = opts?.view || 'cores'
  const svc = opts?.service || ''
  const kA = personKey(a)
  const kB = personKey(opts?.inputDataB as PersonData)
  if (kB) { const [k1, k2] = [kA, kB].sort(); return `${k1}#${view}#${svc}#${k2}` }
  return `${kA}#${view}#${svc}#`
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

// Khóa DB cho 1 lá số đã lưu (= fullKey) — dùng để gộp local ↔ DB không trùng.
function keyOf(c: SavedChart): string {
  return fullKey(c.inputData as PersonData, { view: c.view, service: c.service, inputDataB: c.inputDataB })
}

// Đẩy 1 lá số lên DB (best-effort). Khách chưa đăng nhập → API trả 401, bỏ qua.
function pushChart(chartKey: string, c: SavedChart) {
  if (typeof window === 'undefined') return
  try {
    fetch('/api/charts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chartKey, name: c.name, view: c.view, service: c.service, inputData: c.inputData, inputDataB: c.inputDataB, savedAt: c.savedAt }),
    }).catch(() => {})
  } catch { /* offline */ }
}

// Hồ sơ tài khoản (bảng `profiles`, trang Quản lý lá số) — cache in-memory, KHÔNG lưu localStorage
// (để không bị đẩy ngược lên saved_charts gây trùng). Gộp vào listCharts khi hiển thị.
let dbProfiles: SavedChart[] = []

// Map 1 hồ sơ tài khoản (/api/profiles) → SavedChart (1 người, view 'cores') cho ô chọn lá số.
type ApiProfile = { profileUid?: string; name?: string; gender?: string; createdAt?: string; data?: {
  ho?: string; dem?: string; ten?: string; gender?: string
  dob?: { day: number; month: number; year: number }
  tob?: { hour: number; minute: number; unknown?: boolean }
  loc?: { address?: string; lat?: number; lon?: number; tz?: string }
} }
function profileToChart(p: ApiProfile, idx: number): SavedChart | null {
  const d = p.data || {}
  if (!d.dob || !d.loc || typeof d.loc.lat !== 'number') return null
  const nm = (p.name || [d.ho, d.dem, d.ten].filter(Boolean).join(' ') || d.ten || 'Lá số').trim()
  return {
    id: `p_${p.profileUid || idx}`,
    name: nm,
    inputData: { name: nm, ten: d.ten || nm, gender: d.gender || p.gender, dob: d.dob, tob: d.tob, loc: d.loc },
    savedAt: (p.createdAt && Date.parse(p.createdAt)) || 0,
    view: 'cores',
  }
}

async function pullAccountProfiles(): Promise<boolean> {
  try {
    const r = await fetch('/api/profiles')
    if (!r.ok) { dbProfiles = []; return false }
    const { profiles } = await r.json()
    if (!Array.isArray(profiles)) { dbProfiles = []; return false }
    dbProfiles = profiles.map((p: ApiProfile, i: number) => profileToChart(p, i)).filter((c: SavedChart | null): c is SavedChart => !!c)
    return dbProfiles.length > 0
  } catch { return false }
}

// Kéo lá số của user (đăng nhập): (1) saved_charts DB → gộp localStorage; (2) hồ sơ tài khoản → cache.
// Gọi khi đăng nhập/tải app. Guest → API 401, không đổi gì. Trả true nếu có thay đổi.
export async function pullCharts(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const profChanged = await pullAccountProfiles()
  try {
    const r = await fetch('/api/charts')
    if (!r.ok) return profChanged
    const { items } = await r.json()
    if (!Array.isArray(items) || !items.length) return profChanged
    const m = readAll()
    const byKey = new Map<string, SavedChart>()
    for (const c of Object.values(m)) byKey.set(keyOf(c), c)
    let changed = false
    for (const it of items) {
      const savedAt = typeof it.savedAt === 'number' ? it.savedAt : (Date.parse(it.savedAt) || Date.now())
      const cur = byKey.get(it.chartKey)
      if (cur) {
        if (savedAt > cur.savedAt) { cur.savedAt = savedAt; cur.name = it.name || cur.name; changed = true }
        continue
      }
      const id = newId()
      m[id] = { id, name: it.name || 'Lá số', inputData: it.inputData, inputDataB: it.inputDataB, savedAt, view: it.view, service: it.service }
      byKey.set(it.chartKey, m[id])
      changed = true
    }
    if (changed) writeAll(m)
    return changed || profChanged
  } catch { return profChanged }
}

// Đồng bộ 2 chiều khi đăng nhập: đẩy hết lá số local lên DB (backup + sang máy khác) rồi kéo DB về gộp.
// Đảm bảo lá số đã lưu TRƯỚC khi có tính năng sync cũng lên được DB. Guest → mọi call 401, no-op.
export async function syncCharts(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const m = readAll()
  for (const c of Object.values(m)) pushChart(keyOf(c), c)
  return pullCharts()
}

export function saveChart(
  inputData: { name?: string; ten?: string },
  opts: { view?: ViewKind; service?: string; inputDataB?: unknown } = {},
): string {
  const m = readAll()
  const fk = fullKey(inputData as PersonData, opts)
  // Đã có đúng lượt xem này (cùng người + view + service + người B) → tái dùng, không tạo trùng
  const existing = Object.values(m).find(c => fullKey(c.inputData as PersonData, { view: c.view, service: c.service, inputDataB: c.inputDataB }) === fk)
  if (existing) { existing.savedAt = Date.now(); writeAll(m); pushChart(fk, existing); return existing.id }
  const id = newId()
  m[id] = {
    id, name: inputData.name || inputData.ten || 'Lá số', inputData, savedAt: Date.now(),
    view: opts.view || 'cores', service: opts.service, inputDataB: opts.inputDataB,
  }
  writeAll(m)
  pushChart(fk, m[id])
  return id
}

export function getChart(id: string): SavedChart | null {
  return readAll()[id] || null
}

// Danh sách DUY NHẤT theo người (gộp mọi view của cùng 1 người) — mới nhất trước.
// Dùng chung cho mọi dropdown (S1 modal + S2 form + người thứ 2) → luôn sync 1 danh sách.
export function listCharts(): SavedChart[] {
  // Gộp lá số local + hồ sơ tài khoản (DB). Local mới hơn nên ưu tiên khi trùng người.
  const all = [...Object.values(readAll()), ...dbProfiles].sort((a, b) => b.savedAt - a.savedAt)
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

// Nhãn cặp đôi: "Tên A ⟷ Tên B" (+ ngày sinh mỗi người) — nhận diện đúng 2 người đã xem synastry.
export function coupleLabel(c: SavedChart): string {
  const a = c.inputData as PersonData
  const b = c.inputDataB as PersonData
  const nm = (d?: PersonData, fb = 'Người') => (d?.name || d?.ten || fb).trim()
  const dob = (d?: PersonData) => d?.dob ? ` (${pad(d.dob.day)}/${pad(d.dob.month)}/${d.dob.year})` : ''
  return `${nm(a, 'Người 1')}${dob(a)} ⟷ ${nm(b, 'Người 2')}${dob(b)}`
}

// Danh sách CẶP ĐÔI đã lưu (view synastry, có người B) — DUY NHẤT theo cặp (bất biến thứ tự), mới nhất trước.
export function listCouples(): SavedChart[] {
  const all = Object.values(readAll()).sort((a, b) => b.savedAt - a.savedAt)
  const seen = new Set<string>()
  const out: SavedChart[] = []
  for (const c of all) {
    if (c.view !== 'synastry' || !c.inputDataB) continue
    const k = [personKey(c.inputData as PersonData), personKey(c.inputDataB as PersonData)].sort().join('|')
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

export function deleteChart(id: string) {
  const m = readAll()
  const c = m[id]
  delete m[id]
  writeAll(m)
  // Xoá cả bản DB (nếu đăng nhập). Best-effort.
  if (c && typeof window !== 'undefined') {
    try { fetch(`/api/charts?key=${encodeURIComponent(keyOf(c))}`, { method: 'DELETE' }).catch(() => {}) } catch { /* offline */ }
  }
}
