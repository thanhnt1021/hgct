'use client'

// VISUAL ONLY — services page restyled to Celestial Sanctum design
// Backend logic (profileToInputData, handleConfirm, routing) untouched
// v2 — dual pricing display

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, Plus, Heart, UsersRound } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import StarField from '@/components/layout/StarField'
import ZodiacBackground from '@/components/layout/ZodiacBackground'
import ServicesGrid from '@/components/home/ServicesGrid'
import { useAuth } from '@/contexts/AuthContext'
import ProfileFormModal, { ProfileFormData } from '@/components/profile/ProfileFormModal'
import GuestSynastryModal from '@/components/profile/GuestSynastryModal'
import DiscountModal from '@/components/checkout/DiscountModal'
import { PDF_EMAIL_ENABLED } from '@/lib/feature-flags'

// Sub-listings shown when arriving via /services?group=love or ?group=relations
interface SubOption { type: string; title: string; subtitle: string; emoji: string }
const GROUP_OPTIONS: Record<string, { label: string; subs: SubOption[] }> = {
  love: {
    label: 'Tình yêu & Hôn nhân',
    subs: [
      { type: 'love',     title: 'Tình duyên (cá nhân)',  subtitle: 'Bản đồ tình cảm cá nhân của bạn — bạn yêu thế nào, cần gì, và bài học tình cảm là gì.', emoji: '💝' },
      { type: 'synastry', title: 'Cặp đôi (so 2 người)', subtitle: 'So sánh hai bản đồ sao để hiểu sự kết nối, điểm hòa hợp và những khác biệt giữa hai bạn.', emoji: '💑' },
    ],
  },
  relations: {
    label: 'Mối quan hệ',
    subs: [
      { type: 'relations-parents',   title: 'Với bố mẹ / người thân lớn tuổi', subtitle: 'Hiểu khác biệt thế hệ và cách kết nối ấm áp hơn với gia đình.',                emoji: '👨‍👩‍👧' },
      { type: 'relations-children',  title: 'Với con cái',                       subtitle: 'Đọc bản đồ sao của con để đồng hành phù hợp với năng lượng riêng của con.', emoji: '🧒' },
      { type: 'relations-colleague', title: 'Với đồng nghiệp',                   subtitle: 'Cách hợp tác chuyên nghiệp và giảm xung đột trong công việc.',              emoji: '🤝' },
      { type: 'relations-friend',    title: 'Với bạn bè / cộng đồng',             subtitle: 'Hiểu sợi dây gắn kết và cách đồng hành bền vững với bạn bè thân thiết.',   emoji: '🫂' },
    ],
  },
}

interface Profile {
  id: string
  profileUid: string
  name: string
  ten?: string
  note?: string
  dob: { day: number; month: number; year: number }
  tob: { hour: number; minute: number; unknown: boolean }
  loc: { address: string; lat: number; lon: number; tz: string }
  gender: string
  isTemp?: boolean  // true = nhập mới qua modal nhưng chưa lưu
}

interface ServiceDef {
  type: string
  name: string
  icon: string
  description: string
  color: string
  border: string
  tagColor: string
  needsTwo?: boolean
}

const DEFAULT_SERVICES: ServiceDef[] = [
  { type: 'career',               name: 'Sự nghiệp & Tiền bạc',         icon: '💼', description: '', color: 'rgba(200,148,63,0.08)',  border: 'rgba(200,148,63,0.22)',  tagColor: '#c8943f' },
  { type: 'love',                 name: 'Tình duyên (cá nhân)',          icon: '💝', description: '', color: 'rgba(185,77,112,0.08)',  border: 'rgba(185,77,112,0.22)',  tagColor: '#b84d70' },
  { type: 'synastry',             name: 'Cặp đôi (so 2 người)',          icon: '💑', description: '', color: 'rgba(120,77,186,0.08)',  border: 'rgba(120,77,186,0.22)',  tagColor: '#7c4dba', needsTwo: true },
  { type: 'transit',              name: 'Vận hạn',                       icon: '🧭', description: '', color: 'rgba(64,112,184,0.08)',  border: 'rgba(64,112,184,0.22)',  tagColor: '#4070b8' },
  { type: 'relations-parents',    name: 'Mối quan hệ với bố mẹ / người thân', icon: '👨‍👩‍👧', description: '', color: 'rgba(120,77,186,0.08)', border: 'rgba(120,77,186,0.22)', tagColor: '#b08ce8', needsTwo: true },
  { type: 'relations-children',   name: 'Mối quan hệ với con cái',       icon: '🧒', description: '', color: 'rgba(120,77,186,0.08)', border: 'rgba(120,77,186,0.22)', tagColor: '#b08ce8', needsTwo: true },
  { type: 'relations-colleague',  name: 'Mối quan hệ với đồng nghiệp',    icon: '🤝', description: '', color: 'rgba(120,77,186,0.08)', border: 'rgba(120,77,186,0.22)', tagColor: '#b08ce8', needsTwo: true },
  { type: 'relations-friend',     name: 'Mối quan hệ với bạn bè',         icon: '🫂', description: '', color: 'rgba(120,77,186,0.08)', border: 'rgba(120,77,186,0.22)', tagColor: '#b08ce8', needsTwo: true },
]

