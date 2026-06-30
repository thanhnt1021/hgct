// AI MOON AN TOÀN (cột S) — plain text (không JSON, tránh vỡ vì dấu " lồng). 12 cung Mặt Trăng.
import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env=readFileSync('.env.local','utf8'); const get=k=>{const m=env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m'));return m?m[2]:''}
const KEY=get('OPENROUTER_API_KEY')
const creds=JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid=get('KB_SPREADSHEET_ID'); const TAB='love-TỔNG QUAN'
const auth=new google.auth.GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']})
const sheets=google.sheets({version:'v4',auth})
const SYSTEM='Bạn là một chiêm tinh gia chuyên nghiệp, có kiến thức sâu rộng về chiêm tinh học phương Tây. Bạn viết bằng tiếng Việt, văn phong ấm áp, dễ hiểu, truyền cảm hứng.'
const clean=s=>String(s||'').replace(/^```[a-z]*\s*/i,'').replace(/```$/,'').replace(/\s*[—–]\s*/g,', ').replace(/\s+-\s+/g,', ').replace(/\s*,\s*,/g,', ').replace(/\s+/g,' ').trim()
async function ai(u){const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','HTTP-Referer':'https://hatgiongchiemtinh.com','X-Title':'AstroS'},body:JSON.stringify({model:'anthropic/claude-sonnet-4-6',messages:[{role:'system',content:SYSTEM},{role:'user',content:u}],temperature:0.7,max_tokens:1400})});const j=await res.json();return j.choices?.[0]?.message?.content||''}
const r=await sheets.spreadsheets.values.get({spreadsheetId:sid,range:`'${TAB}'!Q2:R13`})
const list=(r.data.values||[]).map((row,i)=>({row:i+2,moon:String(row[0]||'').trim(),an:String(row[1]||'').trim()})).filter(x=>x.moon&&x.an)
console.log('so cung:',list.length)
const data=[]
for(const x of list){
  try{
    const prompt=`Đây là mô tả CẢM GIÁC AN TOÀN trong tình yêu khi Mặt Trăng ở cung ${x.moon} (an toàn khi nào, cần cảm giác gì, không an toàn khi nào, dấu hiệu ngoài đời):\n"""${x.an}"""\nDựa vào đó, viết MỘT đoạn văn KHOẢNG 4 câu, ấm áp, sâu sắc, tự nhiên như người thật nói, xưng "bạn". Diễn giải để người đọc HIỂU MÌNH (mình cần gì để thấy an toàn trong tình yêu) VÀ HIỂU NGƯỜI ẤY (đối phương nên thế nào, dấu hiệu cho thấy mình đang ổn hay đang ngộp). Viết liền mạch.\nTUYỆT ĐỐI KHÔNG dùng dấu gạch ngang (—, –, -). CHỈ trả về đúng đoạn văn, KHÔNG thêm tiêu đề, KHÔNG ngoặc kép bao ngoài, KHÔNG JSON.`
    const t=clean(await ai(prompt))
    if(!t){ console.log('⚠ rỗng:',x.moon); continue }
    data.push({range:`'${TAB}'!S${x.row}`,values:[[t]]}); console.log('✓',x.moon)
  }catch(e){ console.log('✗ loi',x.moon,e.message) }
}
if(data.length){ await sheets.spreadsheets.values.batchUpdate({spreadsheetId:sid,requestBody:{valueInputOption:'RAW',data}}); console.log('DONE ghi',data.length,'/',list.length,'o cot S') }
