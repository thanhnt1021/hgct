// Sinh 36 nội dung lõi (12 cung × Mặt trời/Mặt trăng/Cung mọc) bằng AI hệ thống (OpenRouter),
// rồi ghi vào sheet LÕI TÍNH CÁCH cột X(MẶT TRỜI) Y(MẶT TRĂNG) Z(CUNG MỌC), dóng theo W(CUNG LÕI).
import { readFileSync } from 'fs'
import { google } from 'googleapis'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => { const m = env.match(new RegExp('^' + k + '=("?)([\\s\\S]*?)\\1$', 'm')); return m ? m[2] : '' }
const OPENROUTER_API_KEY = get('OPENROUTER_API_KEY')
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const TAB = 'LÕI TÍNH CÁCH'

const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })
const norm = (s) => String(s || '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, '')

const SYSTEM = 'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'

async function ai(user) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://hatgiongchiemtinh.com', 'X-Title': 'AstroS' },
    body: JSON.stringify({ model: 'anthropic/claude-sonnet-4-6', messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: user }], temperature: 0.7, max_tokens: 4000 }),
  })
  const j = await res.json()
  const c = j.choices?.[0]?.message?.content || ''
  const m = c.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : c)
}

const LUMS = [
  { col: 'X', name: 'MẶT TRỜI', desc: 'bản chất cốt lõi, cái tôi, mục đích sống và ý chí' },
  { col: 'Y', name: 'MẶT TRĂNG', desc: 'thế giới cảm xúc, nội tâm, nhu cầu được an toàn và bản năng' },
  { col: 'Z', name: 'CUNG MỌC', desc: 'vẻ ngoài, cách thể hiện ra thế giới, ấn tượng đầu tiên và phong cách tiếp cận cuộc sống' },
]

// 1. Đọc 12 cung ở cột W (CUNG LÕI), rows 2..13
const w = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${TAB}'!W2:W13` })
const signs = (w.data.values || []).map(r => String(r[0] || '').trim()).filter(Boolean)
console.log('signs:', signs.join(' | '))

for (const lum of LUMS) {
  const prompt = `Viết phần "lõi tính cách" cho web chiêm tinh. Với ${lum.name} (${lum.desc}) ở từng cung hoàng đạo, viết 2-3 câu ngắn gọn, súc tích, ấm áp, đúng tinh thần luận giải lõi tính cách của một người.\nTUYỆT ĐỐI KHÔNG dùng dấu gạch ngang (—, –, -) để nối ý. Thay bằng từ nối (và, như, bởi, nên, vì, để...) hoặc viết thành câu liền mạch, mượt mà, tự nhiên.\nTrả về DUY NHẤT một JSON object: key = tên cung (chính xác như danh sách), value = đoạn 2-3 câu. Không thêm bất kỳ chữ nào ngoài JSON.\n12 cung: ${signs.join(', ')}`
  console.log(`\n>>> Sinh ${lum.name} ...`)
  const map = await ai(prompt)
  // build cột theo đúng thứ tự signs + post-process: bỏ mọi gạch ngang còn sót
  const clean = (s) => String(s || '').replace(/\s*[—–]\s*/g, ', ').replace(/\s+-\s+/g, ', ').replace(/\s*,\s*,/g, ', ').replace(/\s+/g, ' ').trim()
  const byNorm = {}; for (const k of Object.keys(map)) byNorm[norm(k)] = map[k]
  const colVals = signs.map(s => [clean(byNorm[norm(s)] || '')])
  const missing = signs.filter(s => !byNorm[norm(s)])
  if (missing.length) console.log('  ⚠ thiếu:', missing.join(', '))
  await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${TAB}'!${lum.col}2:${lum.col}${1 + colVals.length}`, valueInputOption: 'RAW', requestBody: { values: colVals } })
  console.log(`  ✓ ghi ${colVals.length} ô vào cột ${lum.col} (${lum.name})`)
  console.log(`  ví dụ [${signs[0]}]: ${colVals[0][0].slice(0, 90)}...`)
}
console.log('\nDONE — đã ghi 36 lõi vào sheet.')
