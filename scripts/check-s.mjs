import { readFileSync } from 'fs'
import { google } from 'googleapis'
const env=readFileSync('.env.local','utf8'); const get=k=>{const m=env.match(new RegExp('^'+k+'=("?)([\\s\\S]*?)\\1$','m'));return m?m[2]:''}
const creds=JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'),'base64').toString('utf8'))
const sid=get('KB_SPREADSHEET_ID'); const TAB='love-TỔNG QUAN'
const auth=new google.auth.GoogleAuth({credentials:creds,scopes:['https://www.googleapis.com/auth/spreadsheets']})
const sheets=google.sheets({version:'v4',auth})
const r=await sheets.spreadsheets.values.get({spreadsheetId:sid,range:`'${TAB}'!Q1:S13`})
const rows=r.data.values||[]
console.log('header S:', rows[0]?.[2])
for(let k=1;k<rows.length;k++){const row=rows[k]||[];const moon=row[0]||'';const s=(row[2]||'').length;console.log(`${moon.padEnd(12)} S=${s} ${s?'ok':'⚠ THIEU'}`)}
