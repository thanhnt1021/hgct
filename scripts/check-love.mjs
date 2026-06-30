import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env = readFileSync('.env.local','utf8')
const get = k => { const m = env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m')); return m?m[2]:'' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes:['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version:'v4', auth })
const norm = s => String(s||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,'')
function colL(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
// tim tab co gid 1929383161 -> ten
const meta = await sheets.spreadsheets.get({ spreadsheetId: sid })
const sh = meta.data.sheets.find(s=>s.properties.sheetId===1929383161)
const TAB = sh ? sh.properties.title : 'love-TỔNG QUAN'
console.log('TAB:', TAB)
const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range:`'${TAB}'!1:16` })
const rows = r.data.values||[]
const headers = rows[0]||[]
console.log('SO COT:', headers.length)
headers.forEach((h,i)=>{ if(h!==undefined&&h!=='') console.log(`  [${colL(i)}] ${i}: "${h}"` ) })
const find = name => headers.findIndex(h=>norm(h)===norm(name))
const iKim=find('SAO KIM'), iGu=find('GU ĐỐI TÁC'), iAg=find('AI GU'), iAt=find('AI THÍCH NGƯỜI'), iAv=find('AI BỊ HÚT BỞI VIBE'), iAk=find('AI KHÔNG THÍCH NGƯỜI')
console.log('idx: SAO KIM=',iKim,'GU ĐỐI TÁC=',iGu,'AI GU=',iAg,'AI THÍCH NGƯỜI=',iAt,'AI BỊ HÚT BỞI VIBE=',iAv,'AI KHÔNG THÍCH NGƯỜI=',iAk)
if(iKim>=0 && iGu>=0){
  console.log('--- SAO KIM + GU DOI TAC (15 dong) ---')
  for(let k=1;k<rows.length&&k<=16;k++){
    const kim=(rows[k]||[])[iKim]||'', gu=(rows[k]||[])[iGu]||''
    if(kim||gu) console.log(`[${k+1}] KIM="${kim}"\n   GU(${gu.length}): ${gu.slice(0,260).replace(/\n/g,' | ')}\n`)
  }
}
