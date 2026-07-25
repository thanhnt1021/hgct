import { readFileSync } from 'fs'
import { google } from 'googleapis'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => { const m = env.match(new RegExp('^' + k + '=("?)([\\s\\S]*?)\\1$', 'm')); return m ? m[2] : '' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })

for (const ref of ['code-NĂNGKHIẾU!H4', 'code-NĂNGKHIẾU!D5']) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: sid, range: `'${ref.split('!')[0]}'!${ref.split('!')[1]}` })
  console.log('===', ref, '===')
  console.log(JSON.stringify(res.data.values))
}
