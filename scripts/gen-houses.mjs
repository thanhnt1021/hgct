// Sinh "Ý NGHĨA NHÀ TRỘI AI" cho 12 nhà — 2-3 câu, diễn giải từ cột Ý NGHĨA, văn người, KHÔNG gạch ngang.
import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env = readFileSync('.env.local','utf8')
const get = k => { const m = env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m')); return m?m[2]:'' }
const KEY = get('OPENROUTER_API_KEY')
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const TAB='LÕI TÍNH CÁCH'
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes:['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version:'v4', auth })
const SYSTEM = 'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'
const clean = s => String(s||'').replace(/\s*[—–]\s*/g,', ').replace(/\s+-\s+/g,', ').replace(/\s*,\s*,/g,', ').replace(/\s+/g,' ').trim()
async function ai(user){
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://hatgiongchiemtinh.com','X-Title':'AstroS'},body:JSON.stringify({model:'anthropic/claude-sonnet-4-6',messages:[{role:'system',content:SYSTEM},{role:'user',content:user}],temperature:0.7,max_tokens:4000})})
  const j = await res.json(); const c = j.choices?.[0]?.message?.content||''; const m=c.match(/\{[\s\S]*\}/); return JSON.parse(m?m[0]:c)
}
// doc cot T (NHA) + U (Y NGHIA), rows 2..13
const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range:`'${TAB}'!T2:U13` })
const data = r.data.values||[]
const list = data.map((row,i)=>({ row:i+2, nha:String(row[0]||'').trim(), y:String(row[1]||'').trim() })).filter(x=>x.nha)
console.log('so nha:', list.length)
const prompt = `Với mỗi NHÀ chiêm tinh dưới đây, dựa vào phần "ý nghĩa" (các lĩnh vực một người quan tâm khi nhà đó nổi trội trong lá số), hãy viết một đoạn 2-3 câu DIỄN GIẢI lại cho mượt mà, ấm áp, nghe tự nhiên như người thật nói, đúng tinh thần "đây là lĩnh vực bạn quan tâm/đầu tư năng lượng trong đời".
TUYỆT ĐỐI KHÔNG dùng dấu gạch ngang (—, –, -). Dùng từ nối hoặc viết câu liền mạch.
Trả về DUY NHẤT một JSON object: key = tên nhà chính xác (vd "NHÀ 1"), value = đoạn 2-3 câu. Không thêm gì ngoài JSON.

${list.map(x=>`${x.nha}: ${x.y}`).join('\n')}`
const map = await ai(prompt)
const norm = s => String(s||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,'')
const byNorm = {}; for(const k of Object.keys(map)) byNorm[norm(k)]=map[k]
const vals = list.map(x=>[clean(byNorm[norm(x.nha)]||'')])
const missing = list.filter(x=>!byNorm[norm(x.nha)])
if(missing.length) console.log('⚠ thieu:', missing.map(x=>x.nha).join(', '))
// ghi cot V (Ý NGHĨA NHÀ TRỘI AI), rows 2..13
await sheets.spreadsheets.values.update({ spreadsheetId: sid, range:`'${TAB}'!V2:V${1+vals.length}`, valueInputOption:'RAW', requestBody:{ values: vals } })
console.log('✓ ghi', vals.length, 'o vao cot V')
console.log('vi du [NHÀ 1]:', vals[0][0].slice(0,140))
console.log('vi du [NHÀ 10]:', (vals[9]?.[0]||'').slice(0,140))
