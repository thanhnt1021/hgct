// Mask + validate ngày sinh (DD-MM-YYYY) và giờ sinh (HH:MM) dùng chung.
// dateError/timeError trả message cảnh báo NGAY khi vừa gõ đủ phần tương ứng.

export function maskDate(s: string): string {
  const d = s.replace(/\D/g, '').slice(0, 8)
  let r = d.slice(0, 2)
  if (d.length > 2) r += '-' + d.slice(2, 4)
  if (d.length > 4) r += '-' + d.slice(4, 8)
  return r
}

export function maskTime(s: string): string {
  const d = s.replace(/\D/g, '').slice(0, 4)
  let r = d.slice(0, 2)
  if (d.length > 2) r += ':' + d.slice(2, 4)
  return r
}

// Cảnh báo realtime: ngày 1-31, tháng 1-12, năm 1900..(năm hiện tại)
export function dateError(s: string): string {
  const d = s.replace(/\D/g, '')
  if (d.length >= 2) { const day = +d.slice(0, 2); if (day < 1 || day > 31) return 'Ngày phải từ 01 đến 31' }
  if (d.length >= 4) { const m = +d.slice(2, 4); if (m < 1 || m > 12) return 'Tháng phải từ 01 đến 12' }
  if (d.length === 8) { const y = +d.slice(4, 8); const cur = new Date().getFullYear(); if (y < 1900 || y > cur) return `Năm phải từ 1900 đến ${cur}` }
  return ''
}

// Cảnh báo realtime: giờ 0-23, phút 0-59
export function timeError(s: string): string {
  const d = s.replace(/\D/g, '')
  if (d.length >= 2) { const h = +d.slice(0, 2); if (h > 23) return 'Giờ phải từ 00 đến 23' }
  if (d.length === 4) { const mi = +d.slice(2, 4); if (mi > 59) return 'Phút phải từ 00 đến 59' }
  return ''
}
