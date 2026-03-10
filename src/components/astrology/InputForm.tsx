'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (data: Record<string, unknown>) => void
  loading?: boolean
  initialData?: Record<string, unknown>
  submitLabel?: string
}

const PROVINCES = [
  { name: 'Hà Nội', lat: 21.0285, lon: 105.8542 },
  { name: 'Hồ Chí Minh', lat: 10.8231, lon: 106.6297 },
  { name: 'Đà Nẵng', lat: 16.0544, lon: 108.2022 },
  { name: 'Hải Phòng', lat: 20.8449, lon: 106.6881 },
  { name: 'Cần Thơ', lat: 10.0452, lon: 105.7469 },
  { name: 'An Giang', lat: 10.5216, lon: 105.1259 },
  { name: 'Bà Rịa - Vũng Tàu', lat: 10.4114, lon: 107.1362 },
  { name: 'Bắc Giang', lat: 21.2731, lon: 106.1943 },
  { name: 'Bắc Kạn', lat: 22.1443, lon: 105.8345 },
  { name: 'Bạc Liêu', lat: 9.2941, lon: 105.7216 },
  { name: 'Bắc Ninh', lat: 21.1861, lon: 106.0763 },
  { name: 'Bến Tre', lat: 10.2415, lon: 106.3759 },
  { name: 'Bình Định', lat: 13.7820, lon: 109.2197 },
  { name: 'Bình Dương', lat: 11.3254, lon: 106.4770 },
  { name: 'Bình Phước', lat: 11.7512, lon: 106.7234 },
  { name: 'Bình Thuận', lat: 11.0904, lon: 108.0721 },
  { name: 'Cà Mau', lat: 9.1527, lon: 105.1961 },
  { name: 'Cao Bằng', lat: 22.6666, lon: 106.2577 },
  { name: 'Đắk Lắk', lat: 12.7100, lon: 108.2378 },
  { name: 'Đắk Nông', lat: 12.2646, lon: 107.6098 },
  { name: 'Điện Biên', lat: 21.3860, lon: 103.0230 },
  { name: 'Đồng Nai', lat: 11.0686, lon: 107.1676 },
  { name: 'Đồng Tháp', lat: 10.4938, lon: 105.6882 },
  { name: 'Gia Lai', lat: 13.9833, lon: 108.0000 },
  { name: 'Hà Giang', lat: 22.8233, lon: 104.9836 },
  { name: 'Hà Nam', lat: 20.5835, lon: 105.9230 },
  { name: 'Hà Tĩnh', lat: 18.3560, lon: 105.8877 },
  { name: 'Hải Dương', lat: 20.9373, lon: 106.3206 },
  { name: 'Hậu Giang', lat: 9.7579, lon: 105.6413 },
  { name: 'Hòa Bình', lat: 20.8135, lon: 105.3383 },
  { name: 'Hưng Yên', lat: 20.6464, lon: 106.0512 },
  { name: 'Khánh Hòa', lat: 12.2585, lon: 109.0526 },
  { name: 'Kiên Giang', lat: 10.0125, lon: 105.0809 },
  { name: 'Kon Tum', lat: 14.3498, lon: 108.0004 },
  { name: 'Lai Châu', lat: 22.3863, lon: 103.4703 },
  { name: 'Lâm Đồng', lat: 11.5753, lon: 108.1429 },
  { name: 'Lạng Sơn', lat: 21.8536, lon: 106.7614 },
  { name: 'Lào Cai', lat: 22.4856, lon: 103.9707 },
  { name: 'Long An', lat: 10.5360, lon: 106.4131 },
  { name: 'Nam Định', lat: 20.4388, lon: 106.1621 },
  { name: 'Nghệ An', lat: 18.6737, lon: 105.6813 },
  { name: 'Ninh Bình', lat: 20.2506, lon: 105.9745 },
  { name: 'Ninh Thuận', lat: 11.5752, lon: 108.9890 },
  { name: 'Phú Thọ', lat: 21.4220, lon: 105.2298 },
  { name: 'Phú Yên', lat: 13.0882, lon: 109.0929 },
  { name: 'Quảng Bình', lat: 17.4690, lon: 106.6225 },
  { name: 'Quảng Nam', lat: 15.5394, lon: 108.0191 },
  { name: 'Quảng Ngãi', lat: 15.1214, lon: 108.8044 },
  { name: 'Quảng Ninh', lat: 21.0064, lon: 107.2925 },
  { name: 'Quảng Trị', lat: 16.7505, lon: 107.1855 },
  { name: 'Sóc Trăng', lat: 9.6020, lon: 105.9800 },
  { name: 'Sơn La', lat: 21.3269, lon: 103.9188 },
  { name: 'Tây Ninh', lat: 11.3354, lon: 106.1099 },
  { name: 'Thái Bình', lat: 20.4464, lon: 106.3422 },
  { name: 'Thái Nguyên', lat: 21.5928, lon: 105.8442 },
  { name: 'Thanh Hóa', lat: 19.8067, lon: 105.7852 },
  { name: 'Thừa Thiên Huế', lat: 16.4674, lon: 107.5905 },
  { name: 'Tiền Giang', lat: 10.4494, lon: 106.3421 },
  { name: 'Trà Vinh', lat: 9.8127, lon: 106.2994 },
  { name: 'Tuyên Quang', lat: 21.8233, lon: 105.2139 },
  { name: 'Vĩnh Long', lat: 10.2396, lon: 105.9572 },
  { name: 'Vĩnh Phúc', lat: 21.3609, lon: 105.5474 },
  { name: 'Yên Bái', lat: 21.7168, lon: 104.8986 },
]

