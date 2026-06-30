// Ghi DỨT KHOÁT 3 cột liền kề M/N/O (header + data) cho love-TỔNG QUAN, từ nguồn GU ĐỐI TÁC (L).
// Hết phụ thuộc vị trí cột bị chỉnh tay; code đọc theo tên header.
import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env = readFileSync('.env.local','utf8')
const get = k => { const m = env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m')); return m?m[2]:'' }
const KEY = get('OPENROUTER_API_KEY')
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID'); const TAB='love-TỔNG QUAN'
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes:['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version:'v4', auth })
const SYSTEM='Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'
const clean=s=>String(s||'').replace(/\s*[—–]\s*/g,', ').replace(/\s+-\s+/g,', ').replace(/\s*,\s*,/g,', ').replace(/\s+/g,' ').trim()
async function ai(u){const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://hatgiongchiemtinh.com','X-Title':'AstroS'},body:JSON.stringify({model:'anthropic/claude-sonnet-4-6',messages:[{role:'system',content:SYSTEM},{role:'user',content:u}],temperature:0.7,max_tokens:2000})});const j=await res.json();const c=j.choices?.[0]?.message?.content||'';const m=c.match(/\{[\s\S]*\}/);return JSON.parse(m?m[0]:c)}
// doc SAO KIM (K) + GU ĐỐI TÁC (L) — vi tri nay on dinh
const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range:`'${TAB}'!K2:L13` })
const list=(r.data.values||[]).map((row,i)=>({row:i+2,kim:String(row[0]||'').trim(),gu:String(row[1]||'').trim()})).filter(x=>x.kim&&x.gu)
console.log('so cung:',list.length)
const M=[],N=[],O=[]
for(const x of list){
  const prompt=`Mô tả GU ĐỐI TÁC khi Sao Kim ở cung ${x.kim} (kiểu người được thu hút trong tình yêu):\n"""${x.gu}"""\nViết 3 đoạn cho web chiêm tinh, mỗi đoạn ~3 câu, ấm áp, tự nhiên, xưng "bạn":\n- "guthich": GỘP gu tình yêu + kiểu người bạn THÍCH (1 đoạn liền mạch).\n- "vibe": VIBE/năng lượng khiến bạn bị cuốn hút.\n- "khongthich": kiểu người bạn KHÔNG hợp.\nKHÔNG dùng gạch ngang (—,–,-). Trả về DUY NHẤT JSON {"guthich":"...","vibe":"...","khongthich":"..."}.`
  const m=await ai(prompt); M.push([clean(m.guthich)]);N.push([clean(m.vibe)]);O.push([clean(m.khongthich)]); console.log('✓',x.kim)
}
const end=1+list.length
await sheets.spreadsheets.values.batchUpdate({spreadsheetId:sid,requestBody:{valueInputOption:'RAW',data:[
  {range:`'${TAB}'!M1`,values:[['AI GU-THÍCH NGƯỜI']]},
  {range:`'${TAB}'!N1`,values:[['AI BỊ HÚT BỞI VIBE']]},
  {range:`'${TAB}'!O1`,values:[['AI KHÔNG THÍCH NGƯỜI']]},
  {range:`'${TAB}'!M2:M${end}`,values:M},
  {range:`'${TAB}'!N2:N${end}`,values:N},
  {range:`'${TAB}'!O2:O${end}`,values:O},
]}})
// don sach cot P (neu con header/data thua tu lan truoc)
await sheets.spreadsheets.values.clear({spreadsheetId:sid,range:`'${TAB}'!P1:P${end}`})
console.log('DONE 3 cot M/N/O. headers: AI GU-THÍCH NGƯỜI | AI BỊ HÚT BỞI VIBE | AI KHÔNG THÍCH NGƯỜI')
