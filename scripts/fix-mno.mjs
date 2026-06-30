// Viet lai cot M (guthich) cho cac cung dang thieu.
import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env=readFileSync('.env.local','utf8'); const get=k=>{const m=env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m'));return m?m[2]:''}
const KEY=get('OPENROUTER_API_KEY')
const creds=JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid=get('KB_SPREADSHEET_ID'); const TAB='love-TỔNG QUAN'
const auth=new google.auth.GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']})
const sheets=google.sheets({version:'v4',auth})
const SYSTEM='Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'
const clean=s=>String(s||'').replace(/\s*[—–]\s*/g,', ').replace(/\s+-\s+/g,', ').replace(/\s*,\s*,/g,', ').replace(/\s+/g,' ').trim()
async function ai(u){const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://hatgiongchiemtinh.com','X-Title':'AstroS'},body:JSON.stringify({model:'anthropic/claude-sonnet-4-6',messages:[{role:'system',content:SYSTEM},{role:'user',content:u}],temperature:0.7,max_tokens:1200})});const j=await res.json();const c=j.choices?.[0]?.message?.content||'';const m=c.match(/\{[\s\S]*\}/);return JSON.parse(m?m[0]:c)}
const r=await sheets.spreadsheets.values.get({spreadsheetId:sid,range:`'${TAB}'!K2:M13`})
const rows=r.data.values||[]
const updates=[]
for(let i=0;i<rows.length;i++){
  const kim=String(rows[i]?.[0]||'').trim(), gu=String(rows[i]?.[1]||'').trim(), m=String(rows[i]?.[2]||'').trim()
  if(kim && gu && !m){
    const row=i+2
    const prompt=`Mô tả GU ĐỐI TÁC khi Sao Kim ở cung ${kim} (kiểu người được thu hút trong tình yêu):\n"""${gu}"""\nViết 1 đoạn ~3 câu, ấm áp, tự nhiên, xưng "bạn": GỘP gu tình yêu + kiểu người bạn THÍCH. KHÔNG dùng gạch ngang (—,–,-). Trả về DUY NHẤT JSON {"guthich":"..."}.`
    const o=await ai(prompt)
    updates.push({range:`'${TAB}'!M${row}`,values:[[clean(o.guthich)]]})
    console.log('✓ viet lai M cho',kim,'->',clean(o.guthich).slice(0,70))
  }
}
if(updates.length){ await sheets.spreadsheets.values.batchUpdate({spreadsheetId:sid,requestBody:{valueInputOption:'RAW',data:updates}}); console.log('DONE ghi',updates.length,'o') }
else console.log('khong thieu o nao')
