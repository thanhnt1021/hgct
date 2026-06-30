import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env=readFileSync('.env.local','utf8'); const get=k=>{const m=env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m'));return m?m[2]:''}
const creds=JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid=get('KB_SPREADSHEET_ID'); const TAB='love-TỔNG QUAN'
const auth=new google.auth.GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']})
const sheets=google.sheets({version:'v4',auth})
const norm=s=>String(s||'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,'')
function colL(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
const r=await sheets.spreadsheets.values.get({spreadsheetId:sid,range:`'${TAB}'!1:14`})
const rows=r.data.values||[]; const h=rows[0]||[]
h.forEach((x,i)=>{ if(x) console.log(`[${colL(i)}] ${i}: "${x}"`) })
const find=n=>h.findIndex(x=>norm(x)===norm(n))
const iM=find('MOON CUNG NÀO'), iA=find('AN TOÀN'), iAI=find('AI MOON AN TOÀN')
console.log('idx MOON CUNG NÀO=',iM,' AN TOÀN=',iA,' AI MOON AN TOÀN=',iAI)
if(iM>=0&&iA>=0) for(let k=1;k<rows.length&&k<=13;k++){ const moon=(rows[k]||[])[iM]||'',an=(rows[k]||[])[iA]||''; if(moon||an) console.log(`[${k+1}] MOON="${moon}" | AN(${an.length}): ${an.slice(0,150).replace(/\n/g,' | ')}`) }