export default function InputForm({ onSubmit, loading, initialData, submitLabel }: Props) {
  const [name, setName] = useState((initialData?.name as string) || '')
  const [email, setEmail] = useState((initialData?.email as string) || '')
  const [gender, setGender] = useState((initialData?.gender as string) || 'Female')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [tobHour, setTobHour] = useState('')
  const [tobMinute, setTobMinute] = useState('')
  const [province, setProvince] = useState('')
  const [lat, setLat] = useState(21.0285)
  const [lon, setLon] = useState(105.8542)

  const handleProvinceChange = (value: string) => {
    setProvince(value)
    const found = PROVINCES.find(p => p.name === value)
    if (found) {
      setLat(found.lat)
      setLon(found.lon)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      email,
      gender,
      dob: { day: parseInt(dobDay), month: parseInt(dobMonth), year: parseInt(dobYear) },
      tob: { hour: parseInt(tobHour), minute: parseInt(tobMinute) },
      loc: { lat, lon, tz: 'Asia/Ho_Chi_Minh', address: province },
    })
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Họ và tên</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full" placeholder="Nguyễn Văn A" required />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Email nhận báo cáo</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full" placeholder="email@example.com" required />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Giới tính</label>
        <select value={gender} onChange={e => setGender(e.target.value)} className="w-full">
          <option value="Female">Nữ</option>
          <option value="Male">Nam</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Ngày sinh</label>
          <input type="number" min="1" max="31" value={dobDay} onChange={e => setDobDay(e.target.value)} className="w-full" placeholder="DD" required />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Tháng</label>
          <input type="number" min="1" max="12" value={dobMonth} onChange={e => setDobMonth(e.target.value)} className="w-full" placeholder="MM" required />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Năm</label>
          <input type="number" min="1900" max="2025" value={dobYear} onChange={e => setDobYear(e.target.value)} className="w-full" placeholder="YYYY" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Giờ sinh</label>
          <input type="number" min="0" max="23" value={tobHour} onChange={e => setTobHour(e.target.value)} className="w-full" placeholder="HH" required />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Phút</label>
          <input type="number" min="0" max="59" value={tobMinute} onChange={e => setTobMinute(e.target.value)} className="w-full" placeholder="MM" required />
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Nơi sinh (Tỉnh/Thành)</label>
        <select value={province} onChange={e => handleProvinceChange(e.target.value)} className="w-full" required>
          <option value="">-- Chọn tỉnh/thành --</option>
          {PROVINCES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold text-lg hover:from-amber-600 hover:to-amber-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/25"
      >
        {loading ? 'Đang xử lý...' : (submitLabel || 'Tiếp tục chọn dịch vụ →')}
      </button>
    </form>
  )
}