// Per-service landing copy: pain points + benefits the user will get.
// Reused from FeaturesSection.tsx (pain) + previous DEFAULT_SERVICES.description (benefits).
const LANDING_COPY: Record<string, { pains: string[]; benefits: string[] }> = {
  career: {
    pains: [
      'Bạn đang loay hoay trong việc lựa chọn ngành nghề phù hợp?',
      'Bạn cảm thấy mắc kẹt trong công việc hiện tại, mông lung về tương lai hoặc nỗ lực rất nhiều nhưng tài chính vẫn không khởi sắc?',
      'Bạn tự hỏi liệu mình có đang đi đúng đường?',
    ],
    benefits: [
      'Bạn sinh ra để làm gì — không phải công việc nào cũng dành cho bạn',
      'Điểm mạnh thật sự giúp bạn kiếm tiền (không phải thứ bạn "cố gắng")',
      'Cách kiếm tiền phù hợp với bạn nhất (1 nghề hay đa nguồn thu)',
      'Môi trường nào giúp bạn bật lên nhanh nhất',
      'Lộ trình rõ ràng để thoát mông lung — đi đúng hướng',
    ],
  },
  love: {
    pains: [
      'Bạn mệt mỏi với những mối quan hệ "chẳng đi đến đâu", kịch bản đổ vỡ lặp đi lặp lại, cảm giác cô đơn kéo dài khiến bạn bắt đầu nghi ngờ bản thân?',
      'Bạn hoài nghi về cách mình yêu, cách mình xây dựng mối quan hệ?',
      'Bạn muốn tìm ra kiểu người phù hợp — nơi là bến đỗ bình yên dành cho bạn?',
    ],
    benefits: [
      'Mô thức tình yêu vô thức khiến bạn tự làm tổn thương mình',
      'Bạn thực sự cần gì trong tình yêu (không phải điều bạn nghĩ hay từ ý kiến của bất kỳ ai)',
      'Điểm yếu trong tình cảm khiến bạn dễ bị tổn thương, lệ thuộc hoặc bị bỏ rơi',
      'Kiểu người phù hợp với bạn — để đi đường dài, không phải xúc cảm nhất thời',
    ],
  },
  synastry: {
    pains: [
      'Những tranh cãi bế tắc, im lặng lạnh lùng hay cảm giác không được thấu hiểu đang khiến mối quan hệ của bạn đứng bên bờ vực?',
      'Bạn sợ "chọn sai người" hay "đi sai hướng" và đây chính là rào cản khiến bạn không cảm thấy hạnh phúc?',
      'Bạn cần biết những điều cần cải thiện từ cả hai để mối quan hệ tốt đẹp hơn?',
    ],
    benefits: [
      'Gốc rễ xung đột: khác biệt cảm xúc, cách yêu hay nhu cầu sâu bên trong',
      'Bạn và người ấy hợp ở đâu — lệch ở đâu (đi dài hay chỉ đi một đoạn)',
      'Điểm kích hoạt cãi vã lặp lại và cách tháo gỡ đúng cách để kết nối lại, hiểu nhau thật sự',
      'Điều mỗi người cần thay đổi cụ thể để không lặp lại vòng lặp cũ, hạnh phúc trọn vẹn hơn',
    ],
  },
  transit: {
    pains: [
      'Thời gian này bạn không biết khi nào là lúc nên tiến lên, khi nào nên lùi lại?',
      'Bạn lo sợ những biến cố bất ngờ hoặc khó ra quyết định trước những thay đổi lớn của cuộc sống?',
    ],
    benefits: [
      'Giai đoạn này bạn nên tiến lên hay chậm lại, hạn chế rủi ro khi đưa ra quyết định',
      'Thời điểm vàng để hành động (công việc, tiền bạc, đầu tư, tình cảm)',
      'Lĩnh vực nào trong cuộc sống đang được mở ra — hoặc bị thử thách',
      'Cơ hội nào bạn nên nắm bắt ngay, thời điểm đẹp để bạn quyết định những dự định của chính mình',
    ],
  },
  'relations-parents': {
    pains: [
      'Bạn cảm thấy bố mẹ và mình như nói hai ngôn ngữ khác nhau, ai cũng có lý nhưng không ai thấu hiểu ai?',
      'Bạn muốn kết nối lại nhưng không biết bắt đầu từ đâu, hay sợ chạm vào những vết cũ?',
    ],
    benefits: [
      'Hiểu vì sao bố mẹ và bạn nhìn cuộc đời theo cách rất khác nhau',
      'Cách kết nối phù hợp với năng lượng của mỗi người, giảm xung đột',
      'Nhìn lại những bài học cảm xúc mà mối quan hệ này đang mang đến cho cả hai',
    ],
  },
  'relations-children': {
    pains: [
      'Bạn không hiểu tại sao con lại có tính cách khác mình đến vậy?',
      'Bạn lo lắng vì nuôi dạy con theo cách mình nghĩ là tốt nhưng con vẫn khép kín hoặc phản kháng?',
    ],
    benefits: [
      'Đọc tính cách bẩm sinh + nhu cầu cảm xúc của con qua bản đồ sao của con',
      'Cách đồng hành phù hợp với năng lượng riêng của con, không áp đặt',
      'Hiểu vai trò chiêm tinh của bạn trong hành trình lớn lên của con',
    ],
  },
  'relations-colleague': {
    pains: [
      'Bạn làm việc với một số đồng nghiệp rất ăn ý, nhưng có một số người càng cố hợp tác càng mệt?',
      'Bạn muốn giảm xung đột không cần thiết và xây dựng môi trường làm việc chuyên nghiệp hơn?',
    ],
    benefits: [
      'Hiểu phong cách làm việc + cách giao tiếp của đồng nghiệp',
      'Điểm bổ trợ tự nhiên giữa hai bên trong công việc',
      'Cách xử lý xung đột phù hợp với năng lượng của mỗi người',
    ],
  },
  'relations-friend': {
    pains: [
      'Bạn có những người bạn rất hợp và những người bạn dù lâu năm nhưng đôi khi vẫn như xa lạ?',
      'Bạn muốn hiểu sâu hơn về một tình bạn quan trọng để giữ nó bền vững?',
    ],
    benefits: [
      'Hiểu sợi dây gắn kết giữa bạn và người bạn này',
      'Điểm đồng điệu tự nhiên + những khác biệt cần thấu hiểu',
      'Cách đồng hành lâu dài, chân thành, không gồng lên giữ một mối quan hệ đã cạn duyên',
    ],
  },
}

function buildServices(configs?: Record<string, string>): ServiceDef[] {
  if (!configs) return DEFAULT_SERVICES
  return DEFAULT_SERVICES.map((s) => ({
    ...s,
    name: configs[`service_${s.type}_name`] || s.name,
    description: configs[`service_${s.type}_desc`] || s.description,
  }))
}

function profileToInputData(p: Profile) {
  return {
    name: p.name,
    ten: p.ten || '',
    gender: p.gender,
    dob: { day: p.dob.day, month: p.dob.month, year: p.dob.year },
    tob: { hour: p.tob.unknown ? 12 : p.tob.hour, minute: p.tob.unknown ? 0 : p.tob.minute },
    loc: { address: p.loc.address, lat: p.loc.lat, lon: p.loc.lon, tz: p.loc.tz },
  }
}

