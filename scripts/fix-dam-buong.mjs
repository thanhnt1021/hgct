import { readFileSync } from 'fs'
import { google } from 'googleapis'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => { const m = env.match(new RegExp('^' + k + '=("?)([\\s\\S]*?)\\1$', 'm')); return m ? m[2] : '' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })
const TAB = 'VẬN HẠN'
const CELL = 'B13'

const OLD = 'Nếu bạn:bDám buông, Dám nghỉ, Dám nhìn lại chính mình'
const NEW = 'Nếu bạn: Dám buông, Dám nghĩ, Dám nhìn lại chính mình'

const cur = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${TAB}'!${CELL}` })
const val = cur.data.values?.[0]?.[0] ?? ''

const count = val.split(OLD).length - 1
if (count !== 1) {
  console.log('ABORT: expected exactly 1 occurrence of OLD substring, found', count)
  console.log('cell length:', val.length)
  process.exit(1)
}

const fixed = val.split(OLD).join(NEW)

await sheets.spreadsheets.values.update({
  spreadsheetId: sid,
  range: `'${TAB}'!${CELL}`,
  valueInputOption: 'RAW',
  requestBody: { values: [[fixed]] },
})
console.log('SHEET updated OK')

const rb = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${TAB}'!${CELL}` })
const rbVal = rb.data.values?.[0]?.[0] ?? ''
console.log('readback contains NEW:', rbVal.includes(NEW), '| still contains OLD:', rbVal.includes(OLD))
