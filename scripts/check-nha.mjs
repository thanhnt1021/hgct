import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env = readFileSync('.env.local','utf8')
const get = k => { const m = env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m')); return m?m[2]:'' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes:['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version:'v4', auth })
const TAB='LÕI TÍNH CÁCH'
const norm = s => String(s||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,'')
function colL(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
const r = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range:`'${TAB}'!1:20` })
const rows = r.data.values||[]
const headers = rows[0]||[]
console.log('TONG SO COT:', headers.length)
headers.forEach((h,i)=>{ if(h!==undefined&&h!=='') console.log(`  [${colL(i)}] ${i}: "${h}"`) })
const iNha = headers.findIndex(h=>norm(h)==='nhà'.normalize('NFC').toLowerCase())
const find = name => headers.findIndex(h=>norm(h)===norm(name))
const iN = find('Nhà'), iY = find('Ý nghĩa'), iAI = find('Ý NGHĨA NHÀ TRỘI AI')
console.log('idx Nhà=',iN,' | Ý nghĩa=',iY,' | Ý NGHĨA NHÀ TRỘI AI=',iAI)
if(iN>=0){
  console.log('--- cot NHA + Y NGHIA (12 dong) ---')
  for(let k=1;k<rows.length&&k<=13;k++){
    const nha=(rows[k]||[])[iN]||'', yn=(rows[k]||[])[iY]||''
    if(nha) console.log(`  [${colL(iN)}${k+1}] Nhà="${nha}"  | Ý nghĩa(${yn.length} ký tự): ${yn.slice(0,80).replace(/\n/g,' ')}...`)
  }
}