// Mirror of server-side profileHash() in /lib/essay/key.ts — must produce
// identical 16-char hex so server can lookup the same cache+DB rows.
async function computeProfileUid(input: Record<string, unknown>, inputB?: Record<string, unknown>): Promise<string> {
  type Input = { name: string; gender?: string; dob: { day: number; month: number; year: number }; tob: { hour: number; minute: number; unknown?: boolean }; loc: { lat: number; lon: number; tz: string } }
  const norm = (i: Input) => ({
    n: i.name,
    g: i.gender || '',
    d: `${i.dob.year}-${i.dob.month}-${i.dob.day}`,
    t: i.tob.unknown ? 'u' : `${i.tob.hour}:${i.tob.minute}`,
    l: `${i.loc.lat.toFixed(4)},${i.loc.lon.toFixed(4)},${i.loc.tz}`,
  })
  const payload = inputB ? [norm(input as Input), norm(inputB as Input)] : [norm(input as Input)]
  const enc = new TextEncoder().encode(JSON.stringify(payload))
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

async function navigateToReading(
  service: string,
  inputData: Record<string, unknown>,
  inputDataB?: Record<string, unknown>,
  extra: { startDate?: string; endDate?: string } = {},
) {
  const profileUid = await computeProfileUid(inputData, inputDataB)
  const payload: Record<string, unknown> = { inputData }
  if (inputDataB) payload.inputDataB = inputDataB
  if (extra.startDate) payload.startDate = extra.startDate
  if (extra.endDate) payload.endDate = extra.endDate
  try {
    localStorage.setItem(`previewInput:${profileUid}`, JSON.stringify(payload))
  } catch { /* storage full — degrade */ }
  window.open(`/reading/${profileUid}/${encodeURIComponent(service)}`, '_blank')
}

// ── Custom profile picker ──────────────────────────────────────────

function ProfilePicker({
  profiles,
  selectedId,
  onChange,
  label,
  onNew,
}: {
  profiles: Profile[]
  selectedId: string
  onChange: (id: string) => void
  label: string
  onNew: () => void
}) {
  const [search, setSearch] = useState('')

  // Chỉ hiện permanent profiles trong search list
  const permanentProfiles = profiles.filter(p => !p.isTemp)
  const filteredList = permanentProfiles.filter(p => {
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || (p.note || '').toLowerCase().includes(q)
  })

  // Profile tạm thời đang được chọn (nếu có)
  const selectedProfile = profiles.find(p => p.id === selectedId)
  const tempSelected = selectedProfile?.isTemp ? selectedProfile : null

  return (
    <div>
      <label
        className="block mb-3"
        style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.65rem', letterSpacing: '0.06em' }}
      >
        {label}
      </label>

      {/* Nút Nhập thông tin mới */}
      <button
        type="button"
        onClick={onNew}
        className="w-full flex items-center gap-2 mb-2"
        style={{
          background: 'transparent',
          border: '1px solid rgba(200,148,63,0.28)',
          color: '#d9ab55',
          borderRadius: '6px',
          padding: '0.55rem 0.875rem',
          fontFamily: 'var(--font-vietnam)',
          fontSize: '0.82rem',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,148,63,0.07)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={14} /> Nhập thông tin mới
      </button>

      {/* Hiển thị hồ sơ tạm (chưa lưu) nếu đang được chọn */}
      {tempSelected && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-2"
          style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          <div>
            <p style={{ color: '#f59e0b', fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>
              {tempSelected.name}
            </p>
            <p style={{ color: '#92400e', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
              Chưa lưu vào danh sách
            </p>
          </div>
          <span style={{ color: '#f59e0b', fontSize: '0.72rem', fontFamily: 'var(--font-vietnam)', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
            ✦ Đã chọn
          </span>
        </div>
      )}

      {/* Search */}
      {permanentProfiles.length > 0 && (
        <>
          <div
            className="flex items-center gap-2 rounded-lg px-3 mb-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,148,63,0.1)', minHeight: 36 }}
          >
            <Search size={13} style={{ color: '#6b7280', flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm hồ sơ đã lưu..."
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '0.82rem',
                width: '100%', padding: '0.4rem 0',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: '#6b7280', flexShrink: 0, lineHeight: 1 }}>✕</button>
            )}
          </div>

          {/* Profile list — chỉ permanent */}
          <div className="space-y-1 overflow-y-auto pr-0.5" style={{ maxHeight: 180 }}>
            {filteredList.length === 0 && (
              <p style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', textAlign: 'center', padding: '0.875rem' }}>
                Không tìm thấy hồ sơ
              </p>
            )}
            {filteredList.map(p => {
              const isSelected = selectedId === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange(p.id)}
                  className="w-full text-left rounded-lg px-3 py-2.5"
                  style={{
                    background: isSelected ? 'rgba(200,148,63,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'rgba(200,148,63,0.32)' : 'rgba(255,255,255,0.05)'}`,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <p style={{ color: isSelected ? '#f0cc78' : '#f4efe6', fontFamily: 'var(--font-vietnam)', fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>
                    {p.name}
                  </p>
                  <p style={{ color: '#8b8fa8', fontFamily: 'var(--font-vietnam)', fontSize: '0.7rem', fontStyle: 'italic', minHeight: '1em', marginTop: '0.15rem' }}>
                    {p.note || ''}
                  </p>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export default function ServicesClient({ serviceConfigs, prices, displayPrices }: { serviceConfigs?: Record<string, string>; prices?: Record<string, number>; displayPrices?: Record<string, number> }) {
  const services = buildServices(serviceConfigs)
  const router = useRouter()
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [profilesLoaded, setProfilesLoaded] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceDef | null>(null)
  const [profileA, setProfileA] = useState('')
  const [profileB, setProfileB] = useState('')
  const [transitStartDate, setTransitStartDate] = useState('')
  const [transitEndDate, setTransitEndDate] = useState('')

  // Modal state (old flow — logged-in users with profiles)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTarget, setModalTarget] = useState<'A' | 'B'>('A')
  const [modalSaving, setModalSaving] = useState(false)

  // Guest flow state
  const [guestService, setGuestService] = useState<ServiceDef | null>(null)
  const [guestModalOpen, setGuestModalOpen] = useState(false)
  const [guestSynastryOpen, setGuestSynastryOpen] = useState(false)
  const [pendingServiceClick, setPendingServiceClick] = useState<ServiceDef | null>(null)
  const [guestInitialDataA, setGuestInitialDataA] = useState<ProfileFormData | null>(null)
  const [guestInitialDataB, setGuestInitialDataB] = useState<ProfileFormData | null>(null)

  // Discount modal state
  const [discountModalOpen, setDiscountModalOpen] = useState(false)
  const [discountService, setDiscountService] = useState('')
  const [discountEmail, setDiscountEmail] = useState('')

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => {
        if (data.profiles) {
          setProfiles(data.profiles.map((p: any) => ({
            id: String(p.id),
            profileUid: p.profileUid || '',
            ho: p.data?.ho || '',
            dem: p.data?.dem || '',
            ten: p.data?.ten || (p.name.trim().split(/\s+/).pop() || p.name),
            name: p.name,
            note: p.data?.note || '',
            gender: p.gender || 'Female',
            dob: p.data?.dob || { day: 1, month: 1, year: 1990 },
            tob: p.data?.tob || { hour: 12, minute: 0, unknown: false },
            loc: p.data?.loc || { address: 'Hà Nội', lat: 21.02, lon: 105.84, tz: 'Asia/Ho_Chi_Minh' },
            createdAt: p.createdAt || '',
            isTemp: false,
          })))
        }
        setProfilesLoaded(true)
      })
      .catch(() => { setProfiles([]); setProfilesLoaded(true) })
  }, [user?.uid])

  // Khi profiles loaded, xử lý pending click (URL ?type=X arrived before fetch finished).
  // Always render landing — modal opens via CTA button.
  useEffect(() => {
    if (!profilesLoaded || !pendingServiceClick) return
    setSelectedService(pendingServiceClick)
    setProfileA(''); setProfileB('')
    setPendingServiceClick(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilesLoaded])

  const openGuestFlow = (s: ServiceDef) => {
    setGuestService(s)
    if (s.needsTwo) setGuestSynastryOpen(true)
    else setGuestModalOpen(true)
  }

  const guestProfileToInput = (formData: ProfileFormData, name: string) => ({
    name, ten: formData.ten || '',
    gender: formData.gender,
    dob: { day: formData.dob.day, month: formData.dob.month, year: formData.dob.year },
    tob: { hour: formData.tob.unknown ? 12 : formData.tob.hour, minute: formData.tob.unknown ? 0 : formData.tob.minute },
    loc: { address: formData.loc.address, lat: formData.loc.lat, lon: formData.loc.lon, tz: formData.loc.tz },
  })

  const buildPreviewData = (inputData: object, inputDataB?: object, serviceType?: string) => ({
    service: serviceType || guestService?.type || '',
    inputData,
    ...(inputDataB ? { inputDataB } : {}),
    ...(serviceType === 'transit' || guestService?.type === 'transit' ? (() => {
      const today = new Date()
      const oneYearLater = new Date(today); oneYearLater.setFullYear(today.getFullYear() + 1)
      return { startDate: today.toISOString().split('T')[0], endDate: oneYearLater.toISOString().split('T')[0] }
    })() : {}),
  })

  const handleGuestModalSubmit = (formData: ProfileFormData, save: boolean, action?: 'free' | 'paid' | 'reading', email?: string) => {
    if (!guestService) return
    const name = [formData.ho, formData.dem, formData.ten].filter(Boolean).join(' ')
    const inputData = guestProfileToInput(formData, name)

    // Persist form data as draft so modal re-opens with pre-filled data if user navigates back
    try { sessionStorage.setItem('guest_modal_single', JSON.stringify({ form: formData })) } catch { /* ignore */ }

    // New coin/stream flow — open profile-scoped reading view /reading/[hash]/[service]
    if (action === 'reading') {
      if (user && save) {
        fetch('/api/profiles', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, gender: formData.gender, isTemp: false, data: formData }),
        }).catch(() => {})
      }
      setGuestModalOpen(false)
      const svcType = guestService.type
      const extra = svcType === 'transit' ? (() => {
        const today = new Date()
        const oneYearLater = new Date(today); oneYearLater.setFullYear(today.getFullYear() + 1)
        return { startDate: today.toISOString().split('T')[0], endDate: oneYearLater.toISOString().split('T')[0] }
      })() : {}
      navigateToReading(svcType, inputData, undefined, extra)
      return
    }

    if (action === 'free') {
      const previewData = {
        ...buildPreviewData(inputData),
        ...(email ? { email } : {}),
        _guestFormA: formData,  // for form restoration if user goes /preview → /checkout → back
      }
      localStorage.setItem('previewInput', JSON.stringify(previewData))
      window.open('/preview', '_blank')
      return
    }

    // paid flow → stage data, then open DiscountModal
    sessionStorage.setItem('inputData', JSON.stringify(inputData))
    sessionStorage.setItem('selectedService', guestService.type)
    sessionStorage.setItem('profileUidA', '')
    sessionStorage.setItem('guestFormDataA', JSON.stringify(formData))
    sessionStorage.removeItem('guestFormDataB')
    sessionStorage.removeItem('inputDataB')
    sessionStorage.removeItem('profileUidB')
    if (guestService.type === 'transit') {
      const today = new Date()
      const oneYearLater = new Date(today)
      oneYearLater.setFullYear(today.getFullYear() + 1)
      sessionStorage.setItem('transitStartDate', today.toISOString().split('T')[0])
      sessionStorage.setItem('transitEndDate', oneYearLater.toISOString().split('T')[0])
    } else {
      sessionStorage.removeItem('transitStartDate')
      sessionStorage.removeItem('transitEndDate')
    }
    if (email) sessionStorage.setItem('checkoutEmail', email)
    // Background save if user wants
    if (user && save) {
      fetch('/api/profiles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender: formData.gender, isTemp: false, data: formData }),
      }).catch(() => {})
    }
    setGuestModalOpen(false)
    setDiscountService(guestService.type)
    setDiscountEmail(email || '')
    setDiscountModalOpen(true)
  }

  const handleGuestSynastrySubmit = (formA: ProfileFormData, formB: ProfileFormData, action?: 'free' | 'paid' | 'reading', email?: string) => {
    const nameA = [formA.ho, formA.dem, formA.ten].filter(Boolean).join(' ')
    const nameB = [formB.ho, formB.dem, formB.ten].filter(Boolean).join(' ')
    const inputDataA = guestProfileToInput(formA, nameA)
    const inputDataB = guestProfileToInput(formB, nameB)

    // Persist synastry form data as draft so modal re-opens pre-filled if user navigates back
    try { sessionStorage.setItem('guest_modal_synastry', JSON.stringify({ formA, formB })) } catch { /* ignore */ }

    // New coin/stream flow — open profile-scoped reading view /reading/[hash]/[service]
    if (action === 'reading') {
      const svcType = guestService?.type || 'synastry'
      setGuestSynastryOpen(false)
      navigateToReading(svcType, inputDataA, inputDataB)
      return
    }

    if (action === 'free') {
      const previewData = {
        ...buildPreviewData(inputDataA, inputDataB, 'synastry'),
        ...(email ? { email } : {}),
        _guestFormA: formA,
        _guestFormB: formB,
      }
      localStorage.setItem('previewInput', JSON.stringify(previewData))
      window.open('/preview', '_blank')
      return
    }

    // paid flow → stage data, then open DiscountModal
    sessionStorage.setItem('inputData', JSON.stringify(inputDataA))
    sessionStorage.setItem('inputDataB', JSON.stringify(inputDataB))
    sessionStorage.setItem('selectedService', 'synastry')
    sessionStorage.setItem('profileUidA', '')
    sessionStorage.setItem('profileUidB', '')
    sessionStorage.setItem('guestFormDataA', JSON.stringify(formA))
    sessionStorage.setItem('guestFormDataB', JSON.stringify(formB))
    sessionStorage.removeItem('transitStartDate')
    sessionStorage.removeItem('transitEndDate')
    if (email) sessionStorage.setItem('checkoutEmail', email)
    setGuestSynastryOpen(false)
    setDiscountService('synastry')
    setDiscountEmail(email || '')
    setDiscountModalOpen(true)
  }

  // Xử lý ?edit=1 khi quay lại từ checkout
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('edit') !== '1') return
    const svcType = sessionStorage.getItem('selectedService')
    const svc = services.find(s => s.type === svcType)
    if (!svc) return
    const formAStr = sessionStorage.getItem('guestFormDataA')
    const formA = formAStr ? JSON.parse(formAStr) as ProfileFormData : null
    setGuestInitialDataA(formA)
    if (svc.needsTwo) {
      const formBStr = sessionStorage.getItem('guestFormDataB')
      const formB = formBStr ? JSON.parse(formBStr) as ProfileFormData : null
      setGuestInitialDataB(formB)
      setGuestService(svc)
      setGuestSynastryOpen(true)
    } else {
      setGuestService(svc)
      setGuestModalOpen(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Set default transit dates khi chọn dịch vụ Vận Hạn
  useEffect(() => {
    if (selectedService?.type === 'transit') {
      const today = new Date()
      const oneYearLater = new Date(today)
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
      setTransitStartDate(today.toISOString().split('T')[0])
      setTransitEndDate(oneYearLater.toISOString().split('T')[0])
    }
  }, [selectedService?.type])

  // Reactive URL params — Next.js does NOT remount this client component when
  // navigating /services → /services?type=X (same route, only query changes).
  // useSearchParams() re-runs the effect on every URL change so the page
  // actually transitions to the right view.
  const searchParams = useSearchParams()
  const [groupKey, setGroupKey] = useState<string | null>(null)

  useEffect(() => {
    if (!searchParams) return
    if (searchParams.get('edit') === '1') return // legacy edit flow handles itself

    const t = searchParams.get('type')
    const g = searchParams.get('group')

    if (t) {
      const svc = services.find(s => s.type === t)
      if (svc) {
        setSelectedService(svc)
        setGroupKey(null)
        setProfileA('')
        setProfileB('')
      }
    } else if (g && GROUP_OPTIONS[g]) {
      setGroupKey(g)
      setSelectedService(null)
    } else {
      // /services with no query → root parent grid
      setSelectedService(null)
      setGroupKey(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const groupView = groupKey ? GROUP_OPTIONS[groupKey] : null

  const handleServiceClick = (s: ServiceDef) => {
    // Always show the landing page (pain + benefit + CTA button) first.
    // Modal only opens when user explicitly clicks "Bấm vào đây để nhập thông tin".
    // This applies to both guests and logged-in users.
    setSelectedService(s)
    setProfileA('')
    setProfileB('')
  }

  // Mở modal để nhập thông tin mới
  const openModalFor = (target: 'A' | 'B') => {
    setModalTarget(target)
    setModalOpen(true)
  }

  // Tính label nút submit modal theo context
  const getModalSubmitLabel = () => {
    if (!selectedService?.needsTwo) return 'Xác nhận'
    if (modalTarget === 'B') return 'Tiếp tục →'
    // Target = A: kiểm tra B đã chọn chưa
    return profileB !== '' ? 'Tiếp tục →' : 'Chọn người tiếp theo →'
  }

  const handleModalSave = async (formData: ProfileFormData, saveProfile: boolean) => {
    setModalSaving(true)
    const name = [formData.ho, formData.dem, formData.ten].filter(Boolean).join(' ')

    let profileId = `local_${Date.now()}`
    let profileUid = ''
    let savedPermanently = false

    // Thử POST lên server (cần đăng nhập)
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          gender: formData.gender,
          isTemp: !saveProfile,
          data: formData,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.profile) {
          profileId = String(data.profile.id)
          profileUid = data.profile.profileUid || ''
          savedPermanently = saveProfile
        }
      }
    } catch { /* non-logged-in hoặc lỗi mạng: dùng local data */ }

    const newProfile: Profile = {
      id: profileId,
      profileUid,
      name,
      ten: formData.ten,
      note: formData.note || '',
      gender: formData.gender,
      dob: formData.dob,
      tob: formData.tob,
      loc: formData.loc,
      isTemp: !savedPermanently,
    }

    // Thêm vào danh sách profiles (bao gồm cả temp — sẽ được filter trong picker)
    setProfiles(prev => [newProfile, ...prev])

    if (modalTarget === 'A') {
      setProfileA(profileId)
      sessionStorage.setItem('profileUidA', profileUid)
    } else {
      setProfileB(profileId)
      sessionStorage.setItem('profileUidB', profileUid)
    }

    setModalOpen(false)
    setModalSaving(false)
  }

  const getConfirmData = () => {
    if (!selectedService) return null
    const pa = profiles.find(p => p.id === profileA)
    if (!pa) return null
    const pb = selectedService.needsTwo ? profiles.find(p => p.id === profileB) : null
    if (selectedService.needsTwo && !pb) return null
    return { pa, pb }
  }

  const handleConfirmFree = () => {
    const d = getConfirmData()
    if (!d || !selectedService) return
    const inputData = profileToInputData(d.pa)
    const inputDataB = d.pb ? profileToInputData(d.pb) : undefined
    const previewData: Record<string, unknown> = { service: selectedService.type, inputData }
    if (inputDataB) previewData.inputDataB = inputDataB
    if (selectedService.type === 'transit') {
      previewData.startDate = transitStartDate
      previewData.endDate = transitEndDate
    }
    if (user?.email) previewData.email = user.email
    localStorage.setItem('previewInput', JSON.stringify(previewData))
    window.open('/preview', '_blank')
  }

  // New coin/stream flow — navigate to profile-scoped reading URL
  const handleConfirmReading = () => {
    const d = getConfirmData()
    if (!d || !selectedService) return
    const inputData = profileToInputData(d.pa)
    const inputDataB = d.pb ? profileToInputData(d.pb) : undefined
    const extra = selectedService.type === 'transit'
      ? { startDate: transitStartDate, endDate: transitEndDate }
      : {}
    navigateToReading(selectedService.type, inputData, inputDataB, extra)
  }

  const handleConfirmPaid = () => {
    const d = getConfirmData()
    if (!d || !selectedService) return

    sessionStorage.setItem('inputData', JSON.stringify(profileToInputData(d.pa)))
    sessionStorage.setItem('selectedService', selectedService.type)
    sessionStorage.setItem('profileUidA', d.pa.profileUid || '')
    sessionStorage.removeItem('guestFormDataA')
    sessionStorage.removeItem('guestFormDataB')

    if (selectedService.needsTwo && d.pb) {
      sessionStorage.setItem('inputDataB', JSON.stringify(profileToInputData(d.pb)))
      sessionStorage.setItem('profileUidB', d.pb.profileUid || '')
    } else {
      sessionStorage.removeItem('inputDataB')
      sessionStorage.removeItem('profileUidB')
    }

    if (selectedService.type === 'transit') {
      sessionStorage.setItem('transitStartDate', transitStartDate)
      sessionStorage.setItem('transitEndDate', transitEndDate)
    } else {
      sessionStorage.removeItem('transitStartDate')
      sessionStorage.removeItem('transitEndDate')
    }

    // Lifetime users skip discount modal (wheel + referral) → go straight to checkout,
    // which auto-creates a free report via isPremiumOrLifetime path.
    if (user?.planType === 'lifetime') {
      proceedToCheckout({})
      return
    }

    setDiscountService(selectedService.type)
    setDiscountEmail(user?.email || '')
    setDiscountModalOpen(true)
  }

  const proceedToCheckout = (discount: { referralCode?: string; wheelDiscountPct?: number }) => {
    if (discount.referralCode) sessionStorage.setItem('referralCode', discount.referralCode)
    else sessionStorage.removeItem('referralCode')
    if (discount.wheelDiscountPct !== undefined) sessionStorage.setItem('wheelDiscountPct', String(discount.wheelDiscountPct))
    else sessionStorage.removeItem('wheelDiscountPct')
    sessionStorage.setItem('autoCheckout', '1')
    router.push('/checkout')
  }

  const transitDaysApart = transitStartDate && transitEndDate
    ? Math.round((new Date(transitEndDate).getTime() - new Date(transitStartDate).getTime()) / 86400000)
    : 0
  const transitDatesValid = selectedService?.type !== 'transit' || (
    transitStartDate !== '' && transitEndDate !== '' && transitDaysApart > 0 && transitDaysApart <= 365
  )
  const canConfirm = profileA !== '' && (!selectedService?.needsTwo || profileB !== '') && transitDatesValid
  const hasAnyProfile = profiles.length > 0
  const fmtPrice = (p: number) => p.toLocaleString('vi-VN') + ' ₫'

  return (
    <div className="relative min-h-screen">
      {/* Background — same stack as home page (StarField fills #06060f + ZodiacBackground draws the rotating wheel) */}
      <StarField />
      <ZodiacBackground />
      <Navbar />

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-28 pb-16">

        {!selectedService && groupView ? (
          /* Trang con — chọn sub khi vào từ ?group=love / ?group=relations */
          <>
            <div className="text-center mb-10">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 mb-5"
                style={{
                  background: 'rgba(18,13,46,0.7)',
                  border: '1px solid rgba(200,148,63,0.3)',
                  color: '#d9ab55',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  backdropFilter: 'blur(8px)',
                }}
              >
                ← Quay lại 4 cục
              </Link>
              <p className="section-eyebrow mb-4">Chiêm tinh chuyên sâu</p>
              <h1
                style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, marginBottom: '0.75rem', letterSpacing: '0.03em' }}
              >
                {groupView.label}
              </h1>
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem' }}>
                Chọn loại bạn muốn khám phá để bắt đầu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {groupView.subs.map(sub => {
                const svc = services.find(s => s.type === sub.type)
                if (!svc) return null
                return (
                  <button
                    key={sub.type}
                    type="button"
                    onClick={() => handleServiceClick(svc)}
                    className="svc-card text-left p-7 rounded-xl"
                    style={{
                      background: 'rgba(18,13,46,0.7)',
                      border: '1px solid rgba(200,148,63,0.22)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-4xl flex-shrink-0" style={{ lineHeight: 1.2 }}>{sub.emoji}</span>
                      <div>
                        <h3 className="font-bold" style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', letterSpacing: '0.02em', margin: 0, marginBottom: '0.5rem' }}>
                          {sub.title}
                        </h3>
                        <p style={{ color: '#9b8fb5', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', lineHeight: 1.7, margin: 0 }}>
                          {sub.subtitle}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <style>{`.svc-card{transition:transform .25s ease,box-shadow .25s ease}.svc-card:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,.4);border-color:rgba(200,148,63,0.5)!important}`}</style>
          </>
        ) : !selectedService ? (
          <>
            {/* Header */}
            <div className="text-center mb-14">
              <p className="section-eyebrow mb-5">Chiêm tinh chuyên sâu</p>
              <h1
                style={{
                  color: '#f4efe6',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                  fontWeight: 700,
                  marginBottom: '0.75rem',
                  letterSpacing: '0.03em',
                }}
              >
                Cùng bạn tháo gỡ các vấn đề
              </h1>
              <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem' }}>
                {PDF_EMAIL_ENABLED
                  ? <>Chọn lĩnh vực mà bạn quan tâm để nhận bản luận giải tổng quan <strong style={{ color: '#d9ab55' }}>MIỄN PHÍ</strong></>
                  : <>Chọn lĩnh vực để đọc luận giải chiêm tinh — mở từng mục bằng <strong style={{ color: '#d9ab55' }}>xu</strong></>}
              </p>
            </div>

            {/* 4 cục cha — đồng bộ với trang chủ */}
            <ServicesGrid />

            {/* Service grid (legacy 8 cards — chỉ hiện khi PDF_EMAIL_ENABLED bật để tương thích flow cũ) */}
            <style>{`.svc-card{transition:transform .25s ease,box-shadow .25s ease}.svc-card:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(0,0,0,.4)}`}</style>
            {PDF_EMAIL_ENABLED && <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-12">
              {services.map(s => (
                <button
                  key={s.type}
                  onClick={() => handleServiceClick(s)}
                  className="svc-card text-left p-7 rounded-xl"
                  style={{
                    background: s.color,
                    border: `1px solid ${s.border}`,
                    backdropFilter: 'blur(12px)',
                    height: '100%',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl flex-shrink-0" style={{ lineHeight: 1.2 }}>{s.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-2" style={{ minHeight: '2.2rem' }}>
                        <h3
                          className="font-bold"
                          style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.05rem', letterSpacing: '0.02em', margin: 0 }}
                        >
                          {s.name}
                        </h3>
                        {s.needsTwo && (
                          <span
                            className="inline-block px-2 py-0.5 rounded-sm"
                            style={{ background: 'rgba(120,77,186,0.2)', color: '#9b6dd6', fontFamily: 'var(--font-vietnam)', fontSize: '0.6rem', letterSpacing: '0.1em', flexShrink: 0 }}
                          >
                            Cần 2 hồ sơ
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                        {s.description}
                      </p>
                      {PDF_EMAIL_ENABLED && displayPrices?.[s.type] != null && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <p style={{ color: s.tagColor, fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 700 }}>
                            {fmtPrice(displayPrices[s.type])}
                          </p>
                          <p style={{ color: '#9b8fb5', fontFamily: 'var(--font-vietnam)', fontSize: '0.72rem', fontStyle: 'italic', marginTop: '0.2rem' }}>
                            (Bấm xem chi tiết để nhận ưu đãi)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>}

            {/* Loading indicator khi user đang fetch profiles */}
            {user && !profilesLoaded && (
              <p className="text-center mt-6" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>
                Đang tải…
              </p>
            )}
          </>
        ) : LANDING_COPY[selectedService.type] ? (
          /* Service landing — pain point + benefit + button "Bấm vào đây để nhập thông tin"
             Replaces the old ProfilePicker flow per PRD 3.D-bis Bước 1. */
          <div className="max-w-3xl mx-auto">
            <Link
              href="/services"
              className="mb-6 inline-flex items-center gap-2"
              style={{
                background: 'rgba(18,13,46,0.7)',
                border: '1px solid rgba(200,148,63,0.3)',
                color: '#d9ab55',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontFamily: 'var(--font-vietnam)',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              ← Quay lại
            </Link>

            <h1
              className="text-center mb-2"
              style={{
                color: '#f4efe6',
                fontFamily: 'var(--font-vietnam)',
                fontSize: 'clamp(1.4rem, 4vw, 2rem)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {selectedService.icon} {selectedService.name}
            </h1>
            <div className="mx-auto mb-8" style={{ width: '60px', height: '1px', background: 'linear-gradient(90deg, transparent, #d9ab55, transparent)' }} />

            {/* Pain points — "Có phải" */}
            <p
              className="mb-3"
              style={{ color: '#e87da0', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              Có phải
            </p>
            <div
              className="rounded-2xl p-6 mb-10"
              style={{ background: 'rgba(18,13,46,0.72)', border: '1px solid rgba(185,77,112,0.22)', backdropFilter: 'blur(8px)' }}
            >
              <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {LANDING_COPY[selectedService.type].pains.map((p, i) => (
                  <li key={i} className="flex items-start gap-3" style={{ color: '#c9c3d6', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                    <span style={{ color: '#e87da0', flexShrink: 0, marginTop: '0.15rem' }}>•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Benefits — "Hạt giống chiêm tinh cho bạn góc nhìn về" */}
            <p
              className="mb-3"
              style={{ color: '#d9ab55', fontFamily: 'var(--font-vietnam)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              Hạt giống chiêm tinh cho bạn góc nhìn về
            </p>
            <div
              className="rounded-2xl p-6 mb-10"
              style={{ background: 'rgba(18,13,46,0.72)', border: '1px solid rgba(200,148,63,0.22)', backdropFilter: 'blur(8px)' }}
            >
              <ul className="space-y-3" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {LANDING_COPY[selectedService.type].benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3" style={{ color: '#e8e0f0', fontFamily: 'var(--font-vietnam)', fontSize: '0.95rem', lineHeight: 1.8 }}>
                    <span style={{ color: '#d9ab55', flexShrink: 0, marginTop: '0.15rem' }}>✦</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA — open the input modal */}
            <div className="text-center">
              <button
                onClick={() => openGuestFlow(selectedService)}
                className="inline-block"
                style={{
                  background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)',
                  backgroundSize: '200% 200%',
                  color: '#06060f',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '1rem 2.5rem',
                  fontFamily: 'var(--font-vietnam)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  cursor: 'pointer',
                  boxShadow: '0 6px 28px rgba(200,148,63,0.3)',
                  textTransform: 'uppercase',
                }}
              >
                Bấm vào đây để nhập thông tin →
              </button>
              {selectedService.needsTwo && (
                <p className="mt-3" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                  Cần thông tin sinh của 2 người để so sánh
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Profile selection step — legacy fallback (chỉ hiện khi service không có landing copy) */
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setSelectedService(null)}
              className="mb-8 flex items-center gap-2 text-sm transition-colors"
              style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#d9ab55')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a4560')}
            >
              ← Quay lại
            </button>

            <div
              className="rounded-2xl p-8"
              style={{
                background: 'rgba(18,13,46,0.75)',
                border: '1px solid rgba(200,148,63,0.18)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Service header */}
              <div className="flex items-center gap-3 mb-8">
                <span className="text-3xl">{selectedService.icon}</span>
                <div>
                  <h2
                    className="font-bold"
                    style={{ color: '#f4efe6', fontFamily: 'var(--font-vietnam)', fontSize: '1.1rem', letterSpacing: '0.03em' }}
                  >
                    {selectedService.name}
                  </h2>
                  {selectedService.needsTwo && (
                    <p className="text-xs mt-0.5" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)' }}>
                      Cần 2 hồ sơ để so sánh
                    </p>
                  )}
                </div>
              </div>

              <div
                className="mb-6"
                style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(200,148,63,0.2), transparent)' }}
              />

              <div className="space-y-6">
                {hasAnyProfile ? (
                  <>
                    <ProfilePicker
                      profiles={profiles}
                      selectedId={profileA}
                      onChange={id => { setProfileA(id); sessionStorage.setItem('profileUidA', profiles.find(p => p.id === id)?.profileUid || '') }}
                      label={selectedService.needsTwo ? 'NGƯỜI THỨ NHẤT' : 'CHỌN HỒ SƠ'}
                      onNew={() => openModalFor('A')}
                    />

                    {selectedService.needsTwo && (
                      <>
                        <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)' }} />
                        <ProfilePicker
                          profiles={profiles}
                          selectedId={profileB}
                          onChange={id => { setProfileB(id); sessionStorage.setItem('profileUidB', profiles.find(p => p.id === id)?.profileUid || '') }}
                          label="NGƯỜI THỨ HAI"
                          onNew={() => openModalFor('B')}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <p className="mb-1" style={{ color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.9rem' }}>
                      {user ? 'Bạn chưa có hồ sơ nào.' : 'Không cần tài khoản — nhập thông tin trực tiếp.'}
                    </p>
                    {!user && (
                      <p className="mb-4" style={{ color: '#4a4560', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem' }}>
                        Điền thông tin → xác nhận → đọc luận giải ngay trên trang.
                      </p>
                    )}
                    {user && <div className="mb-4" />}
                    <button
                      onClick={() => openModalFor('A')}
                      className="flex items-center gap-2 mx-auto"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(200,148,63,0.28)',
                        color: '#d9ab55',
                        borderRadius: '6px',
                        padding: '0.6rem 1.25rem',
                        fontFamily: 'var(--font-vietnam)',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={14} /> Nhập thông tin mới
                    </button>
                  </div>
                )}

                {/* ── Transit date range picker ─────────────────────── */}
                {false && selectedService?.type === 'transit' && (
                  <div>
                    <div style={{ height: '1px', background: 'rgba(200,148,63,0.1)', marginBottom: '1.25rem' }} />
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', letterSpacing: '0.06em' }}>
                          TỪ NGÀY
                        </label>
                        <input
                          type="date"
                          value={transitStartDate}
                          onChange={e => setTransitStartDate(e.target.value)}
                          style={{
                            width: '100%', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(200,148,63,0.22)', borderRadius: '6px',
                            padding: '0.52rem 0.7rem', color: '#f4efe6',
                            fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem',
                            outline: 'none', colorScheme: 'dark',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '0.4rem', color: '#8a8399', fontFamily: 'var(--font-vietnam)', fontSize: '0.62rem', letterSpacing: '0.06em' }}>
                          ĐẾN NGÀY
                        </label>
                        <input
                          type="date"
                          value={transitEndDate}
                          onChange={e => setTransitEndDate(e.target.value)}
                          style={{
                            width: '100%', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(200,148,63,0.22)', borderRadius: '6px',
                            padding: '0.52rem 0.7rem', color: '#f4efe6',
                            fontFamily: 'var(--font-vietnam)', fontSize: '0.88rem',
                            outline: 'none', colorScheme: 'dark',
                          }}
                        />
                      </div>
                    </div>
                    {transitStartDate && transitEndDate && transitDaysApart <= 0 && (
                      <p style={{ color: '#f87171', fontFamily: 'var(--font-vietnam)', fontSize: '0.78rem', marginBottom: '0.5rem' }}>
                        ⚠ Ngày kết thúc phải sau ngày bắt đầu
                      </p>
                    )}
                    {transitDaysApart > 365 && (
                      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: '6px', padding: '0.55rem 0.8rem' }}>
                        <p style={{ color: '#d4a017', fontFamily: 'var(--font-vietnam)', fontSize: '0.8rem', margin: 0 }}>
                          ⚠ Vui lòng chọn khoảng thời gian tối đa 1 năm
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {(hasAnyProfile || profileA !== '') && (
                  <div className="space-y-2 mt-2">
                    {PDF_EMAIL_ENABLED ? (
                      <>
                        <button
                          onClick={handleConfirmPaid}
                          disabled={!canConfirm}
                          className="w-full py-3.5 font-bold text-sm tracking-wider"
                          style={{
                            background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)',
                            backgroundSize: '200% 200%',
                            color: '#06060f',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-vietnam)',
                            letterSpacing: '0.08em',
                            opacity: canConfirm ? 1 : 0.35,
                            boxShadow: canConfirm ? '0 4px 20px rgba(200,148,63,0.25)' : 'none',
                            transition: 'opacity 0.2s ease',
                            cursor: canConfirm ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Xuất PDF chi tiết →
                        </button>
                        <button
                          onClick={handleConfirmFree}
                          disabled={!canConfirm}
                          className="w-full py-3 font-semibold text-sm"
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(200,148,63,0.35)',
                            color: canConfirm ? '#d9ab55' : '#4a4560',
                            borderRadius: '4px',
                            fontFamily: 'var(--font-vietnam)',
                            opacity: canConfirm ? 1 : 0.35,
                            cursor: canConfirm ? 'pointer' : 'not-allowed',
                          }}
                        >
                          Nhận báo cáo tổng quan miễn phí
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleConfirmReading}
                        disabled={!canConfirm}
                        className="w-full py-3.5 font-bold text-sm tracking-wider"
                        style={{
                          background: 'linear-gradient(135deg, #c8943f, #f0cc78, #c8943f)',
                          backgroundSize: '200% 200%',
                          color: '#06060f',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-vietnam)',
                          letterSpacing: '0.08em',
                          opacity: canConfirm ? 1 : 0.35,
                          boxShadow: canConfirm ? '0 4px 20px rgba(200,148,63,0.25)' : 'none',
                          transition: 'opacity 0.2s ease',
                          cursor: canConfirm ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Hoàn thành →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal nhập thông tin mới (old flow — user có profile) */}
      <ProfileFormModal
        open={modalOpen}
        title={
          selectedService?.needsTwo
            ? (modalTarget === 'A' ? 'Người thứ nhất' : 'Người thứ hai')
            : 'Nhập thông tin'
        }
        saving={modalSaving}
        showSaveCheckbox
        submitLabel={getModalSubmitLabel()}
        onSave={handleModalSave}
        onClose={() => { setModalOpen(false); setModalTarget('A') }}
      />

      {/* Guest flow — 1-profile modal (career/love/transit) */}
      <ProfileFormModal
        open={guestModalOpen}
        title="Thông tin của bạn"
        hideNote
        initialData={guestInitialDataA}
        showSaveCheckbox={!!user}
        defaultSaveChecked={!!user}
        showEmailField
        twoActionMode
        draftKey="guest_modal_single"
        onSave={handleGuestModalSubmit}
        onClose={() => { setGuestModalOpen(false); setGuestService(null); setGuestInitialDataA(null) }}
      />

      {/* Guest flow — 2-profile modal (synastry) */}
      <GuestSynastryModal
        open={guestSynastryOpen}
        onClose={() => { setGuestSynastryOpen(false); setGuestService(null); setGuestInitialDataA(null); setGuestInitialDataB(null) }}
        onSubmit={handleGuestSynastrySubmit}
        initialDataA={guestInitialDataA}
        initialDataB={guestInitialDataB}
        draftKey="guest_modal_synastry"
      />

      <DiscountModal
        open={discountModalOpen}
        service={discountService}
        email={discountEmail}
        onClose={() => setDiscountModalOpen(false)}
        onProceed={proceedToCheckout}
      />
    </div>
  )
}
