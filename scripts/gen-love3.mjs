// 3 cột: AI GU-THÍCH NGƯỜI (gộp gu+thích) | AI BỊ HÚT BỞI VIBE | AI KHÔNG THÍCH NGƯỜI. Sao Kim 12 cung.
import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env = readFileSync('.env.local','utf8')
const get = k => { const m = env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m')); return m?m[2]:'' }
const KEY = get('OPENROUTER_API_KEY')
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const TAB='love-TỔNG QUAN'
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes:['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version:'v4', auth })
const SYSTEM = 'Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'
const clean = s => String(s||'').replace(/\s*[—–]\s*/g,', ').replace(/\s+-\s+/g,', ').replace(/\s*,\s*,/g,', ').replace(/\s+/g,' ').trim()
async function ai(user){
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://hatgiongchiemtinh.com','X-Title':'AstroS'},body:JSON.stringify({model:'anthropic/claude-sonnet-4-6',messages:[{role:'system',content:SYSTEM},{role:'user',content:user}],temperature:0.7,max_tokens:2000})})
  const j = await res.json(); const c = j.choices?.[0]?.message?.content||''; const m=c.match(/\{[\s\S]*\}/); return JSON.parse(m?m[0]:c)
}
const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range:`'${TAB}'!K2:L13` })
const list = (r.data.values||[]).map((row,i)=>({ row:i+2, kim:String(row[0]||'').trim(), gu:String(row[1]||'').trim() })).filter(x=>x.kim&&x.gu)
console.log('so cung:', list.length)
const M=[],O=[],P=[]
for(const x of list){
  const prompt = `Đây là mô tả GU ĐỐI TÁC khi Sao Kim ở cung ${x.kim} (kiểu người mà người này bị thu hút trong tình yêu):
"""${x.gu}"""
Dựa vào keyword trên, viết 3 đoạn văn cho web chiêm tinh, mỗi đoạn KHOẢNG 3 câu, ấm áp, sâu sắc, tự nhiên như người thật nói, xưng "bạn":
- "guthich": GỘP CHUNG phân tích GU của bạn trong tình yêu VÀ kiểu người bạn THÍCH, những phẩm chất khiến bạn rung động (viết liền mạch thành 1 đoạn).
- "vibe": loại VIBE / năng lượng khiến bạn bị cuốn hút.
- "khongthich": kiểu người bạn KHÔNG hợp, dễ khiến bạn mất hứng.
TUYỆT ĐỐI KHÔNG dùng dấu gạch ngang (—, –, -); dùng từ nối hoặc viết liền mạch.
Trả về DUY NHẤT JSON: {"guthich":"...","vibe":"...","khongthich":"..."}. Không thêm gì ngoài JSON.`
  const m = await ai(prompt)
  M.push([clean(m.guthich)]); O.push([clean(m.vibe)]); P.push([clean(m.khongthich)])
  console.log('✓', x.kim)
}
const end = 1+list.length
await sheets.spreadsheets.values.batchUpdate({ spreadsheetId: sid, requestBody: { valueInputOption:'RAW', data:[
  { range:`'${TAB}'!M1`, values:[['AI GU-THÍCH NGƯỜI']] },
  { range:`'${TAB}'!M2:M${end}`, values: M },
  { range:`'${TAB}'!O2:O${end}`, values: O },
  { range:`'${TAB}'!P2:P${end}`, values: P },
]}})
// clear cot N (AI THÍCH NGƯỜI cu) -> con 3 cot
await sheets.spreadsheets.values.clear({ spreadsheetId: sid, range:`'${TAB}'!N1:N${end}` })
console.log('DONE 3 cot. vi du BACH DUONG guthich:', M[0][0].slice(0,150))
