import { readFileSync } from 'fs'; import { google } from 'googleapis'
const env=readFileSync('.env.local','utf8'); const get=k=>{const m=env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m'));return m?m[2]:''}
const creds=JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid=get('KB_SPREADSHEET_ID')
const auth=new google.auth.GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']})
const sheets=google.sheets({version:'v4',auth})
function colL(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
const r=await sheets.spreadsheets.values.get({spreadsheetId:sid,range:`'VẬN HẠN'!1:14`})
const rows=r.data.values||[]; const h=rows[0]||[]
console.log('SO COT:',h.length)
h.forEach((x,i)=>{ if(x) console.log(`[${colL(i)}] ${i}: "${x}"`) })
console.log('--- 13 dong dau cot 0-3 ---')
for(let k=0;k<rows.length&&k<14;k++){ console.log(k, JSON.stringify((rows[k]||[]).slice(0,4))) }
