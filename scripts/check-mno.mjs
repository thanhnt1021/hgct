import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env=readFileSync('.env.local','utf8'); const get=k=>{const m=env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m'));return m?m[2]:''}
const creds=JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid=get('KB_SPREADSHEET_ID'); const TAB='love-TỔNG QUAN'
const auth=new google.auth.GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']})
const sheets=google.sheets({version:'v4',auth})
const r=await sheets.spreadsheets.values.get({spreadsheetId:sid,range:`'${TAB}'!K1:O13`})
const rows=r.data.values||[]
console.log('HEADER M/N/O:', JSON.stringify([rows[0]?.[2],rows[0]?.[3],rows[0]?.[4]]))
for(let k=1;k<rows.length;k++){
  const row=rows[k]||[]; const kim=row[0]||''
  const M=(row[2]||'').length, N=(row[3]||'').length, O=(row[4]||'').length
  const miss=[]; if(!M)miss.push('M'); if(!N)miss.push('N'); if(!O)miss.push('O')
  console.log(`${kim.padEnd(12)} M=${M} N=${N} O=${O} ${miss.length?'⚠ THIEU '+miss.join(','):'ok'}`)
}
