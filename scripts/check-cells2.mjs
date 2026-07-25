import { readFileSync } from 'fs'
import { google } from 'googleapis'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => { const m = env.match(new RegExp('^' + k + '=("?)([\\s\\S]*?)\\1$', 'm')); return m ? m[2] : '' }
const creds = JSON.parse(Buffer.from(get('GOOGLE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'))
const sid = get('KB_SPREADSHEET_ID')
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
const sheets = google.sheets({ version: 'v4', auth })

const ranges = [
  "'love-TỔNG QUAN'!F2",
  "'love-CHI TIẾT H7'!K10",
  "'love-TỔNG QUAN'!B13",
  "'love-CẶP ĐÔI'!B13",
  "'love-CHI TIẾT H7'!K11",
]
const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: sid, ranges })
res.data.valueRanges.forEach((vr, i) => {
  console.log('===', ranges[i], '===')
  console.log(vr.values?.[0]?.[0] ?? '(empty)')
  console.log()
})
