import { readFileSync } from 'fs'
import { google } from 'googleapis'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => { const m = env.match(new RegExp('^' + k + '=("?)([\\s\\S]*?)\\1$', 'm')); return m ? m[2] : '' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })
const TAB = 'LÕI TÍNH CÁCH'

// 3 cột đích = X(MẶT TRỜI) Y(MẶT TRĂNG) Z(CUNG MỌC), rows 1..13
const cur = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${TAB}'!X1:Z13` })
console.log('current_X_Y_Z (header + 12 rows):')
console.log(JSON.stringify(cur.data.values, null, 0))

// test ghi trong lưới: ghi X13 (Song Ngư · Mặt trời) giá trị nháp, readback, rồi khôi phục giá trị cũ
const old = (cur.data.values?.[12]?.[0]) ?? ''
try {
  await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${TAB}'!X13`, valueInputOption: 'RAW', requestBody: { values: [['__wtest__']] } })
  const rb = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${TAB}'!X13` })
  console.log('WRITE_TEST: OK readback=', JSON.stringify(rb.data.values))
  await sheets.spreadsheets.values.update({ spreadsheetId: sid, range: `'${TAB}'!X13`, valueInputOption: 'RAW', requestBody: { values: [[old]] } })
  console.log('restored X13 to:', JSON.stringify(old))
} catch (e) {
  console.log('WRITE_TEST: FAILED ->', e.message)
}
